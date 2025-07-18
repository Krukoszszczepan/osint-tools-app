/**
 * @file Skrypt do obsługi interaktywnej bazy narzędzi OSINT.
 * @version 6.1.0
 * @description Wersja premium z płynnymi przejściami, kaskadowymi animacjami kart, debouncingiem wyszukiwania,
 *              kompletną i zoptymalizowaną logiką kategorii oraz ulepszoną wydajnością.
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- Elementy DOM ---
    const dom = {
        sidebar: document.getElementById('sidebar'),
        mindmapRoot: document.getElementById('mindmap-root'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        themeSwitcher: document.getElementById('theme-switcher'),
        searchInput: document.getElementById('searchInput'),
        contentArea: document.getElementById('content-area'),
        toolsContainer: document.getElementById('tools-container'),
        categoryTitle: document.getElementById('current-category-title'),
        toolCount: document.getElementById('tool-count'),
        viewGridBtn: document.getElementById('view-grid-btn'),
        viewListBtn: document.getElementById('view-list-btn'),
        randomToolBtn: document.getElementById('random-tool-btn'),
        modalContainer: document.getElementById('modal-container'),
        modalBody: document.getElementById('modal-body'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        body: document.body,
    };

    // --- Stan aplikacji i dane ---
    let allTools = [];
    const colorPalette = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const categoryColors = {};
    let colorIndex = 0;
    let currentRenderTimeout;

    // --- Funkcje Pomocnicze (LocalStorage, Debounce, itp.) ---
    const ls = {
        get: (key, fallback) => {
            const value = localStorage.getItem(key);
            if (value == null) return fallback;
            try { return JSON.parse(value); } catch (e) { return value; }
        },
        set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    };
    
    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const getFavorites = () => ls.get('favorites', []);
    const getRatings = () => ls.get('ratings', {});
    const getClickCounts = () => ls.get('clickCounts', {});
    const getViewMode = () => ls.get('viewMode', 'grid');
    const getExpandedSuperGroups = () => ls.get('expandedSuperGroups', ['DZIEDZINY OSINT']);

    const highlightText = (text, searchTerm) => {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    // --- Inicjalizacja Podstawowych Funkcji (Motyw, Widok) ---
    (() => {
        const savedTheme = ls.get('theme', 'dark');
        dom.body.classList.toggle('light-theme', savedTheme === 'light');

        dom.themeSwitcher.addEventListener('click', () => {
            dom.body.classList.toggle('light-theme');
            ls.set('theme', dom.body.classList.contains('light-theme') ? 'light' : 'dark');
        });

        if (getViewMode() === 'list') {
            dom.toolsContainer.className = 'tools-container tools-list';
            dom.viewGridBtn.classList.remove('active');
            dom.viewListBtn.classList.add('active');
        } else {
             dom.toolsContainer.className = 'tools-container tools-grid';
        }

        dom.viewGridBtn.addEventListener('click', () => switchView('grid'));
        dom.viewListBtn.addEventListener('click', () => switchView('list'));
        dom.mobileMenuBtn.addEventListener('click', () => dom.sidebar.classList.toggle('is-open'));
        dom.modalCloseBtn.addEventListener('click', () => dom.modalContainer.classList.remove('is-open'));
        dom.randomToolBtn.addEventListener('click', showRandomTool);
    })();

    function switchView(mode) {
        dom.toolsContainer.className = `tools-container tools-${mode}`; // Dodajemy klasę bazową
        dom.viewGridBtn.classList.toggle('active', mode === 'grid');
        dom.viewListBtn.classList.toggle('active', mode === 'list');
        ls.set('viewMode', mode);
    }

    // --- KOMPLETNA I ZOPTYMALIZOWANA STRUKTURA KATEGORII ---
    const superCategoryConfig = {
        'osint_domains': { name: 'DZIEDZINY OSINT', icon: 'fas fa-search-location' },
        'technical_analysis': { name: 'ANALIZA TECHNICZNA I CYBERSEC', icon: 'fas fa-shield-virus' },
        'analyst_workshop': { name: 'WARSZTAT ANALITYKA', icon: 'fas fa-tools' },
        'polish_sources': { name: '🇵🇱 POLSKIE ŹRÓDŁA', icon: 'fas fa-flag' }
    };
    
    const categoryMappings = {
        'username-search-engines': { main: 'Wyszukiwanie Nazw Użytkownika', super: 'osint_domains' },
        'email-search': { main: 'Email Intelligence', super: 'osint_domains' },
        'common-email-formats': { main: 'Email Intelligence', super: 'osint_domains' },
        'email-verification': { main: 'Email Intelligence', super: 'osint_domains' },
        'breach-data': { main: 'Wycieki Danych', super: 'osint_domains' },
        'general-people-search': { main: 'Wyszukiwarki Osób', super: 'osint_domains' },
        'registries': { main: 'Rejestry Osób', super: 'osint_domains' },
        'dating': { main: 'Serwisy Randkowe', super: 'osint_domains' },
        'telephone-numbers': { main: 'Numery Telefonów', super: 'osint_domains' },
        'voicemail': { main: 'Poczta Głosowa', super: 'osint_domains' },
        'birth-records': { main: 'Akta Urodzenia', super: 'osint_domains' },
        'death-records': { main: 'Akta Zgonu', super: 'osint_domains' },
        'search': { main: 'Wyszukiwarki Mediów', super: 'osint_domains' },
        'image-search': { main: 'Wyszukiwarki Obrazów', super: 'osint_domains' },
        'instagram': { main: 'Instagram', super: 'osint_domains' },
        'flickr': { main: 'Flickr', super: 'osint_domains' },
        'metadata': { main: 'Analiza Metadanych', super: 'osint_domains' },
        'forensics': { main: 'Analiza Śledcza Obrazów', super: 'osint_domains' },
        'pictures': { main: 'Narzędzia do Obrazów (OCR)', super: 'osint_domains' },
        'location--mapping': { main: 'Mapowanie i Geolokalizacja', super: 'osint_domains' },
        'videos': { main: 'Wideo', super: 'osint_domains' },
        'analyze--record': { main: 'Analiza i Nagrywanie Wideo', super: 'osint_domains' },
        'webcams': { main: 'Kamery Internetowe', super: 'osint_domains' },
        'property-records': { main: 'Rejestry Nieruchomości', super: 'osint_domains' },
        'court--criminal-records': { main: 'Rejestry Sądowe i Karne', super: 'osint_domains' },
        'government-records': { main: 'Rejestry Rządowe', super: 'osint_domains' },
        'financial--tax-resources': { main: 'Zasoby Finansowe i Podatkowe', super: 'osint_domains' },
        'us-county-data': { main: 'Dane Hrabstw (USA)', super: 'osint_domains' },
        'us-voter-records': { main: 'Rejestry Wyborców (USA)', super: 'osint_domains' },
        'patent-records': { main: 'Rejestry Patentowe', super: 'osint_domains' },
        'us-political-records': { main: 'Rejestry Polityczne (USA)', super: 'osint_domains' },
        'public-records': { main: 'Rejestry Publiczne', super: 'osint_domains' },
        'annual-reports': { main: 'Raporty Roczne Firm', super: 'osint_domains' },
        'general-info--news': { main: 'Informacje Ogólne i Wiadomości', super: 'osint_domains' },
        'company-profiles': { main: 'Profile Firm', super: 'osint_domains' },
        'employee-profiles--resumes': { main: 'Profile Pracowników i CV', super: 'osint_domains' },
        'additional-resources': { main: 'Dodatkowe Zasoby', super: 'osint_domains' },
        'vehicle-records': { main: 'Rejestry Pojazdów', super: 'osint_domains' },
        'air-traffic-records': { main: 'Rejestry Ruchu Lotniczego', super: 'osint_domains' },
        'marine-records': { main: 'Rejestry Morskie', super: 'osint_domains' },
        'railway-records': { main: 'Rejestry Kolejowe', super: 'osint_domains' },
        'transportation': { main: 'Transport', super: 'osint_domains' },
        'geolocation-tools': { main: 'Narzędzia Geolokalizacyjne', super: 'osint_domains' },
        'coordinates': { main: 'Współrzędne', super: 'osint_domains' },
        'map-locations': { main: 'Mapowanie Lokalizacji', super: 'osint_domains' },
        'map-reporting-tools': { main: 'Narzędzia do Raportowania na Mapach', super: 'osint_domains' },
        'mobile-coverage': { main: 'Zasięg Sieci Komórkowej', super: 'osint_domains' },
        'geolocation-tools--maps': { main: 'Mapy i Narzędzia Geolokalizacyjne', super: 'osint_domains' },
        'whois-records': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'subdomains': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'discovery': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'certificate-search': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'passivedns': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'host--port-discovery': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'ipv4': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'ipv6': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'bgp': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'dnssec': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'cloud-resources': { main: 'Infrastruktura Sieciowa', super: 'technical_analysis' },
        'network-analysis-tools': { main: 'Analiza Ruchu Sieciowego', super: 'technical_analysis' },
        'reputation': { main: 'Reputacja i Analiza Zagrożeń', super: 'technical_analysis' },
        'mail-blacklists': { main: 'Reputacja i Analiza Zagrożeń', super: 'technical_analysis' },
        'domain-blacklists': { main: 'Reputacja i Analiza Zagrożeń', super: 'technical_analysis' },
        'typosquatting': { main: 'Reputacja i Analiza Zagrożeń', super: 'technical_analysis' },
        'scanners': { main: 'Skanery Podatności', super: 'technical_analysis' },
        'disclosure-sites': { main: 'Strony Ujawniające Luki', super: 'technical_analysis' },
        'vulnerabilities': { main: 'Podatności', super: 'technical_analysis' },
        'report-malicious-sites': { main: 'Zgłaszanie Złośliwych Stron', super: 'technical_analysis' },
        'malicious-file-analysis': { main: 'Analiza Złośliwych Plików', super: 'technical_analysis' },
        'default-passwords': { main: 'Domyślne Hasła', super: 'technical_analysis' },
        'exploits--advisories': { main: 'Exploity i Ostrzeżenia', super: 'technical_analysis' },
        'phishing': { main: 'Phishing', super: 'technical_analysis' },
        'ioc-tools': { main: 'Narzędzia IOC', super: 'technical_analysis' },
        'ttps': { main: 'Taktyki, Techniki, Procedury (TTP)', super: 'technical_analysis' },
        'threat-intelligence': { main: 'Wywiad o Zagrożeniach', super: 'technical_analysis' },
        'office-files': { main: 'Analiza Plików Office', super: 'technical_analysis' },
        'pdfs': { main: 'Analiza Plików PDF', super: 'technical_analysis' },
        'android': { main: 'Analiza Aplikacji Android', super: 'technical_analysis' },
        'hosted-automated-analysis': { main: 'Zautomatyzowana Analiza Online', super: 'technical_analysis' },
        'pcaps': { main: 'Analiza Ruchu Sieciowego (PCAP)', super: 'technical_analysis' },
        'analytics': { main: 'Analiza Stron WWW', super: 'technical_analysis' },
        'change-detection': { main: 'Wykrywanie Zmian na Stronach', super: 'technical_analysis' },
        'web': { main: 'Archiwa Internetu', super: 'technical_analysis' },
        'web-browsing': { main: 'Narzędzia Przeglądarkowe', super: 'technical_analysis' },
        'bitcoin': { main: 'Kryptowaluty', super: 'technical_analysis' },
        'ethereum': { main: 'Kryptowaluty', super: 'technical_analysis' },
        'monero': { main: 'Kryptowaluty', super: 'technical_analysis' },
        'tools': { main: 'Narzędzia Ogólne', super: 'analyst_workshop' },
        'url-expanders': { main: 'Rozwijanie Skróconych Linków', super: 'analyst_workshop' },
        'barcodes--qr': { main: 'Kody Kreskowe i QR', super: 'analyst_workshop' },
        'javascript': { main: 'Analiza Kodu', super: 'analyst_workshop' },
        'php': { main: 'Analiza Kodu', super: 'analyst_workshop' },
        'unix': { main: 'Analiza Kodu', super: 'analyst_workshop' },
        'windows': { main: 'Analiza Kodu', super: 'analyst_workshop' },
        'python': { main: 'Analiza Kodu', super: 'analyst_workshop' },
        'encoding--decoding': { main: 'Kodowanie i Dekodowanie', super: 'analyst_workshop' },
        'osint-automation': { main: 'Automatyzacja OSINT', super: 'analyst_workshop' },
        'pentesting-recon': { main: 'Rekonesans Pentestingowy', super: 'analyst_workshop' },
        'virtual-machines': { main: 'Maszyny Wirtualne i Systemy', super: 'analyst_workshop' },
        'wordlist': { main: 'Listy Słów (Wordlists)', super: 'analyst_workshop' },
        'ai-tools': { main: 'Narzędzia AI', super: 'analyst_workshop' },
        'ai-directories': { main: 'Narzędzia AI', super: 'analyst_workshop' },
        'emulation-tools': { main: 'Emulatory', super: 'analyst_workshop' },
        'screen-capture': { main: 'Przechwytywanie Ekranu', super: 'analyst_workshop' },
        'social-analysis': { main: 'Analiza Społecznościowa', super: 'analyst_workshop' },
        'general-search': { main: 'Wyszukiwarki Ogólne', super: 'analyst_workshop' },
        'meta-search': { main: 'Metawyszukiwarki', super: 'analyst_workshop' },
        'code-search': { main: 'Wyszukiwarki Kodu', super: 'analyst_workshop' },
        'ftp-search': { main: 'Wyszukiwarki FTP', super: 'analyst_workshop' },
        'academic--publication-search': { main: 'Wyszukiwarki Naukowe', super: 'analyst_workshop' },
        'news-search': { main: 'Wyszukiwarki Wiadomości', super: 'analyst_workshop' },
        'other-search': { main: 'Inne Wyszukiwarki', super: 'analyst_workshop' },
        'search-tools': { main: 'Narzędzia Wyszukiwania', super: 'analyst_workshop' },
        'search-engine-guides': { main: 'Poradniki Wyszukiwania', super: 'analyst_workshop' },
        'fact-checking': { main: 'Weryfikacja Faktów', super: 'analyst_workshop' },
        'forum-search-engines': { main: 'Wyszukiwarki Forów', super: 'analyst_workshop' },
        'blog-search-engines': { main: 'Wyszukiwarki Blogów', super: 'analyst_workshop' },
        'irc-search': { main: 'Wyszukiwarki IRC', super: 'analyst_workshop' },
        'other-media': { main: 'Inne Media', super: 'analyst_workshop' },
        'text': { main: 'Narzędzia Tekstowe', super: 'analyst_workshop' },
        'fonts': { main: 'Czcionki', super: 'analyst_workshop' },
        'data-leaks': { main: 'Wycieki Danych (Bazy)', super: 'analyst_workshop' },
        'public-datasets': { main: 'Publiczne Zbiory Danych', super: 'analyst_workshop' },
        'games': { main: 'Gry i Trening', super: 'analyst_workshop' },
        'training': { main: 'Szkolenia', super: 'analyst_workshop' },
        'blogi': { main: 'Blogi i Newslettery', super: 'analyst_workshop' },
        'newslettery': { main: 'Blogi i Newslettery', super: 'analyst_workshop' },
        'kursy--prezentacje': { main: 'Kursy i Prezentacje', super: 'analyst_workshop' },
        'literatura': { main: 'Literatura', super: 'analyst_workshop' },
        'persona-creation': { main: 'Tworzenie Person', super: 'analyst_workshop' },
        'anonymous-vpns': { main: 'Anonimowe VPN', super: 'analyst_workshop' },
        'spoof-user-agent': { main: 'Spoofing User-Agent', super: 'analyst_workshop' },
        'vpn-tests': { main: 'Testy VPN i Proxy', super: 'analyst_workshop' },
        'proxy-tests': { main: 'Testy VPN i Proxy', super: 'analyst_workshop' },
        'anonymous-browsing': { main: 'Anonimowe Przeglądanie', super: 'analyst_workshop' },
        'privacy--clean-up': { main: 'Prywatność i Usuwanie Danych', super: 'analyst_workshop' },
        'metadata--style': { main: 'Anonimizacja Metadanych', super: 'analyst_workshop' },
        'tor': { main: 'Sieć TOR', super: 'analyst_workshop' },
        'tor-search': { main: 'Wyszukiwarki TOR', super: 'analyst_workshop' },
        'tor-directories': { main: 'Katalogi TOR', super: 'analyst_workshop' },
        'dark-web': { main: 'Dark Web', super: 'analyst_workshop' },
        'tymczasowe-skrzynki-e-mail': { main: 'Tymczasowe Adresy E-mail', super: 'analyst_workshop' },
        'adresy-e-mail': { main: 'Dane Kontaktowe', super: 'polish_sources' },
        'numery-telefonow--ksiazki-telefoniczne': { main: 'Dane Kontaktowe', super: 'polish_sources' },
        'rejestry': { main: 'Rejestry Firm i Działalności', super: 'polish_sources' },
        'biznes--gospodarka': { main: 'Rejestry Firm i Działalności', super: 'polish_sources' },
        'przetargi': { main: 'Rejestry Firm i Działalności', super: 'polish_sources' },
        'gieldy-dlugow': { main: 'Rejestry Firm i Działalności', super: 'polish_sources' },
        'gielda': { main: 'Rejestry Firm i Działalności', super: 'polish_sources' },
        'opinie': { main: 'Rejestry Firm i Działalności', super: 'polish_sources' },
        'branzowe': { main: 'Rejestry Firm i Działalności', super: 'polish_sources' },
        'rejestry-publiczne': { main: 'Rejestry Publiczne', super: 'polish_sources' },
        'whois': { main: 'Domeny i Sieć', super: 'polish_sources' },
        'domeny': { main: 'Domeny i Sieć', super: 'polish_sources' },
        'listy--rejestry': { main: 'Domeny i Sieć', super: 'polish_sources' },
        'skracacze': { main: 'Domeny i Sieć', super: 'polish_sources' },
        'osoby': { main: 'Dane Osobowe i Rejestry', super: 'polish_sources' },
        'nazwiska': { main: 'Dane Osobowe i Rejestry', super: 'polish_sources' },
        'genealogia': { main: 'Dane Osobowe i Rejestry', super: 'polish_sources' },
        'zmarli': { main: 'Dane Osobowe i Rejestry', super: 'polish_sources' },
        'medycyna': { main: 'Rejestry Zawodowe', super: 'polish_sources' },
        'prawo': { main: 'Rejestry Zawodowe', super: 'polish_sources' },
        'pozostale': { main: 'Rejestry Zawodowe', super: 'polish_sources' },
        'nauka': { main: 'Rejestry Zawodowe', super: 'polish_sources' },
        'geolokalizacja': { main: 'Mapy i Geolokalizacja', super: 'polish_sources' },
        'mapy--uslugi-lokalizacyjne': { main: 'Mapy i Geolokalizacja', super: 'polish_sources' },
        'historyczne': { main: 'Mapy i Geolokalizacja', super: 'polish_sources' },
        'miejskie-systemy-informacji-przestrzennej': { main: 'Mapy i Geolokalizacja', super: 'polish_sources' },
        'wojewodzkie-systemy-informacji-przestrzennej': { main: 'Mapy i Geolokalizacja', super: 'polish_sources' },
        'meteorologiczne': { main: 'Mapy i Geolokalizacja', super: 'polish_sources' },
        'serwisy-spolecznosciowe': { main: 'Społeczności i Fora', super: 'polish_sources' },
        'serwisy-randkowe': { main: 'Społeczności i Fora', super: 'polish_sources' },
        'seks': { main: 'Społeczności i Fora', super: 'polish_sources' },
        'fediwersum': { main: 'Społeczności i Fora', super: 'polish_sources' },
        'polityka': { main: 'Polityka i Religia', super: 'polish_sources' },
        'partie': { main: 'Polityka i Religia', super: 'polish_sources' },
        'diecezje': { main: 'Polityka i Religia', super: 'polish_sources' },
        'kosciol-katolicki': { main: 'Polityka i Religia', super: 'polish_sources' },
        'duchowienstwo': { main: 'Polityka i Religia', super: 'polish_sources' },
        'bezpieczenstwo-publiczne': { main: 'Bezpieczeństwo i Subkultury', super: 'polish_sources' },
        'spoleczenstwo': { main: 'Bezpieczeństwo i Subkultury', super: 'polish_sources' },
        'kosy--zgody--uklady': { main: 'Bezpieczeństwo i Subkultury', super: 'polish_sources' },
        'ustawki': { main: 'Bezpieczeństwo i Subkultury', super: 'polish_sources' },
        'kibice': { main: 'Bezpieczeństwo i Subkultury', super: 'polish_sources' },
        'subkultury': { main: 'Bezpieczeństwo i Subkultury', super: 'polish_sources' },
        'ladowy': { main: 'Transport', super: 'polish_sources' },
        'lotniczy': { main: 'Transport', super: 'polish_sources' },
        'morski': { main: 'Transport', super: 'polish_sources' },
        'rozkłady-jazdy': { main: 'Transport', super: 'polish_sources' },
        'lokalizacja-pojazdow': { main: 'Transport', super: 'polish_sources' },
        'tablice-rejestracyjne': { main: 'Transport', super: 'polish_sources' },
        'skradzione-pojazdy': { main: 'Transport', super: 'polish_sources' },
        'spotting': { main: 'Transport', super: 'polish_sources' },
        'miejscowosci': { main: 'Transport', super: 'polish_sources' },
        'allegro': { main: 'Handel i Przemysł', super: 'polish_sources' },
        'przemysl': { main: 'Handel i Przemysł', super: 'polish_sources' },
        'archiwa': { main: 'Język i Archiwa', super: 'polish_sources' },
        'jezyki--gwara': { main: 'Język i Archiwa', super: 'polish_sources' },
        'slang': { main: 'Język i Archiwa', super: 'polish_sources' },
        'symbolika': { main: 'Język i Archiwa', super: 'polish_sources' },
        'rejestry-zwierzat': { main: 'Inne Rejestry', super: 'polish_sources' },
        'przechowywanie': { main: 'Inne', super: 'polish_sources' },
        'wklejki': { main: 'Inne', super: 'polish_sources' },
        'kamery': { main: 'Inne', super: 'polish_sources' },
        'narzedzia': { main: 'Inne', super: 'polish_sources' },
        'platformy-sledcze': { main: 'Inne', super: 'polish_sources' },
        'linki-do-profili': { main: 'Dane Osobowe i Rejestry', super: 'polish_sources' },
        'classifieds': { main: 'Ogłoszenia i Handel', super: 'osint_domains' },
        'social-networking': { main: 'Sieci Społecznościowe', super: 'osint_domains' },
        'instant-messaging': { main: 'Komunikatory', super: 'osint_domains' },
        'streaming-video': { main: 'Wideo na Żywo', super: 'osint_domains' },
        'apps': { main: 'Aplikacje Mobilne', super: 'analyst_workshop' },
        'terrorism': { main: 'Terroryzm', super: 'technical_analysis' },
        'general-info': { main: 'Dark Web Info', super: 'analyst_workshop' },
        'specific-sites': { main: 'Wyszukiwanie na Konkretnych Stronach', super: 'osint_domains' },
        'blacklists': { main: 'Czarne Listy IP', super: 'technical_analysis' },
        'neighbor-domains': { main: 'Sąsiednie Domeny', super: 'technical_analysis' },
        'protected-by-cloud-services': { main: 'Usługi Chmurowe (Ochrona)', super: 'technical_analysis' },
        'wireless-network-info': { main: 'Sieci Bezprzewodowe', super: 'technical_analysis' },
        'wyszukiwanie': { main: 'Wyszukiwarki Mediów', super: 'osint_domains' },
        'analiza': { main: 'Analiza Wideo', super: 'osint_domains' },
        'wideo': { main: 'Wideo', super: 'osint_domains' },
        'paste-sites': { main: 'Serwisy typu Pastebin', super: 'analyst_workshop' },
        'profile': { main: 'Analiza Profili', super: 'osint_domains' },
        'hashtag': { main: 'Analiza Hashtagów', super: 'osint_domains' },
        'archive--deleted-tweets': { main: 'Archiwum Tweetów', super: 'osint_domains' },
        'reddit': { main: 'Reddit', super: 'osint_domains' },
        'linkedin': { main: 'LinkedIn', super: 'osint_domains' },
        'tiktok': { main: 'TikTok', super: 'osint_domains' },
        'bluesky': { main: 'Bluesky', super: 'osint_domains' },
        'steam-discord--gaming-networks': { main: 'Sieci Gamingowe', super: 'osint_domains' },
        'other-social-networks': { main: 'Inne Sieci Społecznościowe', super: 'osint_domains' },
        'skype': { main: 'Skype', super: 'osint_domains' },
        'snapchat': { main: 'Snapchat', super: 'osint_domains' },
        'kik': { main: 'Kik', super: 'osint_domains' },
        'yikyak': { main: 'Yik Yak', super: 'osint_domains' },
        'international': { main: 'Numery Międzynarodowe', super: 'osint_domains' },
        'generatory-danych--tozsamosci': { main: 'Tworzenie Person', super: 'analyst_workshop' }
    };
    
    // --- FUNKCJE RENDERUJĄCE ---

    /**
     * Tworzy kartę narzędzia.
     * @param {object} tool - Obiekt narzędzia.
     * @param {string} [searchTerm=''] - Opcjonalna fraza do podświetlenia.
     * @param {number} [index=0] - Indeks karty dla animacji.
     * @returns {string} Kod HTML karty narzędzia.
     */
    function generateToolCard(tool, searchTerm = '', index = 0) {
        const favorites = getFavorites();
        const ratings = getRatings();
        const color = categoryColors[tool.category_slug] || '#9ca3af';
        const isFavorite = favorites.includes(tool.name);
        const rating = ratings[tool.name] || 0;
        const isNew = tool.date_added && (new Date() - new Date(tool.date_added)) / (1000 * 60 * 60 * 24) < 30;
        
        const highlightedName = highlightText(tool.name, searchTerm);
        const highlightedDesc = highlightText(tool.description, searchTerm);

        return `
            <div class="tool-card" data-tool-name="${tool.name}" data-tool-url="${tool.url}" style="--card-index: ${index};">
                ${isNew ? '<span class="new-badge">Nowe!</span>' : ''}
                <div class="tool-card-main">
                    <div class="tool-card-header">
                        <h3>${highlightedName}</h3>
                        <button class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" title="Dodaj do ulubionych" aria-label="Dodaj do ulubionych">
                            <i class="fas fa-star" aria-hidden="true"></i>
                        </button>
                    </div>
                    <p class="tool-category" style="--card-accent-color: ${color};">${tool.category}</p>
                    <p class="tool-description">${highlightedDesc}</p>
                </div>
                <div class="tool-card-actions">
                    <div class="rating-stars" data-rating="${rating}" title="Oceń narzędzie">
                        ${[...Array(5)].map((_, i) => `<i class="fas fa-star ${i < rating ? 'is-rated' : ''}" aria-hidden="true"></i>`).join('')}
                    </div>
                    <div class="tool-actions-group">
                        <button class="copy-btn" title="Kopiuj URL" aria-label="Kopiuj adres URL narzędzia"><i class="fas fa-copy" aria-hidden="true"></i></button>
                        <a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="tool-link"><i class="fas fa-external-link-alt" aria-hidden="true"></i> Otwórz</a>
                    </div>
                </div>
            </div>`;
    }
    
    function buildMindmapNode(item, level = 0) {
        const node = document.createElement('div');
        node.className = `mindmap-node level-${level}`;
        const content = document.createElement('div');
        content.className = 'node-content';
        if (item.slug) content.dataset.slug = item.slug;
        content.dataset.name = item.name;
        if (level === 0) content.dataset.superCategory = item.key;
        if (level === 1) content.dataset.mainCategory = item.name;
        node.appendChild(content);

        const countSpan = item.count > 0 ? `<span class="node-count">(${item.count})</span>` : '';
        const itemIconHTML = item.icon ? `<i class="${item.icon}" aria-hidden="true"></i>` : '';
        const nameAndCount = `<span>${itemIconHTML}${item.name}</span>${countSpan}`;

        if (item.children && Object.keys(item.children).length > 0) {
            content.classList.add('is-expandable');
            const expanderIcon = `<i class="fas fa-angle-right" aria-hidden="true"></i>`;
            content.innerHTML = `${expanderIcon} ${nameAndCount}`;
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            const innerDiv = document.createElement('div');
            Object.values(item.children)
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(child => innerDiv.appendChild(buildMindmapNode(child, level + 1)));
            childrenContainer.appendChild(innerDiv);
            node.appendChild(childrenContainer);
            content.addEventListener('click', (e) => {
                e.stopPropagation(); 
                node.classList.toggle('is-expanded');
            });
        } else {
            content.innerHTML = nameAndCount;
        }
        content.addEventListener('click', handleCategorySelection);
        return node;
    }
    
    function generateMindmap() {
        dom.mindmapRoot.innerHTML = '';
        const categoryCounts = allTools.reduce((acc, tool) => {
            acc[tool.category_slug] = (acc[tool.category_slug] || 0) + 1;
            return acc;
        }, {});

        const mindmapData = {};
        const unmappedCategories = new Map();
        
        allTools.forEach(tool => {
            const mapping = categoryMappings[tool.category_slug];
            if (mapping) {
                const { main, super: superKey } = mapping;
                const superCat = superCategoryConfig[superKey];
                if (!mindmapData[superKey]) mindmapData[superKey] = { ...superCat, key: superKey, children: {}, count: 0 };
                if (!mindmapData[superKey].children[main]) mindmapData[superKey].children[main] = { name: main, children: {}, count: 0 };
                if (!mindmapData[superKey].children[main].children[tool.category_slug]) {
                    mindmapData[superKey].children[main].children[tool.category_slug] = {
                        name: tool.category, slug: tool.category_slug, count: categoryCounts[tool.category_slug] || 0
                    };
                }
            } else if (!unmappedCategories.has(tool.category_slug)) {
                unmappedCategories.set(tool.category_slug, {
                    name: tool.category, slug: tool.category_slug, count: categoryCounts[tool.category_slug] || 0
                });
            }
        });

        Object.values(mindmapData).forEach(superCat => {
            let superCount = 0;
            Object.values(superCat.children).forEach(mainCat => {
                mainCat.count = Object.values(mainCat.children).reduce((sum, subCat) => sum + subCat.count, 0);
                superCount += mainCat.count;
            });
            superCat.count = superCount;
        });

        const specialCategories = [
            { name: 'Wszystkie narzędzia', slug: 'all', icon: 'fas fa-grip-horizontal', count: allTools.length },
            { name: 'Ulubione', slug: 'favorites', icon: 'fas fa-star', count: getFavorites().length },
            { name: 'Popularne', slug: 'popular', icon: 'fas fa-fire', count: 10 },
            { name: 'Baza Wiedzy', slug: 'knowledge', icon: 'fas fa-book-open' },
            { name: 'Statystyki', slug: 'stats', icon: 'fas fa-chart-pie' },
        ];
        specialCategories.forEach(cat => dom.mindmapRoot.appendChild(buildMindmapNode({ ...cat }, 2)));
        dom.mindmapRoot.appendChild(document.createElement('hr'));
        
        const expandedSuperGroups = getExpandedSuperGroups();
        Object.values(mindmapData).sort((a, b) => a.name.localeCompare(b.name)).forEach(superCatData => {
            const node = buildMindmapNode(superCatData, 0);
            if (expandedSuperGroups.includes(superCatData.name)) node.classList.add('is-expanded');
            const header = node.querySelector('.node-content');
            header.addEventListener('click', () => {
                setTimeout(() => {
                    const currentExpanded = getExpandedSuperGroups();
                    const index = currentExpanded.indexOf(superCatData.name);
                    if (node.classList.contains('is-expanded')) {
                        if (index === -1) currentExpanded.push(superCatData.name);
                    } else if (index > -1) {
                        currentExpanded.splice(index, 1);
                    }
                    ls.set('expandedSuperGroups', currentExpanded);
                }, 50);
            });
            dom.mindmapRoot.appendChild(node);
        });
        
        if (unmappedCategories.size > 0) {
            const otherCategory = {
                name: 'Inne', icon: 'fas fa-asterisk',
                children: Array.from(unmappedCategories.values()).reduce((obj, cat) => ({...obj, [cat.slug]: cat}), {}),
                count: Array.from(unmappedCategories.values()).reduce((sum, cat) => sum + cat.count, 0)
            };
            dom.mindmapRoot.appendChild(buildMindmapNode(otherCategory, 1));
        }
    }

    function handleCategorySelection(event) {
        event.stopPropagation();
        const target = event.currentTarget;
        document.querySelectorAll('.node-content.is-active').forEach(n => n.classList.remove('is-active'));
        target.classList.add('is-active');
        if (window.innerWidth <= 1024) dom.sidebar.classList.remove('is-open');
        renderContent();
    }
    
    /**
     * Płynnie aktualizuje kontener z narzędziami.
     * @param {function} updateFunction - Funkcja, która generuje nowy HTML.
     */
    function updateToolContainer(updateFunction) {
        clearTimeout(currentRenderTimeout);
        dom.toolsContainer.classList.add('fade-out');
        
        currentRenderTimeout = setTimeout(() => {
            updateFunction();
            dom.toolsContainer.classList.remove('fade-out');
        }, 150); // Czas musi pasować do transition w CSS
    }

    function renderContent() {
        updateToolContainer(() => {
            const activeNode = document.querySelector('.node-content.is-active');
            if (!activeNode) return;

            const { slug, name, superCategory, mainCategory } = activeNode.dataset;
            const searchTerm = dom.searchInput.value.toLowerCase().trim();

            dom.categoryTitle.textContent = name;
            dom.contentArea.querySelector('.content-header').style.display = 'flex';

            if (slug === 'knowledge') {
                renderPlaceholder('book-reader', 'Baza Wiedzy', 'Ta sekcja jest w budowie. Wkrótce znajdziesz tu artykuły i poradniki na temat OSINT.');
            } else if (slug === 'stats') {
                renderStats();
            } else {
                let toolsToDisplay = [];
                if (slug === 'all') toolsToDisplay = allTools;
                else if (slug === 'favorites') toolsToDisplay = allTools.filter(t => getFavorites().includes(t.name));
                else if (slug === 'popular') {
                    const counts = getClickCounts();
                    toolsToDisplay = [...allTools].sort((a, b) => (counts[b.name] || 0) - (counts[a.name] || 0)).slice(0, 10);
                } else if (slug) {
                    toolsToDisplay = allTools.filter(t => t.category_slug === slug);
                } else if (mainCategory) {
                    const relevantSlugs = Object.keys(categoryMappings).filter(key => categoryMappings[key].main === mainCategory);
                    toolsToDisplay = allTools.filter(t => relevantSlugs.includes(t.category_slug));
                } else if (superCategory) {
                    const relevantSlugs = Object.keys(categoryMappings).filter(key => categoryMappings[key].super === superCategory);
                    toolsToDisplay = allTools.filter(t => relevantSlugs.includes(t.category_slug));
                }
                
                const filteredTools = toolsToDisplay.filter(tool =>
                    searchTerm === '' || tool.name.toLowerCase().includes(searchTerm) || (tool.description && tool.description.toLowerCase().includes(searchTerm))
                );

                dom.toolCount.textContent = `${filteredTools.length} narzędzi`;
                if (filteredTools.length > 0) {
                    dom.toolsContainer.innerHTML = filteredTools.map((tool, index) => generateToolCard(tool, searchTerm, index)).join('');
                } else {
                    dom.toolsContainer.innerHTML = '<p class="no-results">😢 Brak wyników dla podanych kryteriów.</p>';
                }
            }
        });
    }
    
    function renderPlaceholder(icon, title, text) {
        dom.toolsContainer.innerHTML = `<div class="placeholder-section"><i class="fas fa-${icon}"></i><h2>${title}</h2><p>${text}</p></div>`;
        dom.contentArea.querySelector('.content-header').style.display = 'none';
    }

    function renderStats() {
        const categoryCounts = allTools.reduce((acc, tool) => {
            acc[tool.category] = (acc[tool.category] || 0) + 1;
            return acc;
        }, {});
        const sortedCategories = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);
        const maxCount = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;
        let statsHTML = `<div class="stats-container"><h3>Narzędzia wg podkategorii</h3>`;
        sortedCategories.forEach(([name, count]) => {
            const width = (count / maxCount) * 100;
            const toolSample = allTools.find(t=>t.category === name);
            const color = toolSample ? categoryColors[toolSample.category_slug] : 'var(--accent-primary)';
            statsHTML += `<div class="stat-bar"><span class="stat-bar-label">${name} (${count})</span><div class="stat-bar-progress"><div class="stat-bar-fill" style="width: ${width}%; background-color: ${color};"></div></div></div>`;
        });
        statsHTML += `</div>`;
        dom.toolsContainer.innerHTML = statsHTML;
        dom.toolCount.textContent = `Łącznie ${allTools.length} narzędzi w ${sortedCategories.length} podkategoriach`;
    }

    // --- Obsługa Interakcji Użytkownika ---
    dom.toolsContainer.addEventListener('click', e => {
        const favBtn = e.target.closest('.favorite-btn');
        if (favBtn) {
            const card = favBtn.closest('.tool-card');
            const toolName = card.dataset.toolName;
            let favorites = getFavorites();
            if (favorites.includes(toolName)) {
                favorites = favorites.filter(f => f !== toolName);
                favBtn.classList.remove('is-favorite');
            } else {
                favorites.push(toolName);
                favBtn.classList.add('is-favorite');
                favBtn.classList.add('pulsing');
                favBtn.addEventListener('animationend', () => favBtn.classList.remove('pulsing'), { once: true });
            }
            ls.set('favorites', favorites);
            const favCounter = document.querySelector('[data-slug="favorites"] .node-count');
            if(favCounter) favCounter.textContent = `(${favorites.length})`;
        }

        const star = e.target.closest('.rating-stars .fa-star');
        if (star) {
            const ratingContainer = star.parentElement;
            const toolName = ratingContainer.closest('.tool-card').dataset.toolName;
            const currentRating = parseInt(ratingContainer.dataset.rating, 10);
            const newRating = [...ratingContainer.children].indexOf(star) + 1;
            
            let ratings = getRatings();
            ratings[toolName] = (currentRating === newRating) ? 0 : newRating;
            ls.set('ratings', ratings);
            
            const finalRating = ratings[toolName];
            ratingContainer.dataset.rating = finalRating;
            [...ratingContainer.children].forEach((s, i) => s.classList.toggle('is-rated', i < finalRating));
        }

        const link = e.target.closest('.tool-link');
        if(link) {
            const toolName = link.closest('.tool-card').dataset.toolName;
            let counts = getClickCounts();
            counts[toolName] = (counts[toolName] || 0) + 1;
            ls.set('clickCounts', counts);
        }
        
        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
            const toolUrl = copyBtn.closest('.tool-card').dataset.toolUrl;
            navigator.clipboard.writeText(toolUrl).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    copyBtn.classList.remove('copied');
                }, 1500);
            }).catch(err => console.error('Błąd kopiowania:', err));
        }
    });

    // --- LOGIKA BANNERA CIASTECZEK ---
    (() => {
        const cookieBanner = document.getElementById('cookie-consent-banner');
        const acceptBtn = document.getElementById('cookie-accept-btn');
        if (!cookieBanner || !acceptBtn) return;
        if (ls.get('cookiesAccepted', false)) {
            cookieBanner.style.display = 'none';
        } else {
            setTimeout(() => cookieBanner.classList.add('visible'), 1500);
        }
        acceptBtn.addEventListener('click', () => {
            ls.set('cookiesAccepted', true);
            cookieBanner.classList.remove('visible');
        });
    })();

    function showRandomTool() {
        if (allTools.length === 0) return;
        const randomTool = allTools[Math.floor(Math.random() * allTools.length)];
        dom.modalBody.innerHTML = generateToolCard(randomTool);
        dom.modalContainer.classList.add('is-open');
    }

    /**
     * Główna funkcja inicjalizująca aplikację.
     */
    async function initializeApp() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
            const toolsData = await response.json();
            
            allTools = toolsData.map((tool, index) => ({
                ...tool,
                date_added: new Date(new Date().setDate(new Date().getDate() - (toolsData.length - index))).toISOString(),
            }));

            const uniqueCategories = [...new Set(allTools.map(t => t.category_slug))];
            uniqueCategories.forEach(slug => {
                if (slug) categoryColors[slug] = colorPalette[colorIndex++ % colorPalette.length];
            });
            
            generateMindmap();
            
            const allToolsNode = document.querySelector('[data-slug="all"]');
            if (allToolsNode) {
                allToolsNode.classList.add('is-active');
                renderContent();
            }
            
            dom.searchInput.addEventListener('input', debounce(renderContent, 300));
        } catch (error) {
            console.error("Błąd inicjalizacji aplikacji:", error);
            renderPlaceholder('exclamation-triangle', 'Błąd Krytyczny', 'Nie można załadować bazy narzędzi. Sprawdź konsolę, aby uzyskać więcej informacji.');
        }
    }

    initializeApp();
});
