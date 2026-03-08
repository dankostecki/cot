"""
Pobiera raporty COT z ICE Futures Europe i zapisuje jako JSON.
Uruchamiane przez GitHub Actions co tydzień.

Format CSV ICE jest identyczny z CFTC Disaggregated —
pola są mapowane 1:1 do tych samych kluczy, których używa app.js.
"""

import requests
import csv
import json
import os
from datetime import datetime
from io import StringIO

# ── Instrumenty do wyodrębnienia ─────────────────────────────────────────────
# Klucz = slug używany jako nazwa katalogu w data/ice/{slug}/
# fut_name / com_name muszą dokładnie odpowiadać wartości w kolumnie
# Market_and_Exchange_Names pliku CSV ICE.
ICE_INSTRUMENTS = {
    "brent": {
        "fut_name": "ICE Brent Crude Futures - ICE Futures Europe",
        "com_name": "ICE Brent Crude Futures and Options - ICE Futures Europe",
    },
    "gasoil": {
        "fut_name": "ICE Gasoil Futures - ICE Futures Europe",
        "com_name": "ICE Gasoil Futures and Options - ICE Futures Europe",
    },
    "dubai": {
        "fut_name": "ICE Dubai 1st Line Futures",
        "com_name": None,  # brak wariantu z opcjami
    },
    "sugar": {
        "fut_name": "ICE White Sugar Futures - ICE Futures Europe",
        "com_name": "ICE White Sugar Futures and Options- ICE Futures Europe",
    },
    "cocoa": {
        "fut_name": "ICE Cocoa Futures - ICE Futures Europe",
        "com_name": "ICE Cocoa Futures and Options - ICE Futures Europe",
    },
    "coffee": {
        "fut_name": "ICE Robusta Coffee Futures - ICE Futures Europe",
        "com_name": "ICE Robusta Coffee Futures and Options - ICE Futures Europe",
    },
    "wheat": {
        "fut_name": "ICE Wheat Futures - ICE Futures Europe",
        "com_name": "ICE Wheat Futures and Options - ICE Futures Europe",
    },
}

# ── Mapowanie kolumn CSV ICE → klucze CFTC używane przez app.js ──────────────
# Wartości są identyczne z kluczami w SERIES.disaggregated.fields
COLUMN_MAP = {
    "Open_Interest_All":              "open_interest_all",
    "Prod_Merc_Positions_Long_All":   "prod_merc_positions_long",
    "Prod_Merc_Positions_Short_All":  "prod_merc_positions_short",
    "Swap_Positions_Long_All":        "swap_positions_long_all",
    "Swap_Positions_Short_All":       "swap__positions_short_all",  # podwójne __ jak w CFTC
    "M_Money_Positions_Long_All":     "m_money_positions_long_all",
    "M_Money_Positions_Short_All":    "m_money_positions_short_all",
    "Other_Rept_Positions_Long_All":  "other_rept_positions_long",
    "Other_Rept_Positions_Short_All": "other_rept_positions_short",
    "NonRept_Positions_Long_All":     "nonrept_positions_long_all",
    "NonRept_Positions_Short_All":    "nonrept_positions_short_all",
}

# ── Konwersja daty ICE: YYMMDD → YYYY-MM-DD ──────────────────────────────────
def convert_date(yymmdd: str) -> str:
    s = str(yymmdd).strip().zfill(6)
    yy, mm, dd = int(s[:2]), int(s[2:4]), int(s[4:6])
    year = 2000 + yy
    return f"{year:04d}-{mm:02d}-{dd:02d}"


def clean_int(val: str) -> int:
    v = val.replace(",", "").strip()
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return 0


# ── Pobieranie pliku CSV dla danego roku ─────────────────────────────────────
def fetch_year(year: int) -> list[dict]:
    url = f"https://www.ice.com/publicdocs/futures/COTHist{year}.csv"
    print(f"  Pobieranie {year}...", end=" ", flush=True)
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    rows = list(csv.DictReader(StringIO(r.text)))
    print(f"{len(rows)} wierszy")
    return rows


# ── Filtrowanie i mapowanie wierszy dla konkretnej nazwy rynku ───────────────
def parse_rows(all_rows: list[dict], market_name: str | None) -> list[dict]:
    if not market_name:
        return []
    result = []
    for row in all_rows:
        name = row.get("Market_and_Exchange_Names", "").strip()
        if name != market_name:
            continue
        date_raw = row.get("As_of_Date_In_Form_YYMMDD", "")
        try:
            date_str = convert_date(date_raw)
        except Exception:
            continue
        entry = {"report_date_as_yyyy_mm_dd": date_str}
        for csv_col, json_key in COLUMN_MAP.items():
            entry[json_key] = clean_int(row.get(csv_col, "0"))
        result.append(entry)
    return result


# ── Główna logika ─────────────────────────────────────────────────────────────
def main():
    current_year = datetime.now().year
    # ICE publikuje pliki od 2011; zakres można zmienić poniżej
    years = range(2011, current_year + 1)

    print("=== Pobieranie danych ICE COT ===")
    all_rows: list[dict] = []
    for year in years:
        try:
            all_rows.extend(fetch_year(year))
        except requests.HTTPError as e:
            print(f"  Pominięto {year}: {e}")
        except Exception as e:
            print(f"  Błąd {year}: {e}")

    print(f"\nRazem wierszy: {len(all_rows)}")
    print("\n=== Zapis plików JSON ===")

    for slug, names in ICE_INSTRUMENTS.items():
        out_dir = os.path.join("data", "ice", slug)
        os.makedirs(out_dir, exist_ok=True)

        fut_rows = sorted(
            parse_rows(all_rows, names["fut_name"]),
            key=lambda r: r["report_date_as_yyyy_mm_dd"],
        )
        com_rows = sorted(
            parse_rows(all_rows, names.get("com_name")),
            key=lambda r: r["report_date_as_yyyy_mm_dd"],
        )

        fut_path = os.path.join(out_dir, "fut.json")
        com_path = os.path.join(out_dir, "com.json")

        with open(fut_path, "w", encoding="utf-8") as f:
            json.dump(fut_rows, f, separators=(",", ":"))
        with open(com_path, "w", encoding="utf-8") as f:
            json.dump(com_rows, f, separators=(",", ":"))

        print(f"  {slug}: {len(fut_rows)} fut, {len(com_rows)} com -> {out_dir}/")


if __name__ == "__main__":
    main()
