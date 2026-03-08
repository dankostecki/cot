(function () {
    'use strict';
    const API = 'https://publicreporting.cftc.gov/resource';
    const EP_FUT = { legacy: '6dca-aqww', disaggregated: '72hh-3qpy', tff: 'gpe5-46if' };
    const EP_COM = { legacy: 'jun7-fc8e', disaggregated: 'kh3c-gbw2', tff: 'yw9f-hn96' };
    const EP = EP_FUT; // Keep for backward compat
    const EP_MAP = EP; // Alias for compatibility in some handlers

    // ── Yahoo Finance Mappings ──
    const YF_MAP = {
        '099741': '6E=F',    // EURO FX
        '096742': '6B=F',    // BRITISH POUND
        '097741': '6J=F',    // JAPANESE YEN
        '092741': '6S=F',    // SWISS FRANC
        '090741': '6C=F',    // CANADIAN DOLLAR
        '232741': '6A=F',    // AUSTRALIAN DOLLAR
        '133741': 'BTC=F',   // BITCOIN CME
        '133742': 'BTC=F',   // MICRO BITCOIN CME
        '146021': 'ETH=F',   // ETHER CASH SETTLED - CME
        '146022': 'ETH=F',   // MICRO ETHER - CME
        '138741': 'ES=F',    // E-MINI S&P 500
        '13874A': 'MES=F',   // MICRO E-MINI S&P 500
        '209742': 'NQ=F',    // NASDAQ-100
        '20974P': 'MNQ=F',   // MICRO NASDAQ-100
        '1170E1': '^VIX',    // VIX FUTURES (CBOE VOLATILITY INDEX) — kod CFTC potwierdzony
        '1170EM': 'MYM=F',   // MICRO E-MINI DOW
        '12460P': 'YM=F',    // E-MINI DOW JONES ($5 DJIA)
        '13460+': 'RTY=F',   // E-MINI RUSSELL 2000
        '067651': 'CL=F',    // CRUDE OIL WTI
        '06765T': 'MCL=F',   // MICRO WTI CRUDE OIL
        '023651': 'HO=F',    // HEATING OIL (NY HARBOR ULSD)
        '111659': 'RB=F',    // RBOB GASOLINE
        '023391': 'NG=F',    // NATURAL GAS
        '088691': 'GC=F',    // GOLD
        '088693': 'MGC=F',   // MICRO GOLD
        '084691': 'SI=F',    // SILVER
        '085692': 'HG=F',    // COPPER
        '075651': 'PA=F',    // PALLADIUM
        '076651': 'PL=F',    // PLATINUM
        '001602': 'ZW=F',    // WHEAT (CBOT)
        '002602': 'ZC=F',    // CORN
        '005602': 'ZS=F',    // SOYBEANS
        '007601': 'ZO=F',    // OATS
        '073732': 'KC=F',    // COFFEE
        '080732': 'SB=F',    // SUGAR #11
        '056642': 'CT=F',    // COTTON #2
        '043602': 'ZN=F',    // 10-YR T-NOTE
        '020601': 'ZB=F',    // 30-YR T-BOND
        '044601': 'ZF=F',    // 5-YR T-NOTE
        '042601': 'ZT=F',    // 2-YR T-NOTE
        '098662': 'DX=F',    // USD INDEX
        '052644': 'CC=F',    // COCOA
        '058643': 'OJ=F',    // ORANGE JUICE
        '058644': 'LBS=F',   // RANDOM LENGTH LUMBER
        '061641': 'LE=F',    // LIVE CATTLE
        '057642': 'GF=F',    // FEEDER CATTLE
        '054642': 'HE=F',    // LEAN HOGS
    };

    // ── ICE Futures Europe instruments (dane ze statycznych JSON w repo) ──
    const ICE_INSTRUMENTS_DEF = [
        { code: 'ice_brent',  name: 'ICE Brent Crude Futures',    exchange: 'ICE Futures Europe', units: '1,000 barrels',     cat: 'energy', dataPath: 'brent',  yfTicker: 'BZ=F' },
        { code: 'ice_gasoil', name: 'ICE Gasoil Futures',          exchange: 'ICE Futures Europe', units: '100 metric tonnes', cat: 'energy', dataPath: 'gasoil', yfTicker: null   },
        { code: 'ice_dubai',  name: 'ICE Dubai 1st Line Futures',  exchange: 'ICE Futures Europe', units: '1,000 barrels',     cat: 'energy', dataPath: 'dubai',  yfTicker: null   },
        { code: 'ice_sugar',  name: 'ICE White Sugar Futures',     exchange: 'ICE Futures Europe', units: '50 metric tonnes',  cat: 'softs',  dataPath: 'sugar',  yfTicker: null   },
        { code: 'ice_cocoa',  name: 'ICE Cocoa Futures',           exchange: 'ICE Futures Europe', units: '10 metric tonnes',  cat: 'softs',  dataPath: 'cocoa',  yfTicker: null   },
        { code: 'ice_coffee', name: 'ICE Robusta Coffee Futures',  exchange: 'ICE Futures Europe', units: '10 metric tonnes',  cat: 'softs',  dataPath: 'coffee', yfTicker: null   },
        { code: 'ice_wheat',  name: 'ICE Wheat Futures',           exchange: 'ICE Futures Europe', units: '100 metric tonnes', cat: 'grains', dataPath: 'wheat',  yfTicker: null   },
    ];

    function getYFTicker(code, name) {
        if (YF_MAP[code]) return YF_MAP[code];
        const iceDef = ICE_INSTRUMENTS_DEF.find(d => d.code === code);
        if (iceDef && iceDef.yfTicker) return iceDef.yfTicker;
        const s = name.toUpperCase();
        // VIX / Volatility — sprawdź przed innymi
        if (s.includes('VIX') || (s.includes('VOLATILITY') && s.includes('S&P'))) return '^VIX';
        if (s.includes('BITCOIN')) return 'BTC=F';
        if (s.includes('ETHER')) return 'ETH=F';
        if (s.includes('GOLD') && !s.includes('GOLDMAN')) return 'GC=F';
        if (s.includes('SILVER')) return 'SI=F';
        if (s.includes('CRUDE OIL')) return 'CL=F';
        if (s.includes('NATURAL GAS')) return 'NG=F';
        if (s.includes('CORN')) return 'ZC=F';
        if (s.includes('WHEAT')) return 'ZW=F';
        if (s.includes('SOYBEAN')) return 'ZS=F';
        if (s.includes('COPPER')) return 'HG=F';
        if (s.includes('EURO FX')) return '6E=F';
        if (s.includes('BRITISH POUND')) return '6B=F';
        if (s.includes('JAPANESE YEN')) return '6J=F';
        if (s.includes('E-MINI S&P 500')) return 'ES=F';
        if (s.includes('NASDAQ') && s.includes('100')) return 'NQ=F';
        if (s.includes('DOW') && (s.includes('MINI') || s.includes('DJIA'))) return 'YM=F';
        if (s.includes('RUSSELL') && s.includes('2000')) return 'RTY=F';
        return null;
    }

    // ── Category mapping: human-friendly ──
    const catIconsHtml = {
        popular: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
        currencies: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
        crypto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6-6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg>',
        indices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
        energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        metals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
        grains: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 22 22 2"/><path d="M11.66 11.66 4.6 18.72a2 2 0 0 0 0 2.83 2 2 0 0 0 2.83 0l7.06-7.06"/><path d="M20.66 12.34a2 2 0 0 0-2.83 0l-7.06 7.06a2 2 0 0 0 0 2.83 2 2 0 0 0 2.83 0l7.06-7.06a2 2 0 0 0 0-2.83z"/><path d="M12.34 20.66a2 2 0 0 0 0-2.83l7.06-7.06a2 2 0 0 0 0-2.83 2 2 0 0 0-2.83 0l-7.06 7.06a2 2 0 0 0 0 2.83 2 2 0 0 0 2.83 0z"/></svg>',
        softs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
        livestock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 14h18"/><path d="M3 10h18"/><path d="M3 18h18"/></svg>',
        bonds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        favorites: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>'
    };

    const CATS = {
        popular: { icon: catIconsHtml.popular, label: 'Najpopularniejsze', match: () => false },
        currencies: { icon: catIconsHtml.currencies, label: 'Waluty', match: (n, s) => /\b(EURO|POUND|YEN|FRANC|CANADIAN|AUSTRALIAN|NEW ZEALAND|MEXIC|BRAZIL|RUBLE|DOLLAR INDEX|U\.S\. DOLLAR|BRITISH|JAPANESE|SWISS|KRONE|KRONA|RAND|RUPEE|WON|PESO|REAL|LIRA|ZLOTY|FORINT|KORUNA|RENMINBI|YUAN|NZ DOLLAR|AD DOLLAR|CD DOLLAR|JY DOLLAR|SF DOLLAR|BP DOLLAR|DX DOLLAR)\b/i.test(n + ' ' + s) },
        crypto: { icon: catIconsHtml.crypto, label: 'Kryptowaluty', match: (n, s) => /\b(BITCOIN|ETHER|CRYPTO|SHIB|DOGE|SOL|BTC|TETHER|MICRO BTC|MICRO ETHER)\b/i.test(n + ' ' + s) },
        indices: { icon: catIconsHtml.indices, label: 'Indeksy Giełdowe', match: (n, s) => /\b(S&P|S & P|NASDAQ|DOW|RUSSELL|NIKKEI|VIX|VOLATILITY|MSCI|STOXX|FTSE|DAX|E-MINI|DJIA|BLOOMBERG|COMMODITY INDEX|GSCI|CRB)\b/i.test(n + ' ' + s) },
        bonds: { icon: catIconsHtml.bonds, label: 'Obligacje i Stopy Procentowe', match: (n, s) => /\b(TREASURY|T-BOND|T-NOTE|T-BILL|UST BOND|UST NOTE|NOTE.*YEAR|YEAR.*NOTE|YEAR.*BOND|BOND.*YEAR|EURODOLLAR|SOFR|LIBOR|FED FUND|SWAP RATE|INTEREST RATE|ERIS|DELIVERABLE|ULTRA|2 YEAR|5 YEAR|10 YEAR|20 YEAR|30 YEAR|3-MONTH|EUROYEN|EURIBOR|GILT|BUND|BOBL|SCHATZ)\b/i.test(n + ' ' + s) },
        energy: { icon: catIconsHtml.energy, label: 'Surowce Energetyczne', match: (n, s) => /\b(CRUDE|WTI|BRENT|GASOLINE|HEATING|NATURAL GAS|RBOB|PETROLEUM|FUEL OIL|DIESEL|ULSD|KEROSENE|PROPANE|BUTANE|ETHANOL|COAL|POWER|ELECTRIC|PJM|ERCOT|CAISO|EMISSION|CARBON|ARGUS|HENRY HUB|LNG)\b/i.test(n + ' ' + s) },
        metals: { icon: catIconsHtml.metals, label: 'Metale Szlachetne i Przemysłowe', match: (n, s) => /\b(GOLD|SILVER|PLATINUM|PALLADIUM|COPPER|ALUMINUM|ALUMINIUM|COBALT|NICKEL|ZINC|TIN|LEAD|IRON|STEEL|FERROUS|TROY|PRECIOUS|BASE METAL|URANIUM|LITHIUM|MANGANESE)\b/i.test(n + ' ' + s) },
        grains: { icon: catIconsHtml.grains, label: 'Zboża i Rośliny Uprawne', match: (n, s) => /\b(WHEAT|CORN|SOYBEAN|OATS|RICE|CANOLA|RAPESEED|BARLEY|SORGHUM|MILO|SOY OIL|SOY MEAL|SOYOIL|BEAN OIL|BEAN MEAL|KC HRW|SPRING WHEAT|HARD RED|SOFT RED)\b/i.test(n + ' ' + s) },
        livestock: { icon: catIconsHtml.livestock, label: 'Hodowla i Produkty Rolne', match: (n, s) => /\b(CATTLE|HOGS|PORK|FEEDER|LEAN|LIVE CATTLE|LIVE HOGS|PORK BELLIES|LIVESTOCK|MILK|CHEESE|BUTTER|CLASS III|CLASS IV|NFDM|DRY WHEY)\b/i.test(n + ' ' + s) },
        softs: { icon: catIconsHtml.softs, label: 'Towary Miękkie', match: (n, s) => /\b(COFFEE|SUGAR|COCOA|COTTON|ORANGE|LUMBER|WOOD|RUBBER|PALM|FIBER)\b/i.test(n + ' ' + s) },
        favorites: { icon: catIconsHtml.favorites, label: 'Ulubione', match: () => false },
        other: { icon: catIconsHtml.other, label: 'Pozostałe', match: () => true }
    };

    function isPopular(i) {
        return !!getYFTicker(i.code, i.name);
    }

    // ── Report field definitions with human labels ──
    const SERIES = {
        legacy: {
            tag: 'LEG', label: 'Ogólny (Legacy)', fields: [
                { key: 'noncomm_positions_long_all', label: 'Duzi Spekulanci — Pozycje długie', g: 'Duzi Spekulanci', compGrp: 'NC', color: '#3b82f6' },
                { key: 'noncomm_positions_short_all', label: 'Duzi Spekulanci — Pozycje krótkie', g: 'Duzi Spekulanci', compGrp: 'NC' },
                { key: '_net_nc', label: 'Duzi Spekulanci — Pozycja netto', g: 'Duzi Spekulanci', comp: r => (N(r.noncomm_positions_long_all) - N(r.noncomm_positions_short_all)), color: '#3b82f6' },
                { key: 'comm_positions_long_all', label: 'Podmioty Komercyjne — Pozycje długie', g: 'Podmioty Komercyjne', compGrp: 'Comm', color: '#10b981' },
                { key: 'comm_positions_short_all', label: 'Podmioty Komercyjne — Pozycje krótkie', g: 'Podmioty Komercyjne', compGrp: 'Comm' },
                { key: '_net_co', label: 'Podmioty Komercyjne — Pozycja netto', g: 'Podmioty Komercyjne', comp: r => (N(r.comm_positions_long_all) - N(r.comm_positions_short_all)), color: '#10b981' },
                { key: 'nonrept_positions_long_all', label: 'Drobni Spekulanci — Pozycje długie', g: 'Drobni Spekulanci', compGrp: 'Ulica', color: '#8b5cf6' },
                { key: 'nonrept_positions_short_all', label: 'Drobni Spekulanci — Pozycje krótkie', g: 'Drobni Spekulanci', compGrp: 'Ulica' },
                { key: '_net_nr', label: 'Drobni Spekulanci — Pozycja netto', g: 'Drobni Spekulanci', comp: r => (N(r.nonrept_positions_long_all) - N(r.nonrept_positions_short_all)), color: '#8b5cf6' },
                { key: 'open_interest_all', label: 'Otwarte Pozycje (Open Interest)', g: 'Rynek Ogółem' }
            ]
        },
        disaggregated: {
            tag: 'DIS', label: 'Raport Szczegółowy (Disaggregated)', fields: [
                { key: 'prod_merc_positions_long', label: 'Producenci i Handlarze — Pozycje długie', g: 'Producenci i Handlarze', compGrp: 'Producenci', color: '#f59e0b' },
                { key: 'prod_merc_positions_short', label: 'Producenci i Handlarze — Pozycje krótkie', g: 'Producenci i Handlarze', compGrp: 'Producenci' },
                { key: '_net_pm', label: 'Producenci i Handlarze — Pozycja netto', g: 'Producenci i Handlarze', comp: r => (N(r.prod_merc_positions_long) - N(r.prod_merc_positions_short)), color: '#f59e0b' },
                { key: 'swap_positions_long_all', label: 'Dealerzy Swap — Pozycje długie', g: 'Dealerzy Swap (Banki)', compGrp: 'Dealers', color: '#10b981' },
                { key: 'swap__positions_short_all', label: 'Dealerzy Swap — Pozycje krótkie', g: 'Dealerzy Swap (Banki)', compGrp: 'Dealers' },
                { key: '_net_sw', label: 'Dealerzy Swap — Pozycja netto', g: 'Dealerzy Swap (Banki)', comp: r => (N(r.swap_positions_long_all) - N(r.swap__positions_short_all)), color: '#10b981' },
                { key: 'm_money_positions_long_all', label: 'Fundusze Zarządzane — Pozycje długie', g: 'Fundusze Zarządzane (CTA/CTD)', compGrp: 'Fundusze', color: '#3b82f6' },
                { key: 'm_money_positions_short_all', label: 'Fundusze Zarządzane — Pozycje krótkie', g: 'Fundusze Zarządzane (CTA/CTD)', compGrp: 'Fundusze' },
                { key: '_net_mm', label: 'Fundusze Zarządzane — Pozycja netto', g: 'Fundusze Zarządzane (CTA/CTD)', comp: r => (N(r.m_money_positions_long_all) - N(r.m_money_positions_short_all)), color: '#3b82f6' },
                { key: 'other_rept_positions_long', label: 'Pozostałe Duże Podmioty — Pozycje długie', g: 'Pozostałe Duże Podmioty', compGrp: 'Inne Podmioty', color: '#ec4899' },
                { key: 'other_rept_positions_short', label: 'Pozostałe Duże Podmioty — Pozycje krótkie', g: 'Pozostałe Duże Podmioty', compGrp: 'Inne Podmioty' },
                { key: '_net_or', label: 'Pozostałe Duże Podmioty — Pozycja netto', g: 'Pozostałe Duże Podmioty', comp: r => (N(r.other_rept_positions_long) - N(r.other_rept_positions_short)), color: '#ec4899' },
                { key: 'nonrept_positions_long_all', label: 'Drobni Spekulanci — Pozycje długie', g: 'Drobni Spekulanci', compGrp: 'Ulica', color: '#8b5cf6' },
                { key: 'nonrept_positions_short_all', label: 'Drobni Spekulanci — Pozycje krótkie', g: 'Drobni Spekulanci', compGrp: 'Ulica' },
                { key: '_net_nrd', label: 'Drobni Spekulanci — Pozycja netto', g: 'Drobni Spekulanci', compGrp: 'Ulica', comp: r => (N(r.nonrept_positions_long_all) - N(r.nonrept_positions_short_all)), color: '#8b5cf6' },
                { key: 'open_interest_all', label: 'Otwarte Pozycje (Open Interest)', g: 'Rynek Ogółem' }
            ]
        },
        tff: {
            tag: 'TFF', label: 'Raport Finansowy (TFF)', fields: [
                { key: 'dealer_positions_long_all', label: 'Dealerzy i Pośrednicy — Pozycje długie', g: 'Dealerzy i Pośrednicy (Banki)', compGrp: 'Dealer/Bank', color: '#ef4444' },
                { key: 'dealer_positions_short_all', label: 'Dealerzy i Pośrednicy — Pozycje krótkie', g: 'Dealerzy i Pośrednicy (Banki)', compGrp: 'Dealer/Bank' },
                { key: '_net_dl', label: 'Dealerzy i Pośrednicy — Pozycja netto', g: 'Dealerzy i Pośrednicy (Banki)', comp: r => (N(r.dealer_positions_long_all) - N(r.dealer_positions_short_all)), color: '#ef4444' },
                { key: 'asset_mgr_positions_long', label: 'Zarządzający Aktywami — Pozycje długie', g: 'Zarządzający Aktywami (Fundusze)', compGrp: 'Asset Mngmt', color: '#3b82f6' },
                { key: 'asset_mgr_positions_short', label: 'Zarządzający Aktywami — Pozycje krótkie', g: 'Zarządzający Aktywami (Fundusze)', compGrp: 'Asset Mngmt' },
                { key: '_net_am', label: 'Zarządzający Aktywami — Pozycja netto', g: 'Zarządzający Aktywami (Fundusze)', comp: r => (N(r.asset_mgr_positions_long) - N(r.asset_mgr_positions_short)), color: '#3b82f6' },
                { key: 'lev_money_positions_long', label: 'Fundusze Lewarowane — Pozycje długie', g: 'Fundusze Lewarowane', compGrp: 'Hedge Funds', color: '#10b981' },
                { key: 'lev_money_positions_short', label: 'Fundusze Lewarowane — Pozycje krótkie', g: 'Fundusze Lewarowane', compGrp: 'Hedge Funds' },
                { key: '_net_lf', label: 'Fundusze Lewarowane — Pozycja netto', g: 'Fundusze Lewarowane', comp: r => (N(r.lev_money_positions_long) - N(r.lev_money_positions_short)), color: '#10b981' },
                { key: 'other_rept_positions_long', label: 'Pozostałe Duże Podmioty — Pozycje długie', g: 'Pozostałe Duże Podmioty', compGrp: 'Inne', color: '#ec4899' },
                { key: 'other_rept_positions_short', label: 'Pozostałe Duże Podmioty — Pozycje krótkie', g: 'Pozostałe Duże Podmioty', compGrp: 'Inne' },
                { key: '_net_or2', label: 'Pozostałe Duże Podmioty — Pozycja netto', g: 'Pozostałe Duże Podmioty', comp: r => (N(r.other_rept_positions_long) - N(r.other_rept_positions_short)), color: '#ec4899' },
                { key: 'nonrept_positions_long_all', label: 'Drobni Spekulanci — Pozycje długie', g: 'Drobni Spekulanci', compGrp: 'Ulica', color: '#8b5cf6' },
                { key: 'nonrept_positions_short_all', label: 'Drobni Spekulanci — Pozycje krótkie', g: 'Drobni Spekulanci', compGrp: 'Ulica' },
                { key: '_net_nrt', label: 'Drobni Spekulanci — Pozycja netto', g: 'Drobni Spekulanci', comp: r => (N(r.nonrept_positions_long_all) - N(r.nonrept_positions_short_all)), color: '#8b5cf6' },
                { key: 'open_interest_all', label: 'Otwarte Pozycje (Open Interest)', g: 'Rynek Ogółem' },
            ]
        }
    };
    function N(v) { return Number(v) || 0; }
    function getReportData(rpt) { return (chartData[currentDataType] || {})[rpt]; }

    function applySimplifiedSelection(resetFilter = false) {
        if (!currentInst) return;
        if (resetFilter) currentQuickFilterKeys = null;

        let repType = 'legacy';
        const typeBtn = $('#report-type-toggle .cbar-btn.active');
        if (typeBtn) repType = typeBtn.dataset.type;

        const activePosBtns = $$('#position-type-toggle .cbar-btn.active');
        const posTypes = Array.from(activePosBtns).map(b => b.dataset.pos);
        if (posTypes.length === 0) posTypes.push('net'); // fallback

        let targetRpt = '';
        if (repType === 'legacy') {
            targetRpt = currentInst.reports.legacy ? 'legacy' : Object.keys(currentInst.reports)[0];
        } else {
            targetRpt = currentInst.reports.disaggregated ? 'disaggregated' : (currentInst.reports.tff ? 'tff' : 'legacy');
        }

        if (!targetRpt || !SERIES[targetRpt]) return;

        const exSeries = activeSeries.filter(s => s.rpt === 'external');
        activeSeries = [...exSeries];
        const hasPrice = activeSeries.some(s => s.rpt === 'external');
        const defaultAxis = hasPrice ? 'left' : 'right';

        let addedColors = 0;
        const groupColors = {};
        SERIES[targetRpt].fields.forEach(f => {
            if (f.color) groupColors[f.g] = f.color;
        });

        SERIES[targetRpt].fields.forEach(f => {
            if (f.key.includes('open_interest') || f.key.includes('spread')) return;

            // Apply quick filter if active
            if (currentQuickFilterKeys) {
                const isInGroup = currentQuickFilterKeys.some(tk => f.key.includes(tk));
                if (!isInGroup) return;
            }

            let match = false;
            const k = f.key;
            const isNet = k.startsWith('_net_');
            const isLong = !isNet && k.includes('_long');
            const isShort = !isNet && k.includes('_short');

            if (posTypes.includes('net') && isNet) match = true;
            if (posTypes.includes('long') && isLong) match = true;
            if (posTypes.includes('short') && isShort) match = true;

            if (match) {
                let finalColor = f.color || groupColors[f.g] || COLORS[addedColors % COLORS.length];

                // Intelligent Coloring System
                if (currentQuickFilterKeys) {
                    if (isLong) finalColor = '#10b981'; // Green
                    else if (isShort) finalColor = '#ef4444'; // Red
                    // For Net, we keep the original group color (finalColor) which is stored in groupColors
                }

                activeSeries.push({
                    key: f.key, rpt: targetRpt, axis: defaultAxis, color: finalColor, sourceType: currentDataType
                });
                addedColors++;
            }
        });

        // Set right defaults if multiple series
        invertL = false;
        invertR = false;
        if (el.invL) el.invL.classList.remove('active');
        if (el.invR) el.invR.classList.remove('active');

        renderChips();
        rebuildChart();
    }

    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48'];

    // ── i18n ─────────────────────────────────────────────────────────────────
    const EN = {
        // App
        'Analiza przepływu kapitału (CFTC)': 'Capital Flow Analysis (CFTC)',
        // Compact bar
        'Ogólny': 'General', 'Szczegółowy': 'Detailed', 'Netto': 'Net',
        'Zmiana t/t': 'WoW Change', 'Wpływ Opcji': 'Options Impact', 'Filtry': 'Filters',
        // Drawer
        'Ustawienia & Serie': 'Settings & Series', 'Ustawienia': 'Settings',
        'Dodaj serię': 'Add Series', 'Inny instrument': 'Other Instrument',
        'Język / Language': 'Language',
        'Jednostka pozycji': 'Position Unit', 'Liczba kontraktów': 'Contracts',
        'Wartość nominalna': 'Nominal Value', 'Skala osi': 'Scale',
        'Odwróć lewą ↕': 'Invert Left ↕', 'Odwróć prawą ↕': 'Invert Right ↕',
        'Źródło danych': 'Data Source',
        'Wybierz serię z tego instrumentu': 'Select series for this instrument',
        'Lewa oś': 'Left Axis', 'Prawa oś': 'Right Axis',
        'Szukaj instrumentu': 'Search', 'Seria z:': 'Series from:',
        // Section headers
        'Struktura Otwartych Pozycji': 'Open Interest Structure',
        'Dane Liczbowe Pozycji': 'Position Data',
        // Table
        'Zmiana względem:': 'Change vs.:',
        'Poprzedniego tygodnia': 'Previous week',
        'Poprzedniego miesiąca': 'Previous month',
        'Poprzedniego roku': 'Previous year',
        'Raport z dnia:': 'Report date:',
        'Porównanie:': 'Comparison:',
        'Brak danych z poprzedniego okresu': 'No prior period data',
        'Grupa uczestników': 'Participant Group',
        'Pozycje długie (Long)': 'Long Positions',
        'Pozycje krótkie (Short)': 'Short Positions',
        'Pozycja netto (Net)': 'Net Position',
        // Pie charts
        'Pozycje długie': 'Long Positions', 'Pozycje krótkie': 'Short Positions',
        'Łączny Open Interest': 'Total Open Interest', 'kontraktów': 'contracts',
        // Tooltips / charts
        'Wpływ Opcji (COM − FUT)': 'Options Impact (COM − FUT)',
        'Proporcje 100%': '100% Stacked',
        // Chips
        'Widoczne serie:': 'Visible series:',
        // Quick filters
        'Wszystkie grupy (Reset)': 'All Groups (Reset)',
        'Szybkie filtry': 'Quick Filters',
        'Tylko Non-Commercial (Duzi)': 'Non-Commercial Only',
        'Tylko Commercial (Komercyjni)': 'Commercial Only',
        'Tylko Nonreportable (Drobni)': 'Nonreportable Only',
        'Producenci i Dealerzy (PMPU)': 'Producers & Merchants (PMPU)',
        'Dealerzy Swap (Swap)': 'Swap Dealers',
        'Zarządzający Kapitałem (Money)': 'Managed Money',
        'Inni Raportujący (Other)': 'Other Reportables',
        'Dealer Intermediary': 'Dealer Intermediary',
        'Zarządzający Majątkiem (Asset)': 'Asset Manager',
        'Fundusze Lewarowane (Lev)': 'Leveraged Funds',
        // SERIES report labels
        'Ogólny (Legacy)': 'General (Legacy)',
        'Raport Szczegółowy (Disaggregated)': 'Disaggregated Report',
        'Raport Finansowy (TFF)': 'Financial Report (TFF)',
        // SERIES fields – Legacy
        'Duzi Spekulanci — Pozycje długie': 'Large Speculators — Long',
        'Duzi Spekulanci — Pozycje krótkie': 'Large Speculators — Short',
        'Duzi Spekulanci — Pozycja netto': 'Large Speculators — Net',
        'Podmioty Komercyjne — Pozycje długie': 'Commercials — Long',
        'Podmioty Komercyjne — Pozycje krótkie': 'Commercials — Short',
        'Podmioty Komercyjne — Pozycja netto': 'Commercials — Net',
        'Drobni Spekulanci — Pozycje długie': 'Small Speculators — Long',
        'Drobni Spekulanci — Pozycje krótkie': 'Small Speculators — Short',
        'Drobni Spekulanci — Pozycja netto': 'Small Speculators — Net',
        'Otwarte Pozycje (Open Interest)': 'Open Interest',
        // SERIES groups – Legacy
        'Duzi Spekulanci': 'Large Speculators', 'Podmioty Komercyjne': 'Commercials',
        'Drobni Spekulanci': 'Small Speculators', 'Rynek Ogółem': 'Total Market',
        // SERIES fields – Disaggregated
        'Producenci i Handlarze — Pozycje długie': 'Prod. & Merchants — Long',
        'Producenci i Handlarze — Pozycje krótkie': 'Prod. & Merchants — Short',
        'Producenci i Handlarze — Pozycja netto': 'Prod. & Merchants — Net',
        'Dealerzy Swap — Pozycje długie': 'Swap Dealers — Long',
        'Dealerzy Swap — Pozycje krótkie': 'Swap Dealers — Short',
        'Dealerzy Swap — Pozycja netto': 'Swap Dealers — Net',
        'Fundusze Zarządzane — Pozycje długie': 'Managed Money — Long',
        'Fundusze Zarządzane — Pozycje krótkie': 'Managed Money — Short',
        'Fundusze Zarządzane — Pozycja netto': 'Managed Money — Net',
        'Pozostałe Duże Podmioty — Pozycje długie': 'Other Reportables — Long',
        'Pozostałe Duże Podmioty — Pozycje krótkie': 'Other Reportables — Short',
        'Pozostałe Duże Podmioty — Pozycja netto': 'Other Reportables — Net',
        // SERIES groups – Disaggregated
        'Producenci i Handlarze': 'Prod. & Merchants',
        'Dealerzy Swap (Banki)': 'Swap Dealers (Banks)',
        'Fundusze Zarządzane (CTA/CTD)': 'Managed Money (CTA/CTD)',
        'Pozostałe Duże Podmioty': 'Other Reportables',
        // SERIES fields – TFF
        'Dealerzy i Pośrednicy — Pozycje długie': 'Dealer Intermediary — Long',
        'Dealerzy i Pośrednicy — Pozycje krótkie': 'Dealer Intermediary — Short',
        'Dealerzy i Pośrednicy — Pozycja netto': 'Dealer Intermediary — Net',
        'Zarządzający Aktywami — Pozycje długie': 'Asset Manager — Long',
        'Zarządzający Aktywami — Pozycje krótkie': 'Asset Manager — Short',
        'Zarządzający Aktywami — Pozycja netto': 'Asset Manager — Net',
        'Fundusze Lewarowane — Pozycje długie': 'Leveraged Funds — Long',
        'Fundusze Lewarowane — Pozycje krótkie': 'Leveraged Funds — Short',
        'Fundusze Lewarowane — Pozycja netto': 'Leveraged Funds — Net',
        // SERIES groups – TFF
        'Dealerzy i Pośrednicy (Banki)': 'Dealer Intermediary (Banks)',
        'Zarządzający Aktywami (Fundusze)': 'Asset Manager (Funds)',
        'Fundusze Lewarowane': 'Leveraged Funds', 'Inne': 'Other',
        // Categories
        'Najpopularniejsze': 'Most Popular', 'Waluty': 'Currencies',
        'Kryptowaluty': 'Crypto', 'Indeksy Giełdowe': 'Stock Indices',
        'Obligacje i Stopy Procentowe': 'Bonds & Interest Rates',
        'Surowce Energetyczne': 'Energy', 'Metale Szlachetne i Przemysłowe': 'Metals',
        'Zboża i Rośliny Uprawne': 'Grains & Crops',
        'Hodowla i Produkty Rolne': 'Livestock', 'Towary Miękkie': 'Soft Commodities',
        'Ulubione': 'Favorites', 'Pozostałe': 'Other', 'Metale': 'Metals',
        // Loading / errors
        'Pobieranie bazy rynków z CFTC...': 'Loading markets from CFTC...',
        'Nie znaleziono instrumentów.': 'No instruments found.',
        'Ładowanie danych...': 'Loading data...',
        'Błąd połączenia': 'Connection Error',
        'Nie udało się pobrać danych z serwerów CFTC. Sprawdź połączenie i spróbuj ponownie.':
            'Failed to fetch data from CFTC servers. Check your connection and try again.',
        'Odśwież stronę': 'Reload page',
        'Wpisz minimum 2 znaki...': 'Type at least 2 characters...',
        'Brak wyników': 'No results',
        'Wybierz serię do dodania...': 'Select a series to add...',
        'Wybierz serię...': 'Select a series...',
        'ICE publikuje wyłącznie raport Disaggregated': 'ICE only publishes Disaggregated reports',
        'Lewa': 'Left', 'Prawa': 'Right',
    };

    let currentLang = (() => {
        const q = new URLSearchParams(location.search).get('lang');
        if (q === 'en' || q === 'pl') return q;
        return localStorage.getItem('cot-lang') || 'pl';
    })();
    function t(s) { return (currentLang === 'en' && EN[s]) ? EN[s] : s; }

    function setLang(lang) {
        currentLang = lang;
        localStorage.setItem('cot-lang', lang);
        const url = new URL(location.href);
        lang === 'pl' ? url.searchParams.delete('lang') : url.searchParams.set('lang', lang);
        history.replaceState({}, '', url);
        // Update lang toggle buttons UI
        $$('#lang-toggle .cbar-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
        applyI18n();
    }

    function applyI18n() {
        const set = (sel, key) => { const e = document.querySelector(sel); if (e) e.textContent = t(key); };
        // Compact bar buttons
        set('#report-type-toggle .cbar-btn[data-type="legacy"]', 'Ogólny');
        set('#report-type-toggle .cbar-btn[data-type="detailed"]', 'Szczegółowy');
        set('#position-type-toggle .cbar-btn[data-pos="net"]', 'Netto');
        set('#btn-toggle-delta', 'Zmiana t/t');
        set('#btn-toggle-options', 'Wpływ Opcji');
        // Filtry button has SVG — update only text node
        const qfBtn = $('#quick-filters-toggle');
        if (qfBtn) {
            let tn = qfBtn.lastChild;
            while (tn && tn.nodeType !== 3) tn = tn.previousSibling;
            if (tn) tn.textContent = ' ' + t('Filtry');
        }
        // Drawer
        set('.drawer-title', 'Ustawienia & Serie');
        $$('.drawer-tab').forEach(tab => {
            const m = { settings: 'Ustawienia', same: 'Dodaj serię', other: 'Inny instrument' };
            const key = m[tab.dataset.dtab];
            if (!key) return;
            let tn = tab.lastChild;
            while (tn && tn.nodeType !== 3) tn = tn.previousSibling;
            if (tn) tn.textContent = ' ' + t(key);
        });
        $$('.spop-label').forEach(el => { const tr = EN[el.textContent.trim()]; if (tr) el.textContent = currentLang === 'en' ? tr : el.dataset.pl || el.textContent; });
        // Store PL text on first call for round-trip
        $$('.spop-label').forEach(el => { if (!el.dataset.pl) el.dataset.pl = el.textContent; el.textContent = t(el.dataset.pl); });
        set('#val-mul-1', 'Liczba kontraktów');
        const mulBtn = $('#val-mul-size'); if (mulBtn) { const sp = mulBtn.querySelector('#mul-label'); mulBtn.textContent = t('Wartość nominalna') + ' '; if (sp) mulBtn.appendChild(sp); }
        set('#btn-invert-1', 'Odwróć lewą ↕');
        set('#btn-invert-2', 'Odwróć prawą ↕');
        $$('.axis-btn').forEach(b => { const m = { left: 'Lewa oś', right: 'Prawa oś' }; if (m[b.dataset.axis]) b.textContent = t(m[b.dataset.axis]); });
        $$('.cross-axis-btn').forEach(b => { const m = { left: 'Lewa oś', right: 'Prawa oś' }; if (m[b.dataset.axis]) b.textContent = t(m[b.dataset.axis]); });
        // Source toggles
        $$('#add-series-source-toggle .cbar-btn').forEach(b => { if (b.dataset.src === 'fut') b.textContent = t('Futures Only'); if (b.dataset.src === 'com') b.textContent = t('Combined'); });
        // Section headers
        set('#market-composition .section-header h3', 'Struktura Otwartych Pozycji');
        set('#data-summary .section-header h3', 'Dane Liczbowe Pozycji');
        // Period toggle
        set('.table-period-label', 'Zmiana względem:');
        $$('.period-btn').forEach(b => { const m = { ww: 'Poprzedniego tygodnia', mm: 'Poprzedniego miesiąca', yy: 'Poprzedniego roku' }; if (m[b.dataset.period]) b.textContent = t(m[b.dataset.period]); });
        // Search placeholder
        if (el.search) el.search.placeholder = currentLang === 'en'
            ? 'Search instrument... (e.g. Gold, EUR, Bitcoin, Oil, Wheat)'
            : 'Szukaj instrumentu... (np. Gold, EUR, Bitcoin, Ropa, Pszenica)';
        // Header subtitle
        set('.subtitle', 'Analiza przepływu kapitału (CFTC)');
        // Footer
        const foot = document.querySelector('#app-footer p');
        if (foot) foot.innerHTML = currentLang === 'en'
            ? `Data from CFTC public registry: <a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener">Commitments of Traders</a> via Socrata API · For analytical and educational purposes only`
            : `Dane pochodzą z rejestru otwartych pozycji CFTC: <a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener">Commitments of Traders</a> dostępnego przez API Socrata · Wyłącznie do celów analitycznych i edukacyjnych`;
        // Re-render JS-generated parts
        renderChips();
        if (currentInst) { populateAddSelect(); renderReportingTable(); renderPieCharts(); }
        renderCats();
    }

    // ── State ──
    let instruments = [];
    let favorites = JSON.parse(localStorage.getItem('cot-favs') || '[]');
    let currentCat = 'popular';
    let currentRange = '3Y';
    let chartData = {};
    let activeSeries = [];
    let chart = null;
    let propChart = null;
    let deltaChart = null;
    let currentDataType = 'fut'; // 'fut' | 'com'
    let addSeriesSourceType = 'fut'; // source for "Dodaj serię" drawer
    let showDelta = false;
    let showOptionsImpact = false;
    let optionsChart = null;

    let _globalTimeScaleData = [];

    const _syncHandlerMap = new Map();
    let _isSyncing = false;
    function syncChartsGroup() {
        const charts = [chart, deltaChart, propChart, optionsChart].filter(Boolean);
        charts.forEach(c => {
            const h = _syncHandlerMap.get(c);
            if (h) {
                try { c.timeScale().unsubscribeVisibleLogicalRangeChange(h); } catch (e) { }
                _syncHandlerMap.delete(c);
            }
        });
        if (charts.length < 2) return;
        charts.forEach(c => {
            const h = (timeRange) => {
                if (_isSyncing || (!timeRange)) return;
                _isSyncing = true;
                charts.forEach(other => {
                    if (other !== c) {
                        try { other.timeScale().setVisibleLogicalRange(timeRange); } catch (e) { }
                    }
                });
                _isSyncing = false;
            };
            _syncHandlerMap.set(c, h);
            c.timeScale().subscribeVisibleLogicalRangeChange(h);
        });
    }

    let invertL = false, invertR = false;
    let currentInst = null;
    let valueMultiplier = 1;
    let tablePeriod = 'ww'; // 'ww' | 'mm' | 'yy'
    let currentQuickFilterKeys = null;

    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    // ── DOM ──
    const el = {
        themeBtn: $('#theme-toggle'), instrView: $('#instrument-view'), chartView: $('#chart-view'),
        search: $('#instrument-search'), clearSearch: $('#clear-search'), grid: $('#instruments-grid'),
        catTabs: $('#category-tabs'),
        catMobileToggle: $('#cat-mobile-toggle'), catMobileLabel: $('#cat-mobile-label'),
        catMobileDropdown: $('#cat-mobile-dropdown'),
        backBtn: $('#back-btn'), chartName: $('#chart-instrument-name'),
        chartUnits: $('#chart-contract-units'), chartFavBtn: $('#chart-fav-btn'), reportBadges: $('#report-badges'),
        reportDate: $('#chart-report-date'),
        reportTypeBtns: $$('#report-type-toggle .cbar-btn'), posTypeBtns: $$('#position-type-toggle .cbar-btn'),
        invL: $('#btn-invert-1'), invR: $('#btn-invert-2'),
        btnMul1: $('#val-mul-1'), btnMulSize: $('#val-mul-size'), mulLabel: $('#mul-label'),
        yfControl: $('#yf-price-control'), btnTogglePrice: $('#btn-toggle-price'), btnPriceLabel: $('#btn-price-label'),
        chartBox: $('#chart-container'), chartLoad: $('#chart-loading'), ranges: $$('.range-btn'),
        propChartWrap: $('#prop-chart-wrapper'), propChartBox: $('#prop-chart-container'),
        deltaChartWrap: $('#delta-chart-wrapper'), deltaChartBox: $('#delta-chart-container'),
        btnToggleDelta: $('#btn-toggle-delta'),
        optionsChartWrap: $('#options-chart-wrapper'), optionsChartBox: $('#options-chart-container'),
        btnToggleOptions: $('#btn-toggle-options'),
        dataTypeBtns: $$('#data-type-toggle .cbar-btn'),
        addSrcBtns: $$('#add-series-source-toggle .cbar-btn'),
        langToggleBtns: $$('#lang-toggle .cbar-btn'),
        chips: $('#series-chips'),
        addBtn: $('#add-series-btn'), addPanel: $('#add-series-panel'),
        addSel: $('#add-series-select'), confirmAdd: $('#confirm-add-series'), cancelAdd: $('#cancel-add-series'),
        summary: $('#data-summary'), tableContainer: $('#table-container'),
        tableDateRange: $('#table-date-range'),
        composition: $('#market-composition'), pieGrid: $('#pie-charts-grid'),
        settingsToggle: $('#settings-toggle'),
        drawer: $('#settings-drawer'), drawerBackdrop: $('#drawer-backdrop'), drawerClose: $('#drawer-close'),
        drawerTabs: $$('.drawer-tab'), drawerPanels: $$('.drawer-panel'),
        crossSearch: $('#cross-instr-search'), crossResults: $('#cross-instr-results'),
        crossSection: $('#cross-series-section'), crossInstrName: $('#cross-instr-name'),
        crossSelect: $('#cross-series-select'), confirmCross: $('#confirm-cross-series'),
        fullscreenBtn: $('#fullscreen-btn'), chartWrapper: $('.chart-wrapper'),
        fullscreenContainer: $('#fullscreen-container'),
        qfToggle: $('#quick-filters-toggle'), qfMenu: $('#quick-filters-menu'), qfOptions: $('#qf-options')
    };

    // ============================================
    // Theme
    // ============================================
    const savedTheme = localStorage.getItem('cot-theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    el.themeBtn.onclick = () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const nxt = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nxt);
        localStorage.setItem('cot-theme', nxt);
        if (chart) rebuildChart();
    };

    // ============================================
    // Load instruments
    // ============================================
    async function loadAll() {
        el.grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>${t('Pobieranie bazy rynków z CFTC...')}</p></div>`;
        const sel = 'cftc_contract_market_code,contract_market_name,market_and_exchange_names,commodity_group_name,commodity_subgroup_name,commodity_name,futonly_or_combined,contract_units';
        const qWhere = `futonly_or_combined='FutOnly'`;
        const qGroup = sel;

        const fetches = Object.entries(EP).map(async ([rpt, eid]) => {
            try {
                const url = `${API}/${eid}.json?$select=${sel}&$where=${qWhere}&$group=${qGroup}&$limit=5000&$order=contract_market_name`;
                const r = await fetch(url);
                if (!r.ok) return [];
                return (await r.json()).map(d => ({ ...d, _rpt: rpt }));
            } catch { return []; }
        });

        const results = await Promise.all(fetches);
        const map = {};

        results.flat().forEach(row => {
            const code = row.cftc_contract_market_code;
            if (!code) return;
            if (!map[code]) {
                const fullName = row.contract_market_name || row.commodity_name || 'Unknown';
                const combined = fullName + ' ' + (row.commodity_subgroup_name || '') + ' ' + (row.commodity_group_name || '') + ' ' + (row.commodity_name || '');
                map[code] = {
                    code,
                    name: fullName,
                    exchange: (row.market_and_exchange_names || '').replace(fullName + ' - ', '').replace(' - ' + fullName, ''),
                    units: row.contract_units || '',
                    cat: classify(combined),
                    isPop: false,
                    reports: {},
                };
            }
            map[code].reports[row._rpt] = true;
        });

        instruments = Object.values(map);

        // Dołącz instrumenty ICE (statyczne JSON w repo)
        ICE_INSTRUMENTS_DEF.forEach(def => {
            instruments.push({
                code: def.code,
                name: def.name,
                exchange: def.exchange,
                units: def.units,
                cat: def.cat,
                reports: { disaggregated: true },
                source: 'ice',
                dataPath: def.dataPath,
                isPop: false,
            });
        });

        instruments.forEach(i => { i.isPop = isPopular(i); });
        instruments.sort((a, b) => a.name.localeCompare(b.name));

        renderCats();
        renderGrid();
    }

    function classify(text) {
        const t = text.toUpperCase();
        for (const [cat, def] of Object.entries(CATS)) {
            if (def.match && def.match(t, t)) return cat;
        }
        return 'other';
    }

    function parseMultiplier(unitsStr) {
        if (!unitsStr) return 1;
        let s = unitsStr.replace(/,/g, '');
        let m = s.match(/\b\d+(\.\d+)?\b/);
        return m ? parseFloat(m[0]) : 1;
    }

    // ============================================
    // Favorites
    // ============================================
    function isFav(code) { return favorites.includes(code); }
    function toggleFav(code) {
        if (isFav(code)) favorites = favorites.filter(c => c !== code);
        else favorites.push(code);
        localStorage.setItem('cot-favs', JSON.stringify(favorites));
    }

    // ============================================
    // Render instrument grid
    // ============================================

    function renderCats() {
        if (!el.catTabs) return;

        const catDefs = Object.entries(CATS).filter(([k]) => k !== 'other');
        const cur = CATS[currentCat] || CATS['popular'];
        const favCount = instruments.filter(i => isFav(i.code)).length;

        el.catTabs.innerHTML = `
            <div class="cat-dropdown-wrap">
                <button class="cat-dropdown-btn" id="cat-dropdown-btn">
                    <span class="cat-dropdown-icon">${cur.icon}</span>
                    <span class="cat-dropdown-label">${t(cur.label).split(' (')[0]}</span>
                    <svg class="cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="cat-dropdown-menu" id="cat-dropdown-menu">
                    ${catDefs.map(([k, v]) => `
                        <button class="cat-menu-item ${k === currentCat ? 'active' : ''}" data-cat="${k}">
                            <span class="cat-menu-icon">${v.icon}</span>
                            <span>${t(v.label).split(' (')[0]}</span>
                            ${k === 'favorites' && favCount > 0 ? `<span class="cat-count">${favCount}</span>` : ''}
                        </button>
                    `).join('')}
                </div>
            </div>`;

        const btn = el.catTabs.querySelector('#cat-dropdown-btn');
        const menu = el.catTabs.querySelector('#cat-dropdown-menu');
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
            btn.classList.toggle('open');
        };
        document.addEventListener('click', () => { menu.classList.remove('open'); btn.classList.remove('open'); }, { once: true });

        el.catTabs.querySelectorAll('.cat-menu-item').forEach(t => {
            t.onclick = () => {
                currentCat = t.dataset.cat;
                el.search.value = '';
                el.clearSearch.style.display = 'none';
                renderCats();
                renderGrid();
            };
        });

        // Sync mobile dropdown
        const curCat = CATS[currentCat] || CATS['popular'];
        if (el.catMobileLabel) el.catMobileLabel.textContent = t(curCat.label);
        if (el.catMobileDropdown) {
            el.catMobileDropdown.innerHTML = Object.entries(CATS).map(([id, cfg]) =>
                `<div class="cat-mobile-option${id === currentCat ? ' active' : ''}" data-cat="${id}">
                    ${cfg.icon ? `<span style="width:16px;height:16px;display:inline-flex">${cfg.icon}</span>` : ''}
                    <span>${t(cfg.label)}</span>
                </div>`
            ).join('');
            el.catMobileDropdown.querySelectorAll('.cat-mobile-option').forEach(opt => {
                opt.onclick = () => {
                    currentCat = opt.dataset.cat;
                    el.search.value = '';
                    el.clearSearch.style.display = 'none';
                    renderCats();
                    renderGrid();
                    el.catMobileDropdown.style.display = 'none';
                    if (el.catMobileToggle) el.catMobileToggle.classList.remove('open');
                };
            });
        }
    }

    function renderGrid(animate = true) {
        const q = el.search.value.toLowerCase().trim();
        let list = instruments;

        if (q) {
            list = list.filter(i => (i.name + ' ' + i.exchange).toLowerCase().includes(q));
        } else {
            if (currentCat === 'favorites') {
                list = list.filter(i => isFav(i.code));
            } else if (currentCat === 'popular') {
                list = list.filter(i => i.isPop);
            } else if (currentCat !== 'all') {
                list = list.filter(i => i.cat === currentCat);
            }
        }

        if (list.length === 0) {
            el.grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>Nie znaleziono instrumentów.</p></div>';
            return;
        }

        const catIconsHtml = {
            currencies: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
            crypto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6-6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg>',
            indices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>',
            energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
            metals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 12L2 9z"/></svg>',
            grains: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 14 6c1-1 3-2 5-2 0 2-1 4-2 5a7 7 0 0 1-14 14z"/></svg>',
            softs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
            livestock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18M3 14h18M3 18h18"/></svg>',
            bonds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
            other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>',
            popular: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>'
        };

        const catsOrder = [
            { id: 'currencies', label: 'Waluty' },
            { id: 'indices', label: 'Indeksy Giełdowe' },
            { id: 'crypto', label: 'Kryptowaluty' },
            { id: 'bonds', label: 'Obligacje i Stopy Procentowe' },
            { id: 'energy', label: 'Surowce Energetyczne' },
            { id: 'metals', label: 'Metale' },
            { id: 'grains', label: 'Zboża i Rośliny Uprawne' },
            { id: 'softs', label: 'Towary Miękkie' },
            { id: 'livestock', label: 'Hodowla i Produkty Rolne' },
            { id: 'other', label: 'Pozostałe' }
        ];

        el.grid.className = '';
        let html = '';

        const generateCards = (items) => {
            return items.map(i => {
                const iconStr = catIconsHtml[i.cat] || catIconsHtml.other;
                const badges = i.source === 'ice'
                    ? '<span class="mini-badge ice">ICE</span>'
                    : Object.keys(i.reports).map(r => {
                        const cls = r === 'legacy' ? 'leg' : r === 'disaggregated' ? 'dis' : 'tff';
                        const lbl = r === 'legacy' ? 'LEG' : r === 'disaggregated' ? 'DIS' : 'TFF';
                        return `<span class="mini-badge ${cls}">${lbl}</span>`;
                    }).join('');

                return `<div class="instrument-card instrument-item ${animate ? 'animate-in' : ''}" data-code="${i.code}" tabindex="0">
                    <div class="card-icon" style="color:var(--tx-2); width:20px; height:20px;">${iconStr}</div>
                    <div class="card-body">
                        <div class="card-name">${esc(i.name)}</div>
                        <div class="card-exchange">${esc(i.exchange)}</div>
                        <div class="card-badges">${badges}</div>
                    </div>
                    <button class="fav-star fav-btn ${isFav(i.code) ? 'active' : ''}" data-code="${i.code}" aria-label="Toggle favorite">
                        <svg viewBox="0 0 24 24" fill="${isFav(i.code) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                </div>`;
            }).join('');
        };

        if (currentCat === 'popular' && !q) {
            // First show favorites if any in their own section
            const favPop = list.filter(i => isFav(i.code));
            if (favPop.length) {
                html += `<div class="pop-cat-block" style="margin-bottom: var(--sp-2xl); border-color: var(--amber);">
                    <h2 class="pop-cat-title" style="background: rgba(245, 158, 11, 0.05); color: var(--amber);">
                        <span>⭐ Ulubione</span>
                    </h2>
                    <div class="accordion-body"><div class="accordion-inner">
                    <div class="popular-columns" style="padding: var(--sp-md); gap: var(--sp-md);">`;

                catsOrder.forEach(c => {
                    const items = favPop.filter(i => i.cat === c.id);
                    if (!items.length) return;

                    html += `
                        <div class="pop-cat-block" style="border-color: var(--amber); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.05);">
                            <h3 class="pop-cat-title" style="background: rgba(245, 158, 11, 0.05); color: var(--amber);">${t(c.label)}</h3>
                            <div class="accordion-body"><div class="accordion-inner">
                            <ul class="pop-list">
                                ${items.map(i => `
                                    <li class="instrument-item ${animate ? 'animate-in' : ''}" data-code="${i.code}" tabindex="0">
                                        <span style="flex:1;min-width:0;"><span style="font-weight:600;display:block;">${esc(i.name)}</span>${i.exchange ? `<span class="pop-item-sub">${esc(i.exchange)}</span>` : ''}</span>
                                        <button class="fav-btn active" data-code="${i.code}" aria-label="Toggle favorite" style="position:static;opacity:1;padding:0;flex-shrink:0;">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                        </button>
                                    </li>
                                `).join('')}
                            </ul>
                            </div></div>
                        </div>`;
                });
                html += `</div></div></div></div>`; // close popular-columns, inner, body, block
            }

            html += '<div class="popular-columns">';
            catsOrder.forEach(c => {
                const items = list.filter(i => i.cat === c.id);
                if (!items.length) return;

                html += `
                    <div class="pop-cat-block">
                        <h3 class="pop-cat-title">${t(c.label)}</h3>
                        <div class="accordion-body"><div class="accordion-inner">
                        <ul class="pop-list">
                            ${items.map(i => `
                                <li class="instrument-item ${animate ? 'animate-in' : ''}" data-code="${i.code}" tabindex="0">
                                    <span style="flex:1;min-width:0;"><span style="font-weight:600;display:block;">${esc(i.name)}</span>${i.exchange ? `<span class="pop-item-sub">${esc(i.exchange)}</span>` : ''}</span>
                                    <button class="fav-btn ${isFav(i.code) ? 'active' : ''}" data-code="${i.code}" aria-label="Toggle favorite" style="position:static;opacity:1;padding:0;flex-shrink:0;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav(i.code) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    </button>
                                </li>
                            `).join('')}
                        </ul>
                        </div></div>
                    </div>`;
            });
            html += '</div>';
        } else {
            const groupedMode = q === '' && currentCat === 'all';

            if (groupedMode) {
                // If "all" is somehow selected, group them
                catsOrder.forEach(c => {
                    const items = list.filter(i => i.cat === c.id);
                    if (!items.length) return;
                    html += `
                        <div class="pop-cat-block" style="margin-bottom:var(--sp-2xl);">
                            <h2 class="pop-cat-title">${t(c.label)}</h2>
                            <div class="accordion-body"><div class="accordion-inner">
                            <div class="instruments-grid">
                                ${generateCards(items)}
                            </div>
                            </div></div>
                        </div>`;
                });
            } else {
                html += '<div class="instruments-grid">' + generateCards(list) + '</div>';
            }
        }

        el.grid.innerHTML = html;

        // Apply staggered animation delays
        if (animate) {
            el.grid.querySelectorAll('.animate-in').forEach((el, idx) => {
                el.style.animationDelay = (idx * 0.03) + 's';
            });
        }

        el.grid.querySelectorAll('.pop-cat-title').forEach(title => {
            title.onclick = () => {
                const block = title.closest('.pop-cat-block');
                if (block) block.classList.toggle('collapsed');
            };
        });

        el.grid.querySelectorAll('.instrument-item').forEach(card => {
            card.addEventListener('click', e => {
                if (e.target.closest('.fav-btn')) return;
                openChart(card.dataset.code);
            });
            card.addEventListener('keydown', e => { if (e.key === 'Enter') openChart(card.dataset.code); });
        });

        el.grid.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                toggleFav(btn.dataset.code);
                renderGrid(false);
            });
        });
    }

    // ============================================
    // Open chart — load data from ALL available reports
    // ============================================
    async function openChart(code) {
        const inst = instruments.find(i => i.code === code);
        if (!inst) return;
        currentInst = inst;
        chartData = { fut: {}, com: {} };
        activeSeries = [];
        currentQuickFilterKeys = null;
        invertL = invertR = false;
        el.invL.classList.remove('active');
        el.invR.classList.remove('active');

        // Reset scale toggle
        valueMultiplier = 1;
        el.btnMul1.classList.add('active');
        el.btnMulSize.classList.remove('active');
        let parsedMul = parseMultiplier(inst.units);
        el.mulLabel.textContent = `(x${parsedMul})`;

        el.instrView.classList.remove('active');
        el.chartView.classList.add('active');
        window.scrollTo(0, 0);

        el.chartName.textContent = inst.name;
        el.chartUnits.textContent = inst.units;
        updateChartFavBtn();

        const ticker = getYFTicker(inst.code, inst.name);
        if (ticker) {
            el.yfControl.style.display = 'flex';
            if (el.btnPriceLabel) el.btnPriceLabel.textContent = ticker;
            el.btnTogglePrice.dataset.ticker = ticker;
            el.btnTogglePrice.classList.remove('active');
        } else {
            el.yfControl.style.display = 'none';
        }

        // Report badges + blokada "Ogólny" dla ICE (ICE nie ma formatu Legacy)
        if (inst.source === 'ice') {
            el.reportBadges.innerHTML =
                '<span class="report-badge ice">ICE Futures Europe</span>' +
                '<span class="report-badge dis">Disaggregated</span>';
            el.reportTypeBtns.forEach(b => {
                const isDetailed = b.dataset.type === 'detailed';
                b.classList.toggle('active', isDetailed);
                b.disabled = !isDetailed;
                b.style.opacity = isDetailed ? '' : '0.35';
                b.title = isDetailed ? '' : 'ICE publikuje wyłącznie raport Disaggregated';
            });
        } else {
            el.reportTypeBtns.forEach(b => { b.disabled = false; b.style.opacity = ''; b.title = ''; });
            el.reportBadges.innerHTML = Object.keys(inst.reports).map(r => {
                const cls = r === 'legacy' ? 'leg' : r === 'disaggregated' ? 'dis' : 'tff';
                return `<span class="report-badge ${cls}">${SERIES[r].label}</span>`;
            }).join('');
        }

        el.chartLoad.style.display = 'flex';
        try {
            if (inst.source === 'ice') {
                // Ładowanie z pre-generowanych plików JSON (GitHub Actions)
                const base = `./data/ice/${inst.dataPath}`;
                const processICE = data => {
                    const fields = SERIES.disaggregated.fields.filter(f => !f.comp).map(f => f.key);
                    data.forEach(row => {
                        fields.forEach(f => row[f] = N(row[f]));
                        SERIES.disaggregated.fields.filter(f => f.comp).forEach(f => { row[f.key] = f.comp(row); });
                    });
                    return data;
                };
                const [futRes, comRes] = await Promise.all([
                    fetch(`${base}/fut.json`),
                    fetch(`${base}/com.json`),
                ]);
                if (futRes.ok) chartData.fut.disaggregated = processICE(await futRes.json());
                if (comRes.ok) chartData.com.disaggregated = processICE(await comRes.json());
            } else {
                // CFTC Socrata API
                const fetches = Object.keys(inst.reports).flatMap(rpt => {
                    const fields = SERIES[rpt].fields.filter(f => !f.comp).map(f => f.key);
                    const sel = ['report_date_as_yyyy_mm_dd', ...fields].join(',');
                    const processData = (data) => {
                        data.forEach(row => {
                            fields.forEach(f => row[f] = N(row[f]));
                            SERIES[rpt].fields.filter(f => f.comp).forEach(f => { row[f.key] = f.comp(row); });
                        });
                        return data;
                    };
                    const p1 = fetch(`${API}/${EP_FUT[rpt]}.json?$select=${sel}&$where=cftc_contract_market_code='${code}' AND futonly_or_combined='FutOnly'&$order=report_date_as_yyyy_mm_dd ASC&$limit=50000`)
                        .then(r => r.ok ? r.json() : [])
                        .then(d => { chartData.fut[rpt] = processData(d); });
                    const p2 = fetch(`${API}/${EP_COM[rpt]}.json?$select=${sel}&$where=cftc_contract_market_code='${code}'&$order=report_date_as_yyyy_mm_dd ASC&$limit=50000`)
                        .then(r => r.ok ? r.json() : [])
                        .then(d => { chartData.com[rpt] = processData(d); });
                    return [p1, p2];
                });
                await Promise.all(fetches);
            }

            populateAddSelect();
            applySimplifiedSelection();

            renderReportingTable();
            renderPieCharts();

            // Auto-load price if available
            if (ticker) {
                await togglePriceSeries(ticker, true);
            }
        } catch (err) {
            console.error('Load error:', err);
            el.chartLoad.style.display = 'none';
            el.chartBox.innerHTML = `
                <div class="error-slate">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h3>Błąd połączenia</h3>
                    <p>Nie udało się pobrać danych z serwerów CFTC. Sprawdź połączenie i spróbuj ponownie.</p>
                    <button class="confirm-btn" onclick="location.reload()">Odśwież stronę</button>
                </div>`;
        } finally {
            el.chartLoad.style.display = 'none';
        }
    }

    function goBack() {
        el.chartView.classList.remove('active');
        el.instrView.classList.add('active');
        if (chart) { chart.remove(); chart = null; }
        if (propChart) { propChart.remove(); propChart = null; }
        if (deltaChart) { deltaChart.remove(); deltaChart = null; }
        if (optionsChart) { optionsChart.remove(); optionsChart = null; }
        if (el.deltaChartWrap) el.deltaChartWrap.style.display = 'none';
        if (el.optionsChartWrap) el.optionsChartWrap.style.display = 'none';
        showDelta = false;
        showOptionsImpact = false;
        if (el.btnToggleDelta) el.btnToggleDelta.classList.remove('active');
        if (el.btnToggleOptions) el.btnToggleOptions.classList.remove('active');
        chartData = { fut: {}, com: {} };
        activeSeries = [];
        renderGrid(false);
    }

    // ============================================
    // Controls 
    // ============================================
    function populateAddSelect() {
        const src = addSeriesSourceType;
        const prefix = src === 'com' ? '[COM] ' : '';
        let html = `<option value="">${t('Wybierz serię do dodania...')}</option>`;
        for (const [rpt, cfg] of Object.entries(SERIES)) {
            if (!(chartData[src] || {})[rpt]) continue;
            html += `<optgroup label="── ${t(cfg.label)} ──">`;
            cfg.fields.forEach(f => {
                html += `<option value="${rpt}::${f.key}">${prefix}${t(f.label)}</option>`;
            });
            html += `</optgroup>`;
        }
        el.addSel.innerHTML = html;
    }



    // ============================================
    // Chart
    // ============================================
    function getTheme() {
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            layout: { background: { type: 'solid', color: dk ? '#0a0f1a' : '#fff' }, textColor: dk ? '#6b7a94' : '#9ca3af', fontFamily: "'Inter',sans-serif", fontSize: 12 },
            grid: { vertLines: { color: dk ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' }, horzLines: { color: dk ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' } },
            crosshair: { mode: 0 },
            rightPriceScale: { borderColor: dk ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', visible: true, minimumWidth: 85 },
            leftPriceScale: { borderColor: dk ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', visible: false, minimumWidth: 85 },
            timeScale: {
                borderColor: dk ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                timeVisible: false,
                rightOffset: 80,
                barSpacing: 8,
                minBarSpacing: 0.5,
                shiftVisibleRangeOnNewBar: false,
                rightBarStaysOnScroll: false,
                lockVisibleTimeRangeOnResize: true,
            },
            handleScale: {
                mouseWheel: false,
                pinch: false,
                axisPressedMouseMove: {
                    time: true,
                    price: true,
                },
                axisDoubleClickReset: true,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            kineticScroll: {
                touch: true,
                mouse: true,
            },
        };
    }

    function rebuildChart() {
        if (chart) { chart.remove(); chart = null; }
        if (activeSeries.length === 0) return;

        const c = el.chartBox; c.innerHTML = '';
        const theme = getTheme();
        const hasR = activeSeries.filter(s => s.visible !== false).some(s => s.axis === 'right');
        const hasL = activeSeries.filter(s => s.visible !== false).some(s => s.axis === 'left');
        if (typeof LightweightCharts === 'undefined') {
            c.innerHTML = '<div class="error-slate"><h3>Błąd biblioteki</h3><p>Nie znaleziono LightweightCharts. Sprawdź połączenie z internetem.</p></div>';
            return;
        }
        theme.leftPriceScale.visible = hasL;
        theme.rightPriceScale.visible = hasR;

        chart = LightweightCharts.createChart(c, theme);
        chart.applyOptions({ width: c.clientWidth, height: c.clientHeight });
        new ResizeObserver(() => chart && chart.applyOptions({ width: c.clientWidth, height: c.clientHeight })).observe(c);

        const cotSeries = activeSeries.filter(s => s.rpt !== 'external' && s.visible !== false);
        const hasDelta = showDelta && cotSeries.length > 0;
        const hasProp = cotSeries.length >= 2;

        if (hasDelta || hasProp) {
            c.style.borderBottomLeftRadius = '0';
            c.style.borderBottomRightRadius = '0';
            c.style.borderBottom = 'none';
        } else {
            c.style.borderBottomLeftRadius = '';
            c.style.borderBottomRightRadius = '';
            c.style.borderBottom = '';
        }

        activeSeries.forEach(s => {
            if (s.visible === false) return; // hidden by eye toggle
            if (s.rpt === 'external') {
                const data = chartData['external'][s.key];
                if (!data) return;
                const ls = chart.addLineSeries({
                    color: s.color, lineWidth: 2, lineStyle: 2,
                    priceScaleId: s.axis,
                    title: `${s.key.toUpperCase()} Close`,
                    lastValueVisible: true, priceLineVisible: false,
                    crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
                });
                ls.setData(data);
                s._ls = ls;
                return;
            }

            const cfg = SERIES[s.rpt];
            const fld = cfg.fields.find(f => f.key === s.key);
            if (!fld) return;
            // Handle cross-instrument series
            const dataSource = s.crossCode
                ? (chartData['cross_' + s.crossCode] || {})[s.crossRpt || s.rpt]
                : (chartData[s.sourceType || currentDataType] || {})[s.rpt];
            const data = dataSource;
            if (!data) return;

            const inv = (s.axis === 'left' && invertL) || (s.axis === 'right' && invertR);

            const ls = chart.addLineSeries({
                color: s.color, lineWidth: 2,
                priceScaleId: s.axis,
                title: `${fld.label}`,
                lastValueVisible: true, priceLineVisible: false,
                crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
            });

            const pts = [];
            data.forEach(row => {
                if (!row.report_date_as_yyyy_mm_dd) return;
                const time = row.report_date_as_yyyy_mm_dd.substring(0, 10);
                let val = fld.comp ? fld.comp(row) : N(row[s.key]);
                val *= valueMultiplier; // apply config
                if (isNaN(val)) return;
                if (inv) val = -val;
                pts.push({ time, value: val });
            });

            // Dedupe
            pts.sort((a, b) => a.time.localeCompare(b.time));
            const dd = []; pts.forEach(p => { if (!dd.length || dd[dd.length - 1].time !== p.time) dd.push(p); });
            ls.setData(dd);
            s._ls = ls;
        });

        if (hasL) chart.applyOptions({ leftPriceScale: { invertScale: invertL } });
        if (hasR) chart.applyOptions({ rightPriceScale: { invertScale: invertR } });

        const gDates = new Set();
        activeSeries.forEach(s => {
            if (s.visible !== false && s._ls) {
                s._ls.data().forEach(d => gDates.add(d.time));
            }
        });
        _globalTimeScaleData = Array.from(gDates).sort((a, b) => a.localeCompare(b)).map(t => ({ time: t }));

        applyRange(currentRange);
        setupTooltip();
        rebuildPropChart();
        rebuildDeltaChart();
        rebuildOptionsImpactChart();
        syncChartsGroup();
    }

    function applyRange(range) {
        if (!chart) return;
        if (range === 'MAX') { chart.timeScale().fitContent(); return; }
        const now = new Date();
        const from = new Date(now);
        if (range === '1Y') from.setFullYear(now.getFullYear() - 1);
        else if (range === '3Y') from.setFullYear(now.getFullYear() - 3);
        else if (range === '5Y') from.setFullYear(now.getFullYear() - 5);
        else if (range === 'YTD') from.setMonth(0, 1);
        const toStr = now.toISOString().substring(0, 10);
        const frStr = from.toISOString().substring(0, 10);
        try { chart.timeScale().setVisibleRange({ from: frStr, to: toStr }); } catch (e) { chart.timeScale().fitContent(); }
    }

    function setupTooltip() {
        let tip = el.chartBox.querySelector('.chart-tip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'chart-tip';
            tip.style.cssText = 'position:absolute;top:8px;left:8px;z-index:20;background:var(--bg-glass);backdrop-filter:blur(12px);border:1px solid var(--bd);border-radius:var(--r-md);padding:8px 12px;font-size:.72rem;pointer-events:none;color:var(--tx-1);transition:opacity .15s;max-width:340px;';
            el.chartBox.style.position = 'relative';
            el.chartBox.appendChild(tip);
        }

        chart.subscribeCrosshairMove(p => {
            if (!p.time || !p.seriesData || p.seriesData.size === 0) {
                tip.style.opacity = '0';
                if (showDelta && deltaChart) deltaChart.clearCrosshairPosition();
                if (propChart) propChart.clearCrosshairPosition();
                if (showOptionsImpact && optionsChart) optionsChart.clearCrosshairPosition();
                return;
            }
            tip.style.opacity = '1';

            if (showDelta && deltaChart) {
                const fSeries = activeSeries.find(s => s._deltaHs);
                if (fSeries && fSeries._deltaHs) {
                    deltaChart.setCrosshairPosition(0, p.time, fSeries._deltaHs);
                }
            }
            if (propChart) {
                const fSeries = activeSeries.find(s => s._propLs);
                if (fSeries && fSeries._propLs) {
                    propChart.setCrosshairPosition(0, p.time, fSeries._propLs);
                }
            }
            if (showOptionsImpact && optionsChart) {
                const fSeries = activeSeries.find(s => s._optHs);
                if (fSeries && fSeries._optHs) {
                    optionsChart.setCrosshairPosition(0, p.time, fSeries._optHs);
                }
            }

            let h = `<div style="margin-bottom:3px;font-weight:600;color:var(--tx-2)">${p.time}</div>`;
            activeSeries.forEach(s => {
                if (!s._ls) return;
                const d = p.seriesData.get(s._ls);
                if (!d) return;
                let v = d.value;
                if ((s.axis === 'left' && invertL) || (s.axis === 'right' && invertR)) v = -v;

                if (s.rpt === 'external') {
                    h += `<div style="display:flex;gap:5px;align-items:center;margin:1px 0"><span style="width:7px;height:7px;border-radius:50%;background:${s.color};flex-shrink:0"></span><span style="color:var(--tx-2);font-size:.68rem">[YF]</span><span style="color:var(--tx-2)">${s.label}:</span><span style="font-weight:600;margin-left:auto">${v.toFixed(2)}</span></div>`;
                    return;
                }

                const fld = SERIES[s.rpt].fields.find(f => f.key === s.key);
                const label = fld ? t(fld.label) : s.key;
                h += `<div style="display:flex;gap:5px;align-items:center;margin:1px 0"><span style="width:7px;height:7px;border-radius:50%;background:${s.color};flex-shrink:0"></span><span style="color:var(--tx-2)">${label}:</span><span style="font-weight:600;margin-left:auto">${fmt(v)}</span></div>`;
            });

            tip.innerHTML = h;
        });
    }

    function rebuildDeltaChart() {
        if (deltaChart) {
            deltaChart.remove();
            deltaChart = null;
        }

        const cotSeries = activeSeries.filter(s => s.rpt !== 'external' && s.visible !== false);
        if (!showDelta || cotSeries.length === 0) {
            if (el.deltaChartWrap) el.deltaChartWrap.style.display = 'none';
            return;
        }

        if (el.deltaChartWrap) el.deltaChartWrap.style.display = 'block';
        const c = el.deltaChartBox; c.innerHTML = '';

        if (cotSeries.length >= 2) {
            c.style.borderBottomLeftRadius = '0';
            c.style.borderBottomRightRadius = '0';
            c.style.borderBottom = 'none';
        } else {
            c.style.borderBottomLeftRadius = '';
            c.style.borderBottomRightRadius = '';
            c.style.borderBottom = '';
        }

        const theme = getTheme();
        const hasR = activeSeries.filter(s => s.visible !== false).some(s => s.axis === 'right');
        const hasL = activeSeries.filter(s => s.visible !== false).some(s => s.axis === 'left');

        theme.rightPriceScale.visible = true; // Zawsze z prawej
        theme.leftPriceScale.visible = hasL; // By trzymał margines w razie czego
        theme.timeScale.visible = false; // ukrycie powtarzającej się osi dat
        // usunięcie wyciszenia horzLine - teraz widać poprzeczkę poziomego crosshaira

        deltaChart = LightweightCharts.createChart(c, theme);
        deltaChart.applyOptions({ width: c.clientWidth, height: c.clientHeight });
        new ResizeObserver(() => deltaChart && deltaChart.applyOptions({ width: c.clientWidth, height: c.clientHeight })).observe(c);

        if (_globalTimeScaleData.length) {
            deltaChart.addLineSeries({ visible: false, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false }).setData(_globalTimeScaleData);
        }

        cotSeries.forEach(s => {
            if (!s._ls) return;
            const srcData = s._ls.data();
            const histData = [];
            for (let i = 0; i < srcData.length; i++) {
                let diff = 0;
                if (i > 0) diff = srcData[i].value - srcData[i - 1].value;
                let cx = s.color;
                if (cx.startsWith('#') && cx.length === 7) {
                    const r = parseInt(cx.slice(1, 3), 16);
                    const g = parseInt(cx.slice(3, 5), 16);
                    const b = parseInt(cx.slice(5, 7), 16);
                    cx = `rgba(${r}, ${g}, ${b}, 0.5)`;
                }
                histData.push({ time: srcData[i].time, value: diff, color: cx });
            }

            const inv = (s.axis === 'left' && invertL) || (s.axis === 'right' && invertR);
            s._deltaInv = inv;
            const hs = deltaChart.addHistogramSeries({
                color: s.color,
                priceScaleId: 'right', // wymuszenie prawej osi, bo jest luz
                priceFormat: { type: 'volume' }
            });
            hs.setData(histData);
            s._deltaHs = hs;
        });

        if (hasL) deltaChart.applyOptions({ leftPriceScale: { invertScale: invertL } });
        if (hasR) deltaChart.applyOptions({ rightPriceScale: { invertScale: invertR } });

        const mainTime = chart.timeScale();
        const deltaTime = deltaChart.timeScale();

        const r = mainTime.getVisibleLogicalRange();
        if (r) deltaTime.setVisibleLogicalRange(r);

        setupDeltaTooltip();
        syncChartsGroup();
    }

    function setupDeltaTooltip() {
        if (!deltaChart) return;
        let tip = el.deltaChartBox.querySelector('.chart-tip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'chart-tip';
            tip.style.cssText = 'position:absolute;top:8px;left:8px;z-index:20;background:var(--bg-glass);backdrop-filter:blur(12px);border:1px solid var(--bd);border-radius:var(--r-md);padding:8px 12px;font-size:.72rem;pointer-events:none;color:var(--tx-1);transition:opacity .15s;max-width:340px;';
            el.deltaChartBox.style.position = 'relative';
            el.deltaChartBox.appendChild(tip);
        }

        deltaChart.subscribeCrosshairMove(p => {
            if (!p.time || !p.seriesData || p.seriesData.size === 0) {
                tip.style.opacity = '0';
                if (chart) chart.clearCrosshairPosition();
                if (propChart) propChart.clearCrosshairPosition();
                if (showOptionsImpact && optionsChart) optionsChart.clearCrosshairPosition();
                return;
            }
            tip.style.opacity = '1';

            if (chart) {
                const fSeries = activeSeries.find(s => s._ls);
                if (fSeries && fSeries._ls) {
                    chart.setCrosshairPosition(0, p.time, fSeries._ls);
                }
            }
            if (propChart) {
                const fSeries = activeSeries.find(s => s._propLs);
                if (fSeries && fSeries._propLs) {
                    propChart.setCrosshairPosition(0, p.time, fSeries._propLs);
                }
            }
            if (showOptionsImpact && optionsChart) {
                const fSeries = activeSeries.find(s => s._optHs);
                if (fSeries && fSeries._optHs) {
                    optionsChart.setCrosshairPosition(0, p.time, fSeries._optHs);
                }
            }

            let h = `<div style="margin-bottom:3px;font-weight:600;color:var(--tx-2)">${p.time}</div>`;
            h += `<div style="font-size:0.65rem;color:var(--tx-3);text-transform:uppercase;margin-bottom:4px">${t('Zmiana t/t')}</div>`;

            activeSeries.forEach(s => {
                if (!s._deltaHs) return;
                const d = p.seriesData.get(s._deltaHs);
                if (!d || isNaN(d.value)) return;

                let diffVal = d.value;
                if (s._deltaInv) diffVal = -diffVal;

                const sign = diffVal > 0 ? '+' : '';
                const cCls = diffVal > 0 ? '#10b981' : (diffVal < 0 ? '#ef4444' : 'var(--tx-2)');
                const fld = SERIES[s.rpt].fields.find(f => f.key === s.key);
                const label = fld ? t(fld.label) : s.key;

                h += `<div style="display:flex;gap:5px;align-items:center;margin:1px 0"><span style="width:7px;height:7px;border-radius:50%;background:${s.color};flex-shrink:0"></span><span style="color:var(--tx-2)">${label}:</span><span style="font-weight:600;margin-left:auto;color:${cCls}">${sign}${fmt(diffVal)}</span></div>`;
            });

            tip.innerHTML = h;
        });
    }

    function rebuildOptionsImpactChart() {
        if (optionsChart) {
            optionsChart.remove();
            optionsChart = null;
        }
        const cotSeries = activeSeries.filter(s => s.rpt !== 'external' && s.visible !== false);
        if (!showOptionsImpact || cotSeries.length === 0) {
            if (el.optionsChartWrap) el.optionsChartWrap.style.display = 'none';
            return;
        }
        const hasComData = cotSeries.some(s => {
            const com = (chartData.com || {})[s.rpt];
            return com && com.length > 0;
        });
        if (!hasComData) {
            if (el.optionsChartWrap) el.optionsChartWrap.style.display = 'none';
            return;
        }
        if (el.optionsChartWrap) el.optionsChartWrap.style.display = 'block';
        const c = el.optionsChartBox; c.innerHTML = '';

        const theme = getTheme();
        const hasL = activeSeries.filter(s => s.visible !== false).some(s => s.axis === 'left');
        theme.rightPriceScale.visible = true;
        theme.leftPriceScale.visible = hasL;
        theme.timeScale.visible = false;

        optionsChart = LightweightCharts.createChart(c, theme);
        optionsChart.applyOptions({ width: c.clientWidth, height: c.clientHeight });
        new ResizeObserver(() => optionsChart && optionsChart.applyOptions({ width: c.clientWidth, height: c.clientHeight })).observe(c);

        if (_globalTimeScaleData.length) {
            optionsChart.addLineSeries({ visible: false, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false }).setData(_globalTimeScaleData);
        }

        cotSeries.forEach(s => {
            const futData = (chartData.fut || {})[s.rpt];
            const comData = (chartData.com || {})[s.rpt];
            if (!futData || !comData) return;
            const cfg = SERIES[s.rpt];
            const fld = cfg.fields.find(f => f.key === s.key);
            if (!fld) return;

            const futMap = {};
            futData.forEach(row => {
                const t = row.report_date_as_yyyy_mm_dd && row.report_date_as_yyyy_mm_dd.substring(0, 10);
                if (t) futMap[t] = fld.comp ? fld.comp(row) : N(row[s.key]);
            });

            const histData = [];
            comData.forEach(row => {
                const t = row.report_date_as_yyyy_mm_dd && row.report_date_as_yyyy_mm_dd.substring(0, 10);
                if (!t) return;
                const comVal = fld.comp ? fld.comp(row) : N(row[s.key]);
                const futVal = futMap[t] !== undefined ? futMap[t] : 0;
                const impact = (comVal - futVal) * valueMultiplier;
                let cx = s.color;
                if (cx.startsWith('#') && cx.length === 7) {
                    const r = parseInt(cx.slice(1, 3), 16);
                    const g = parseInt(cx.slice(3, 5), 16);
                    const b = parseInt(cx.slice(5, 7), 16);
                    cx = `rgba(${r}, ${g}, ${b}, 0.5)`;
                }
                histData.push({ time: t, value: impact, color: cx });
            });
            histData.sort((a, b) => a.time.localeCompare(b.time));
            const dd = []; histData.forEach(p => { if (!dd.length || dd[dd.length - 1].time !== p.time) dd.push(p); });

            const hs = optionsChart.addHistogramSeries({
                color: s.color,
                priceScaleId: 'right',
                priceFormat: { type: 'volume' }
            });
            hs.setData(dd);
            s._optHs = hs;
        });

        if (chart) {
            const r = chart.timeScale().getVisibleLogicalRange();
            if (r) optionsChart.timeScale().setVisibleLogicalRange(r);
        }
        setupOptionsTooltip();
        syncChartsGroup();
    }

    function setupOptionsTooltip() {
        if (!optionsChart || !el.optionsChartWrap) return;
        let tip = el.optionsChartBox.querySelector('.chart-tip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'chart-tip';
            tip.style.cssText = 'position:absolute;top:8px;left:8px;z-index:20;background:var(--bg-glass);backdrop-filter:blur(12px);border:1px solid var(--bd);border-radius:var(--r-md);padding:8px 12px;font-size:.72rem;pointer-events:none;color:var(--tx-1);transition:opacity .15s;max-width:340px;';
            el.optionsChartBox.style.position = 'relative';
            el.optionsChartBox.appendChild(tip);
        }
        optionsChart.subscribeCrosshairMove(p => {
            if (!p.time || !p.seriesData || p.seriesData.size === 0) {
                tip.style.opacity = '0';
                if (chart) chart.clearCrosshairPosition();
                if (showDelta && deltaChart) deltaChart.clearCrosshairPosition();
                if (propChart) propChart.clearCrosshairPosition();
                return;
            }
            tip.style.opacity = '1';

            if (chart) {
                const fSeries = activeSeries.find(s => s._ls);
                if (fSeries && fSeries._ls) {
                    chart.setCrosshairPosition(0, p.time, fSeries._ls);
                }
            }
            if (showDelta && deltaChart) {
                const fSeries = activeSeries.find(s => s._deltaHs);
                if (fSeries && fSeries._deltaHs) {
                    deltaChart.setCrosshairPosition(0, p.time, fSeries._deltaHs);
                }
            }
            if (propChart) {
                const fSeries = activeSeries.find(s => s._propLs);
                if (fSeries && fSeries._propLs) {
                    propChart.setCrosshairPosition(0, p.time, fSeries._propLs);
                }
            }
            let h = `<div style="margin-bottom:3px;font-weight:600;color:var(--tx-2)">${p.time}</div>`;
            h += `<div style="font-size:0.65rem;color:var(--tx-3);text-transform:uppercase;margin-bottom:4px">${t('Wpływ Opcji (COM − FUT)')}</div>`;
            const cotSeries = activeSeries.filter(s => s.rpt !== 'external' && s.visible !== false);
            cotSeries.forEach(s => {
                if (!s._optHs) return;
                const d = p.seriesData.get(s._optHs);
                if (!d || isNaN(d.value)) return;
                const sign = d.value > 0 ? '+' : '';
                const cCls = d.value > 0 ? '#10b981' : (d.value < 0 ? '#ef4444' : 'var(--tx-2)');
                const fld = SERIES[s.rpt].fields.find(f => f.key === s.key);
                const label = fld ? t(fld.label) : s.key;
                h += `<div style="display:flex;gap:5px;align-items:center;margin:1px 0"><span style="width:7px;height:7px;border-radius:50%;background:${s.color};flex-shrink:0"></span><span style="color:var(--tx-2)">${label}:</span><span style="font-weight:600;margin-left:auto;color:${cCls}">${sign}${fmt(d.value)}</span></div>`;
            });
            tip.innerHTML = h;
        });
    }

    function rebuildPropChart() {
        if (propChart) { propChart.remove(); propChart = null; }

        const cotSeries = activeSeries.filter(s => s.rpt !== 'external' && s.visible !== false);
        if (cotSeries.length < 2) {
            if (el.propChartWrap) el.propChartWrap.style.display = 'none';
            return;
        }

        if (el.propChartWrap) el.propChartWrap.style.display = 'block';
        const c = el.propChartBox; c.innerHTML = '';
        const theme = getTheme();
        const hasR = activeSeries.filter(s => s.visible !== false).some(s => s.axis === 'right');
        const hasL = activeSeries.filter(s => s.visible !== false).some(s => s.axis === 'left');

        theme.rightPriceScale.visible = hasR;
        theme.leftPriceScale.visible = hasL;
        theme.timeScale.visible = false;

        propChart = LightweightCharts.createChart(c, theme);
        propChart.applyOptions({ width: c.clientWidth, height: c.clientHeight });
        new ResizeObserver(() => propChart && propChart.applyOptions({ width: c.clientWidth, height: c.clientHeight })).observe(c);

        if (_globalTimeScaleData.length) {
            propChart.addLineSeries({ visible: false, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false }).setData(_globalTimeScaleData);
        }

        let overlays = c.querySelector('.prop-overlays');
        if (!overlays) {
            overlays = document.createElement('div');
            overlays.className = 'prop-overlays';
            overlays.style.cssText = 'position:absolute; left:0; right:70px; top:0; height:0; pointer-events:none; z-index:10; border-top:1px solid ' + (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)');

            const titleDom = document.createElement('div');
            titleDom.style.cssText = 'position:absolute; top:4px; left:8px; font-size:0.65rem; font-weight:600; color:var(--tx-3); text-transform:uppercase; z-index:11;';
            titleDom.innerText = t('Proporcje 100%');
            overlays.appendChild(titleDom);

            c.appendChild(overlays);
        }

        let datesSet = new Set();
        const seriesData = {};

        cotSeries.forEach(s => {
            const cfg = SERIES[s.rpt];
            const fld = cfg.fields.find(f => f.key === s.key);
            const data = s.crossCode
                ? (chartData['cross_' + s.crossCode] || {})[s.crossRpt || s.rpt]
                : (chartData[s.sourceType || currentDataType] || {})[s.rpt];
            if (!data) return;

            seriesData[s.key] = {};
            data.forEach(row => {
                if (!row.report_date_as_yyyy_mm_dd) return;
                const time = row.report_date_as_yyyy_mm_dd.substring(0, 10);
                datesSet.add(time);
                let val = fld.comp ? fld.comp(row) : N(row[s.key]);
                if (!isNaN(val)) seriesData[s.key][time] = Math.abs(val);
            });
        });

        const sortedDates = Array.from(datesSet).sort();
        const stackPoints = cotSeries.map(() => []);

        sortedDates.forEach(t => {
            let total = 0;
            cotSeries.forEach(s => {
                total += seriesData[s.key]?.[t] || 0;
            });

            let runningSum = 0;
            if (total > 0) {
                for (let i = 0; i < cotSeries.length; i++) {
                    const s = cotSeries[i];
                    const val = seriesData[s.key]?.[t] || 0;
                    runningSum += (val / total) * 100;
                    stackPoints[i].push({ time: t, value: runningSum });
                }
            } else {
                for (let i = 0; i < cotSeries.length; i++) {
                    stackPoints[i].push({ time: t, value: 0 });
                }
            }
        });

        for (let i = cotSeries.length - 1; i >= 0; i--) {
            const s = cotSeries[i];
            const areaSeries = propChart.addAreaSeries({
                topColor: s.color,
                bottomColor: s.color,
                lineColor: s.color,
                lineWidth: 1,
                priceScaleId: 'right',
                crosshairMarkerVisible: false,
                priceLineVisible: false,
                lastValueVisible: false,
                autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } })
            });
            areaSeries.setData(stackPoints[i]);
            s._propLs = areaSeries;
        }

        propChart.priceScale('right').applyOptions({
            autoScale: false,
            scaleMargins: { top: 0, bottom: 0 }
        });

        if (chart) {
            const r = chart.timeScale().getVisibleLogicalRange();
            if (r) propChart.timeScale().setVisibleLogicalRange(r);
        }

        setupPropTooltip();
        syncChartsGroup();
    }

    function setupPropTooltip() {
        if (!el.propChartWrap) return;
        let tip = el.propChartWrap.querySelector('.chart-tip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'chart-tip';
            tip.style.cssText = 'position:absolute;top:8px;left:8px;z-index:20;background:var(--bg-glass);backdrop-filter:blur(12px);border:1px solid var(--bd);border-radius:var(--r-md);padding:8px 12px;font-size:.72rem;pointer-events:none;color:var(--tx-1);transition:opacity .15s;max-width:340px;';
            el.propChartWrap.appendChild(tip);
        }
        propChart.subscribeCrosshairMove(p => {
            if (!p.time || !p.seriesData || p.seriesData.size === 0) {
                tip.style.opacity = '0';
                if (chart) chart.clearCrosshairPosition();
                if (showDelta && deltaChart) deltaChart.clearCrosshairPosition();
                if (showOptionsImpact && optionsChart) optionsChart.clearCrosshairPosition();
                return;
            }
            tip.style.opacity = '1';

            if (chart) {
                const fSeries = activeSeries.find(s => s._ls);
                if (fSeries && fSeries._ls) {
                    chart.setCrosshairPosition(0, p.time, fSeries._ls);
                }
            }
            if (showDelta && deltaChart) {
                const fSeries = activeSeries.find(s => s._deltaHs);
                if (fSeries && fSeries._deltaHs) {
                    deltaChart.setCrosshairPosition(0, p.time, fSeries._deltaHs);
                }
            }
            if (showOptionsImpact && optionsChart) {
                const fSeries = activeSeries.find(s => s._optHs);
                if (fSeries && fSeries._optHs) {
                    optionsChart.setCrosshairPosition(0, p.time, fSeries._optHs);
                }
            }

            let h = `<div style="margin-bottom:3px;font-weight:600;color:var(--tx-2)">${p.time}</div>`;

            const cotSeries = activeSeries.filter(s => s.rpt !== 'external' && s.visible !== false);
            const seriesVals = [];
            let prevSum = 0;
            for (let i = 0; i < cotSeries.length; i++) {
                const s = cotSeries[i];
                if (!s._propLs) continue;
                const d = p.seriesData.get(s._propLs);
                const val = d ? d.value : prevSum;
                const actVal = val - prevSum;
                prevSum = val;

                const fld = SERIES[s.rpt].fields.find(f => f.key === s.key);
                const label = fld ? t(fld.label) : s.key;
                seriesVals.push(`<div style="display:flex;gap:5px;align-items:center;margin:1px 0"><span style="width:7px;height:7px;border-radius:50%;background:${s.color};flex-shrink:0"></span><span style="color:var(--tx-2)">${label}:</span><span style="font-weight:600;margin-left:auto">${actVal.toFixed(1)}%</span></div>`);
            }

            h += seriesVals.reverse().join('');
            tip.innerHTML = h;
        });
    }

    // ============================================
    // Chips
    // ============================================
    function renderChips() {
        const labelHtml = `<span class="chips-label">${t('Widoczne serie:')}</span>`;
        const chipsHtml = activeSeries.map((s, i) => {
            const hidden = s.visible === false;
            const eyeIcon = hidden
                ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
                : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

            let label;
            if (s.rpt === 'external') {
                label = `[YF] ${s.label}`;
            } else if (s.crossCode) {
                label = s.label || s.key;
            } else {
                const fld = SERIES[s.rpt].fields.find(f => f.key === s.key);
                const srcPrefix = s.sourceType === 'com' ? '[COM] ' : '';
                label = srcPrefix + (fld ? t(fld.label) : s.key);
            }

            const axisBadge = s.axis === 'right' ? 'P' : 'L';
            return `<div class="series-chip${hidden ? ' chip-hidden' : ''}" data-i="${i}" title="Kliknij aby edytować">
                <span class="chip-dot" style="background:${s.color}${hidden ? ';opacity:0.4' : ''}"></span>
                <span class="chip-label">${label}</span>
                <span class="chip-axis-badge">${axisBadge}</span>
                <button class="chip-eye" data-i="${i}" title="Pokaż/ukryj">${eyeIcon}</button>
                <button class="chip-remove" data-i="${i}" title="Usuń">✕</button>
            </div>`;
        }).join('');
        el.chips.innerHTML = labelHtml + chipsHtml;

        el.chips.querySelectorAll('.series-chip').forEach(chip => {
            chip.addEventListener('click', e => {
                if (e.target.closest('.chip-eye') || e.target.closest('.chip-remove')) return;
                openChipPopover(chip, +chip.dataset.i);
            });
        });

        el.chips.querySelectorAll('.chip-eye').forEach(b => {
            b.onclick = e => {
                e.stopPropagation();
                const idx = +b.dataset.i;
                activeSeries[idx].visible = activeSeries[idx].visible === false ? true : false;
                renderChips(); rebuildChart();
            };
        });

        el.chips.querySelectorAll('.chip-remove').forEach(b => {
            b.onclick = e => {
                e.stopPropagation();
                const rmIdx = +b.dataset.i;
                const removedS = activeSeries[rmIdx];
                activeSeries.splice(rmIdx, 1);
                closeChipPopover();
                renderChips(); rebuildChart();
                if (removedS.rpt === 'external' && el.btnTogglePrice && el.btnTogglePrice.dataset.ticker === removedS.key) {
                    el.btnTogglePrice.classList.remove('active');
                }
            };
        });
    }

    const CHIP_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1', '#e11d48', '#64748b'];
    let chipPopoverEl = null;

    function openChipPopover(chipEl, idx) {
        closeChipPopover();
        const s = activeSeries[idx];
        if (!s) return;

        const pop = document.createElement('div');
        pop.className = 'chip-popover';
        pop.innerHTML = `
            <div class="cpop-section">
                <div class="cpop-label">Oś wykresu</div>
                <div class="cpop-axis-row">
                    <button class="cpop-axis-btn${s.axis !== 'right' ? ' active' : ''}" data-ax="left">Lewa</button>
                    <button class="cpop-axis-btn${s.axis === 'right' ? ' active' : ''}" data-ax="right">Prawa</button>
                </div>
            </div>
            <div class="cpop-section">
                <div class="cpop-label">Kolor linii</div>
                <div class="cpop-colors">
                    ${CHIP_COLORS.map(c => `<button class="cpop-color${s.color === c ? ' sel' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
                </div>
            </div>
        `;

        pop.querySelectorAll('.cpop-axis-btn').forEach(b => {
            b.onclick = e => {
                e.stopPropagation();
                activeSeries[idx].axis = b.dataset.ax;
                pop.querySelectorAll('.cpop-axis-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                renderChips(); rebuildChart();
            };
        });

        pop.querySelectorAll('.cpop-color').forEach(b => {
            b.onclick = e => {
                e.stopPropagation();
                activeSeries[idx].color = b.dataset.color;
                pop.querySelectorAll('.cpop-color').forEach(x => x.classList.remove('sel'));
                b.classList.add('sel');
                renderChips(); rebuildChart();
            };
        });

        document.body.appendChild(pop);
        chipPopoverEl = pop;

        const rect = chipEl.getBoundingClientRect();
        const pw = 220;
        let left = rect.left;
        if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
        pop.style.left = left + 'px';
        pop.style.top = (rect.bottom + 6 + window.scrollY) + 'px';

        setTimeout(() => document.addEventListener('click', closeChipPopover, { once: true }), 10);
    }

    function closeChipPopover() {
        if (chipPopoverEl) { chipPopoverEl.remove(); chipPopoverEl = null; }
    }

    function addSeriesFromPanel() {
        const val = el.addSel.value;
        if (!val) return;
        const [rpt, key] = val.split('::');
        if (activeSeries.some(s => s.rpt === rpt && s.key === key && s.sourceType === addSeriesSourceType)) return;
        const axBtn = document.querySelector('.axis-btn.active');
        const axis = axBtn ? axBtn.dataset.axis : 'left';
        activeSeries.push({ key, rpt, axis, color: COLORS[activeSeries.length % COLORS.length], sourceType: addSeriesSourceType });
        renderChips();
        rebuildChart();
        el.addPanel.style.display = 'none';
        el.addSel.value = '';
    }

    // ============================================
    // Positioning Table (with period toggle)
    // ============================================
    function renderReportingTable() {
        const prio = ['tff', 'disaggregated', 'legacy'];
        let repMatch = null;
        for (let r of prio) { if (getReportData(r) && getReportData(r).length >= 1) { repMatch = r; break; } }

        if (!repMatch) { el.summary.style.display = 'none'; return; }

        const data = getReportData(repMatch);
        const latest = data[data.length - 1];
        const periodOffset = tablePeriod === 'ww' ? 1 : tablePeriod === 'mm' ? 4 : 52;
        const prev = data.length > periodOffset ? data[data.length - 1 - periodOffset] : null;

        // Show report date
        const latestDate = latest.report_date_as_yyyy_mm_dd ? latest.report_date_as_yyyy_mm_dd.substring(0, 10) : '—';
        el.reportDate.textContent = t('Raport z dnia:') + ' ' + latestDate;

        // Date range
        if (prev) {
            const prevDate = prev.report_date_as_yyyy_mm_dd ? prev.report_date_as_yyyy_mm_dd.substring(0, 10) : '—';
            el.tableDateRange.textContent = `${t('Porównanie:')} ${prevDate} → ${latestDate}`;
        } else {
            el.tableDateRange.textContent = t('Brak danych z poprzedniego okresu');
        }

        const fields = SERIES[repMatch].fields;
        const periodLabel = tablePeriod === 'ww' ? 'w/w' : tablePeriod === 'mm' ? 'm/m' : 'y/y';

        let groups = {};
        fields.forEach(f => {
            if (f.key.includes('open_interest') || f.key.includes('spread')) return;
            const isNet = f.key.startsWith('_net_');
            const isLong = !isNet && f.key.includes('_long');
            const isShort = !isNet && f.key.includes('_short');
            if (!isNet && !isLong && !isShort) return;
            let grpName = t(f.g);
            if (!groups[grpName]) groups[grpName] = { name: grpName, L: 0, S: 0, Net: 0, Lchg: 0, Schg: 0, Netchg: 0 };

            let v = f.comp ? f.comp(latest) : N(latest[f.key]); v *= valueMultiplier;
            let vp = prev ? (f.comp ? f.comp(prev) : N(prev[f.key])) * valueMultiplier : null;

            if (isLong) {
                groups[grpName].L = v;
                groups[grpName].Lchg = vp !== null ? v - vp : 0;
            } else if (isShort) {
                groups[grpName].S = v;
                groups[grpName].Schg = vp !== null ? v - vp : 0;
            } else if (isNet) {
                groups[grpName].Net = v;
                groups[grpName].Netchg = vp !== null ? v - vp : 0;
            }
        });

        const makeBadge = val => {
            if (val === 0 || !val) return '<span class="chg-badge chg-neutral">—</span>';
            const sign = val > 0 ? '+' : '';
            const cls = val > 0 ? 'chg-positive' : 'chg-negative';
            return `<span class="chg-badge ${cls}">${sign}${fmt(val)}</span>`;
        };

        const rows = Object.values(groups).map(g => `
            <tr>
                <td>${g.name}</td>
                <td><div style="font-weight:600">${fmt(g.L)}</div><div style="margin-top:2px">${makeBadge(g.Lchg)}</div></td>
                <td class="table-divider"><div style="font-weight:600">${fmt(g.S)}</div><div style="margin-top:2px">${makeBadge(g.Schg)}</div></td>
                <td class="table-divider"><div style="font-weight:600">${fmt(g.Net)}</div><div style="margin-top:2px">${makeBadge(g.Netchg)}</div></td>
            </tr>
        `).join('');

        el.tableContainer.innerHTML = `
            <table class="comp-table">
                <thead>
                    <tr>
                        <th>${t('Grupa uczestników')}</th>
                        <th>${t('Pozycje długie (Long)')}</th>
                        <th class="table-divider">${t('Pozycje krótkie (Short)')}</th>
                        <th class="table-divider">${t('Pozycja netto (Net)')}</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
        el.summary.style.display = 'block';
    }

    // ============================================
    // Market Composition Pie Charts
    // ============================================
    function drawDonut(canvas, slices, centerText) {
        const dpr = window.devicePixelRatio || 1;
        const size = 180;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const cx = size / 2, cy = size / 2, r = 72, inner = 48;
        let startAngle = -Math.PI / 2;

        slices.forEach(s => {
            const sweep = (s.pct / 100) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
            ctx.arc(cx, cy, inner, startAngle + sweep, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = s.color;
            ctx.fill();
            startAngle += sweep;
        });
    }

    function renderPieCharts() {
        const prio = ['tff', 'disaggregated', 'legacy'];
        let repMatch = null;
        for (let r of prio) { if (getReportData(r) && getReportData(r).length) { repMatch = r; break; } }

        if (!repMatch) { el.composition.style.display = 'none'; return; }

        const repData = getReportData(repMatch);
        const latest = repData[repData.length - 1];
        const fields = SERIES[repMatch].fields;
        const PIE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1', '#e11d48', '#64748b'];

        let groups = {};
        fields.forEach(f => {
            if (!f.compGrp) return;
            if (!groups[f.compGrp]) groups[f.compGrp] = { L: 0, S: 0 };
            let v = N(latest[f.key]) * valueMultiplier;
            const isLong = !f.key.startsWith('_net_') && f.key.includes('_long');
            const isShort = !f.key.startsWith('_net_') && f.key.includes('_short');
            if (isLong) groups[f.compGrp].L = v;
            if (isShort) groups[f.compGrp].S = v;
        });

        const entries = Object.entries(groups).filter(([, d]) => d.L > 0 || d.S > 0);
        if (!entries.length) { el.composition.style.display = 'none'; return; }

        const totalLong = entries.reduce((s, [, d]) => s + d.L, 0);
        const totalShort = entries.reduce((s, [, d]) => s + d.S, 0);
        const totalOI = totalLong + totalShort;

        function buildPie(title, getVal, total) {
            const slices = entries.map(([lbl, d], i) => {
                const val = getVal(d);
                return { label: lbl, value: val, pct: total > 0 ? (val / total) * 100 : 0, color: PIE_COLORS[i % PIE_COLORS.length] };
            }).filter(s => s.value > 0);

            const id = 'pie-' + title.replace(/\s+/g, '-').toLowerCase();
            const legendItems = slices.map(s =>
                `<div class="pie-legend-item"><span class="pie-legend-dot" style="background:${s.color}"></span><span>${s.label}</span><span class="pie-legend-pct">${s.pct.toFixed(1)}%</span><span class="pie-legend-value">${fmt(s.value)}</span></div>`
            ).join('');

            return `<div class="pie-card">
                <h4>${title}</h4>
                <div class="pie-canvas-wrapper">
                    <canvas id="${id}"></canvas>
                    <div class="pie-center-label">${fmt(total)}<small>${t('kontraktów')}</small></div>
                </div>
                <div class="pie-legend">${legendItems}</div>
            </div>`;
        }

        el.pieGrid.innerHTML =
            buildPie(t('Pozycje długie'), d => d.L, totalLong) +
            buildPie(t('Pozycje krótkie'), d => d.S, totalShort) +
            buildPie(t('Łączny Open Interest'), d => d.L + d.S, totalOI);

        // Draw canvases
        function drawPieFor(title, getVal, total) {
            const id = 'pie-' + title.replace(/\s+/g, '-').toLowerCase();
            const canvas = document.getElementById(id);
            if (!canvas) return;
            const slices = entries.map(([lbl, d], i) => {
                const val = getVal(d);
                return { pct: total > 0 ? (val / total) * 100 : 0, color: PIE_COLORS[i % PIE_COLORS.length] };
            }).filter(s => s.pct > 0);
            drawDonut(canvas, slices);
        }

        drawPieFor(t('Pozycje długie'), d => d.L, totalLong);
        drawPieFor(t('Pozycje krótkie'), d => d.S, totalShort);
        drawPieFor(t('Łączny Open Interest'), d => d.L + d.S, totalOI);

        el.composition.style.display = 'block';
    }

    // ============================================
    // Yahoo Finance Price Fetching
    // ============================================
    async function fetchYahooPrice(ticker) {
        if (!ticker) return false;
        if (chartData['external'] && chartData['external'][ticker]) return true;

        try {
            el.chartLoad.style.display = 'flex';
            const url = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=10y`);
            // Attempt with corsproxy.io
            const res = await fetch(`https://corsproxy.io/?url=${url}`);
            const data = await res.json();

            if (!data.chart || !data.chart.result) throw new Error("No data returned for ticker.");
            const resData = data.chart.result[0];
            const timestamps = resData.timestamp;
            const closes = resData.indicators.quote[0].close;

            // Zbieranie dat z raportów COT
            let validDates = new Set();
            for (let k in (chartData.fut || {})) {
                const arr = chartData.fut[k];
                if (Array.isArray(arr)) {
                    arr.forEach(row => {
                        if (row.report_date_as_yyyy_mm_dd) {
                            validDates.add(row.report_date_as_yyyy_mm_dd.substring(0, 10));
                        }
                    });
                }
            }

            const lineData = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (closes[i] !== null && closes[i] !== undefined) {
                    const dt = new Date(timestamps[i] * 1000);
                    const dtStr = dt.toISOString().split('T')[0];
                    if (validDates.has(dtStr)) {
                        lineData.push({ time: dtStr, value: closes[i] });
                    }
                }
            }

            if (!chartData['external']) chartData['external'] = {};
            chartData['external'][ticker] = lineData;
            return true;
        } catch (e) {
            console.error(e);
            alert('Nie udało się pobrać danych Yahoo Finance dla: ' + ticker);
            return false;
        } finally {
            el.chartLoad.style.display = 'none';
        }
    }

    // ============================================
    // Time Range Handlers
    // ============================================
    el.ranges.forEach(btn => btn.onclick = () => {
        el.ranges.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (chart) setTimeRange(btn.dataset.range);
    });

    function setTimeRange(rangeStr) {
        if (!chart || !activeSeries.length) return;
        // Find maximum timeframe
        let maxLast = 0;
        let minFirst = Date.now();
        let ptsExists = false;

        activeSeries.forEach(s => {
            if (s._ls) {
                const pts = s._ls.data();
                if (pts && pts.length > 0) {
                    ptsExists = true;
                    const d0 = new Date(pts[0].time).getTime();
                    const dlast = new Date(pts[pts.length - 1].time).getTime();
                    if (d0 < minFirst) minFirst = d0;
                    if (dlast > maxLast) maxLast = dlast;
                }
            }
        });

        if (!ptsExists) return;

        let lastDt = new Date(maxLast);
        let startDt = new Date(minFirst);

        if (rangeStr === '1Y') startDt = new Date(lastDt.getFullYear() - 1, lastDt.getMonth(), lastDt.getDate());
        else if (rangeStr === '3Y') startDt = new Date(lastDt.getFullYear() - 3, lastDt.getMonth(), lastDt.getDate());
        else if (rangeStr === '5Y') startDt = new Date(lastDt.getFullYear() - 5, lastDt.getMonth(), lastDt.getDate());
        else if (rangeStr === 'YTD') startDt = new Date(lastDt.getFullYear(), 0, 1);

        const fmtDt = d => d.toISOString().split('T')[0];
        if (rangeStr === 'MAX') {
            chart.timeScale().fitContent();
        } else {
            chart.timeScale().setVisibleRange({ from: fmtDt(startDt), to: fmtDt(lastDt) });
        }
    }

    // ============================================
    // Helpers
    // ============================================
    function fmt(n) { return typeof n === 'number' && !isNaN(n) ? n.toLocaleString('pl-PL', { maximumFractionDigits: 0 }) : '—'; }
    function fmtPct(n) { return typeof n === 'number' && !isNaN(n) ? (n > 0 ? '+' : '') + n.toFixed(1) + '%' : '—'; }
    function fmtVal(n) { return typeof n === 'number' && !isNaN(n) ? n.toLocaleString('pl-PL', { maximumFractionDigits: 0 }) : '—'; }
    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function updateChartFavBtn() {
        if (!currentInst) return;
        const f = isFav(currentInst.code);
        el.chartFavBtn.classList.toggle('active', f);
        el.chartFavBtn.querySelector('svg').setAttribute('fill', f ? 'currentColor' : 'none');
    }

    // ============================================
    // Events
    // ============================================
    el.search.oninput = () => { el.clearSearch.style.display = el.search.value ? 'block' : 'none'; renderGrid(); };
    el.clearSearch.onclick = () => { el.search.value = ''; el.clearSearch.style.display = 'none'; renderGrid(); };
    el.backBtn.onclick = goBack;
    el.chartFavBtn.onclick = () => { if (currentInst) { toggleFav(currentInst.code); updateChartFavBtn(); } };
    el.invL.onclick = () => { invertL = !invertL; el.invL.classList.toggle('active', invertL); rebuildChart(); };
    el.invR.onclick = () => { invertR = !invertR; el.invR.classList.toggle('active', invertR); rebuildChart(); };
    el.addBtn.onclick = () => { el.addPanel.style.display = el.addPanel.style.display === 'none' ? 'flex' : 'none'; };
    el.cancelAdd.onclick = () => { el.addPanel.style.display = 'none'; };
    el.confirmAdd.onclick = addSeriesFromPanel;
    $$('.axis-btn').forEach(b => { b.onclick = () => { $$('.axis-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); }; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && el.chartView.classList.contains('active')) goBack(); });

    async function togglePriceSeries(ticker, forceAdd = false) {
        if (!ticker) return;
        const existingIdx = activeSeries.findIndex(s => s.rpt === 'external' && s.key === ticker);

        if (existingIdx >= 0 && !forceAdd) {
            activeSeries.splice(existingIdx, 1);
            el.btnTogglePrice.classList.remove('active');
            renderChips();
            rebuildChart();
        } else if (existingIdx < 0) {
            const success = await fetchYahooPrice(ticker);
            if (success) {
                activeSeries.forEach(s => {
                    if (s.rpt !== 'external') s.axis = 'left';
                });
                activeSeries.push({ key: ticker, rpt: 'external', axis: 'right', color: '#64748b', label: `${ticker} Close` });
                el.btnTogglePrice.classList.add('active');
                renderChips();
                rebuildChart();
            }
        }
    }

    el.btnTogglePrice.onclick = () => {
        const ticker = el.btnTogglePrice.dataset.ticker;
        togglePriceSeries(ticker);
    };

    if (el.btnToggleDelta) {
        el.btnToggleDelta.onclick = () => {
            showDelta = !showDelta;
            el.btnToggleDelta.classList.toggle('active', showDelta);
            rebuildChart();
        };
    }

    if (el.btnToggleOptions) {
        el.btnToggleOptions.onclick = () => {
            showOptionsImpact = !showOptionsImpact;
            el.btnToggleOptions.classList.toggle('active', showOptionsImpact);
            rebuildOptionsImpactChart();
        };
    }

    // Data Type toggle (Futures / Combined)
    if (el.dataTypeBtns && el.dataTypeBtns.length) {
        el.dataTypeBtns.forEach(b => {
            b.onclick = () => {
                const dtype = b.dataset.dtype;
                if (dtype === currentDataType) return;
                currentDataType = dtype;
                el.dataTypeBtns.forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                // Update all non-external, non-cross activeSeries to new source
                activeSeries.forEach(s => {
                    if (s.rpt !== 'external' && !s.crossCode) s.sourceType = dtype;
                });
                applySimplifiedSelection();
                renderReportingTable();
                renderPieCharts();
            };
        });
    }

    // Add-series source toggle (Futures Only / Combined)
    if (el.addSrcBtns && el.addSrcBtns.length) {
        el.addSrcBtns.forEach(b => {
            b.onclick = () => {
                addSeriesSourceType = b.dataset.src;
                el.addSrcBtns.forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                populateAddSelect();
            };
        });
    }

    // Language toggle
    if (el.langToggleBtns && el.langToggleBtns.length) {
        el.langToggleBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.lang === currentLang);
            b.onclick = () => setLang(b.dataset.lang);
        });
    }

    // Quick Selector Events (cbar-btn)
    if (el.reportTypeBtns) {
        el.reportTypeBtns.forEach(b => {
            b.onclick = () => {
                el.reportTypeBtns.forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                applySimplifiedSelection(true); // Reset switch field
            };
        });
    }

    if (el.posTypeBtns) {
        el.posTypeBtns.forEach(b => {
            b.onclick = () => {
                const pos = b.dataset.pos;
                const activeBefore = b.classList.contains('active');

                if (pos === 'net') {
                    // Kliknięcie Netto zawsze wyłącza Long/Short i włącza tylko Netto
                    el.posTypeBtns.forEach(x => x.classList.remove('active'));
                    b.classList.add('active');
                } else {
                    // Kliknięcie Long lub Short
                    // 1. Wyłącz netto
                    const netBtn = Array.from(el.posTypeBtns).find(x => x.dataset.pos === 'net');
                    if (netBtn) netBtn.classList.remove('active');

                    // 2. Przełącz obecny (toggle)
                    b.classList.toggle('active');

                    // 3. Sprawdź czy cokolwiek z (long/short) jest aktywne. Jeśli nie - przywróć ten kliknięty
                    const activeOthers = Array.from(el.posTypeBtns).filter(x => x.dataset.pos !== 'net' && x.classList.contains('active'));
                    if (activeOthers.length === 0) {
                        b.classList.add('active');
                    }
                }
                applySimplifiedSelection();
            };
        });
    }

    // ── Drawer open/close ──
    function openDrawer(tab) {
        el.drawer.classList.add('open');
        el.drawerBackdrop.classList.add('open');
        el.settingsToggle.classList.add('open');
        if (tab) switchDrawerTab(tab);
    }
    function closeDrawer() {
        el.drawer.classList.remove('open');
        el.drawerBackdrop.classList.remove('open');
        el.settingsToggle.classList.remove('open');
    }
    function switchDrawerTab(tabId) {
        el.drawerTabs.forEach(t => t.classList.toggle('active', t.dataset.dtab === tabId));
        el.drawerPanels.forEach(p => p.classList.toggle('active', p.id === 'dtab-' + tabId));
    }

    if (el.settingsToggle) {
        el.settingsToggle.onclick = (e) => {
            e.stopPropagation();
            el.drawer.classList.contains('open') ? closeDrawer() : openDrawer('settings');
        };
    }
    if (el.drawerClose) el.drawerClose.onclick = closeDrawer;
    if (el.drawerBackdrop) el.drawerBackdrop.onclick = closeDrawer;
    el.drawerTabs.forEach(tab => {
        tab.onclick = () => switchDrawerTab(tab.dataset.dtab);
    });

    // Mobile category dropdown
    if (el.catMobileToggle) {
        el.catMobileToggle.onclick = (e) => {
            e.stopPropagation();
            const dd = el.catMobileDropdown;
            const isOpen = dd.style.display === 'block';
            dd.style.display = isOpen ? 'none' : 'block';
            el.catMobileToggle.classList.toggle('open', !isOpen);
        };
        document.addEventListener('click', (e) => {
            if (el.catMobileDropdown && !el.catMobileDropdown.contains(e.target) && e.target !== el.catMobileToggle) {
                el.catMobileDropdown.style.display = 'none';
                el.catMobileToggle.classList.remove('open');
            }
        });
    }

    // Fullscreen toggle
    if (el.fullscreenBtn) {
        el.fullscreenBtn.onclick = () => {
            const fsTarget = el.fullscreenContainer;
            if (!document.fullscreenElement) {
                fsTarget.requestFullscreen().catch(err => {
                    console.error(`Error: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        };

        document.addEventListener('fullscreenchange', () => {
            const isFS = !!document.fullscreenElement;
            el.fullscreenBtn.title = isFS ? 'Wyjdź z Pełnego Ekranu' : 'Pełny Ekran';
            el.fullscreenBtn.classList.toggle('active', isFS);
        });
    }

    // Quick Filters Menu Toggle
    if (el.qfToggle) {
        el.qfToggle.onclick = (e) => {
            e.stopPropagation();
            const isOpen = el.qfMenu.style.display === 'block';
            el.qfMenu.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) {
                buildQuickFiltersMenu();
            }
        };
        document.addEventListener('click', (e) => {
            if (el.qfMenu && el.qfMenu.style.display === 'block' && !el.qfMenu.contains(e.target) && !el.qfToggle.contains(e.target)) {
                el.qfMenu.style.display = 'none';
            }
        });
    }

    // Quick Filters Options
    const quickFiltersMap = {
        'legacy': {
            'Tylko Non-Commercial (Duzi)': ['noncomm', '_net_nc'],
            'Tylko Commercial (Komercyjni)': ['comm_positions', '_net_co'],
            'Tylko Nonreportable (Drobni)': ['nonrept', '_net_nr']
        },
        'disaggregated': {
            'Producenci i Dealerzy (PMPU)': ['prod_merc', '_net_pm'],
            'Dealerzy Swap (Swap)': ['swap_positions', '_net_sw'],
            'Zarządzający Kapitałem (Money)': ['m_money', '_net_mm'],
            'Inni Raportujący (Other)': ['other_rept', '_net_or'],
            'Tylko Nonreportable (Drobni)': ['nonrept', '_net_nrd']
        },
        'tff': {
            'Dealer Intermediary': ['dealer_positions', '_net_dl'],
            'Zarządzający Majątkiem (Asset)': ['asset_mgr', '_net_am'],
            'Fundusze Lewarowane (Lev)': ['lev_money', '_net_lf'],
            'Inni Raportujący (Other)': ['other_rept', '_net_or2'],
            'Tylko Nonreportable (Drobni)': ['nonrept', '_net_nrt']
        }
    };

    function buildQuickFiltersMenu() {
        if (!currentInst) return;
        const btnLegacyData = el.reportTypeBtns[0].classList.contains('active');
        let rptType = btnLegacyData ? 'legacy' : 'disaggregated';
        if (!btnLegacyData && !currentInst.reports.disaggregated && currentInst.reports.tff) {
            rptType = 'tff';
        } else if (!btnLegacyData && !currentInst.reports.disaggregated && !currentInst.reports.tff) {
            rptType = 'legacy'; // Fallback
        }

        const options = quickFiltersMap[rptType] || {};
        let html = `<button class="qf-item ${!currentQuickFilterKeys ? 'active' : ''}" data-keys="all">${t('Wszystkie grupy (Reset)')}</button>`;
        for (const [label, keys] of Object.entries(options)) {
            const isActive = currentQuickFilterKeys && keys.join(',') === currentQuickFilterKeys.join(',');
            html += `<button class="qf-item ${isActive ? 'active' : ''}" data-keys="${keys.join(',')}">${t(label)}</button>`;
        }
        el.qfOptions.innerHTML = html;

        el.qfOptions.querySelectorAll('.qf-item').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                el.qfMenu.style.display = 'none';
                applyQuickFilterHover(btn.dataset.keys);
            };
        });
    }

    function applyQuickFilterHover(keysParam) {
        if (keysParam === 'all') {
            currentQuickFilterKeys = null;
        } else {
            currentQuickFilterKeys = keysParam.split(',');
        }
        applySimplifiedSelection();
    }

    // Cross-instrument search
    let crossSelectedInstr = null;
    if (el.crossSearch) {
        el.crossSearch.oninput = () => {
            const q = el.crossSearch.value.trim().toLowerCase();
            if (!q || q.length < 2) {
                el.crossResults.innerHTML = `<div class="cross-results-empty">${t('Wpisz minimum 2 znaki...')}</div>`;
                return;
            }
            const hits = instruments.filter(i =>
                (i.name + ' ' + i.exchange).toLowerCase().includes(q)
            ).slice(0, 12);
            if (!hits.length) {
                el.crossResults.innerHTML = `<div class="cross-results-empty">${t('Brak wyników')}</div>`;
                return;
            }
            el.crossResults.innerHTML = hits.map(i =>
                `<div class="cross-result-item${crossSelectedInstr && crossSelectedInstr.code === i.code ? ' selected' : ''}" data-code="${i.code}">
                    <span class="cross-result-name">${esc(i.name)}</span>
                    <span class="cross-result-sub">${esc(i.exchange)}</span>
                </div>`
            ).join('');
            el.crossResults.querySelectorAll('.cross-result-item').forEach(item => {
                item.onclick = () => {
                    crossSelectedInstr = instruments.find(i => i.code === item.dataset.code);
                    if (!crossSelectedInstr) return;
                    // Show series section
                    el.crossInstrName.textContent = crossSelectedInstr.name;
                    el.crossSection.style.display = 'block';
                    // Populate series select
                    let html = `<option value="">${t('Wybierz serię...')}</option>`;
                    for (const [rpt, cfg] of Object.entries(SERIES)) {
                        if (!crossSelectedInstr.reports[rpt]) continue;
                        html += `<optgroup label="── ${t(cfg.label)} ──">`;
                        cfg.fields.forEach(f => {
                            html += `<option value="${rpt}::${f.key}">${t(f.label)}</option>`;
                        });
                        html += '</optgroup>';
                    }
                    el.crossSelect.innerHTML = html;
                    // Mark selected
                    el.crossResults.querySelectorAll('.cross-result-item').forEach(x =>
                        x.classList.toggle('selected', x.dataset.code === crossSelectedInstr.code)
                    );
                };
            });
        };
    }

    if (el.confirmCross) {
        el.confirmCross.onclick = async () => {
            if (!crossSelectedInstr || !el.crossSelect.value) return;
            const [rpt, key] = el.crossSelect.value.split('::');
            // Need to load data for that instrument
            const axBtn = document.querySelector('.cross-axis-btn.active');
            const axis = axBtn ? axBtn.dataset.axis : 'right';
            // Load if not cached
            if (!chartData['cross_' + crossSelectedInstr.code]) {
                try {
                    el.chartLoad.style.display = 'flex';
                    const EP_MAP = { legacy: '6dca-aqww', disaggregated: '72hh-3qpy', tff: 'gpe5-46if' };
                    const fields = SERIES[rpt].fields.filter(f => !f.comp).map(f => f.key);
                    const sel = ['report_date_as_yyyy_mm_dd', ...fields].join(',');
                    const url = `${API}/${EP_MAP[rpt]}.json?$select=${sel}&$where=cftc_contract_market_code='${crossSelectedInstr.code}' AND futonly_or_combined='FutOnly'&$order=report_date_as_yyyy_mm_dd ASC&$limit=50000`;
                    const r = await fetch(url);
                    const data = await r.json();
                    data.forEach(row => {
                        fields.forEach(f => row[f] = N(row[f]));
                        SERIES[rpt].fields.filter(f => f.comp).forEach(f => { row[f.key] = f.comp(row); });
                    });
                    if (!chartData['cross_' + crossSelectedInstr.code]) chartData['cross_' + crossSelectedInstr.code] = {};
                    chartData['cross_' + crossSelectedInstr.code][rpt] = data;
                } catch (e) {
                    alert('Nie udało się pobrać danych dla: ' + crossSelectedInstr.name);
                    return;
                } finally {
                    el.chartLoad.style.display = 'none';
                }
            }
            const fld = SERIES[rpt].fields.find(f => f.key === key);
            const label = fld ? fld.label : key;
            activeSeries.push({
                key, rpt,
                axis,
                color: COLORS[activeSeries.length % COLORS.length],
                crossCode: crossSelectedInstr.code,
                crossRpt: rpt,
                label: `${crossSelectedInstr.name.substring(0, 20)}: ${label}`
            });
            // Patch rebuildChart to handle cross-instrument data
            renderChips();
            rebuildChart();
            closeDrawer();
        };
    }

    document.querySelectorAll('.cross-axis-btn').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.cross-axis-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
        };
    });

    // Multiplier Toggle
    el.btnMul1.onclick = () => {
        if (valueMultiplier === 1) return;
        valueMultiplier = 1;
        el.btnMul1.classList.add('active'); el.btnMulSize.classList.remove('active');
        rebuildChart(); renderReportingTable(); renderPieCharts();
    };
    el.btnMulSize.onclick = () => {
        if (!currentInst) return;
        const mul = parseMultiplier(currentInst.units);
        if (valueMultiplier === mul) return;
        valueMultiplier = mul;
        el.btnMulSize.classList.add('active'); el.btnMul1.classList.remove('active');
        rebuildChart(); renderReportingTable(); renderPieCharts();
    };

    // Period Toggle
    $$('.period-btn').forEach(b => {
        b.onclick = () => {
            tablePeriod = b.dataset.period;
            $$('.period-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            renderReportingTable();
        };
    });

    // Initial load
    currentRange = '3Y';
    // Set 3Y as default active
    el.ranges.forEach(b => b.classList.toggle('active', b.dataset.range === '3Y'));

    // Resizers setup
    function setupResizer(resizerId, containerId, minHeight) {
        const resizer = document.getElementById(resizerId);
        const container = document.getElementById(containerId);
        if (!resizer || !container) return;

        let startY, startH;
        resizer.addEventListener('mousedown', function (e) {
            e.preventDefault();
            startY = e.clientY;
            startH = container.clientHeight;
            document.body.style.cursor = 'ns-resize';

            function doDrag(e) {
                const newH = Math.max(minHeight, startH + e.clientY - startY);
                container.style.height = newH + 'px';
            }
            function stopDrag() {
                document.removeEventListener('mousemove', doDrag);
                document.removeEventListener('mouseup', stopDrag);
                document.body.style.cursor = '';
            }
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('mouseup', stopDrag);
        });
    }

    setupResizer('main-resizer', 'chart-container', 200);
    setupResizer('delta-resizer', 'delta-chart-container', 80);
    setupResizer('options-resizer', 'options-chart-container', 80);
    setupResizer('prop-resizer', 'prop-chart-container', 80);

    // ── Init ──
    applyI18n();
    loadAll();
})();

