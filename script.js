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

    // --- Funkcje Pomocnicze (LocalStorage, itp.) ---
    const ls = {
        get: (key, fallback) => {
            const value = localStorage.getItem(key);
            if (value == null) return fallback;
            try { return JSON.parse(value); } catch (e) { return value; }
        },
        set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    };
    const getFavorites = () => ls.get('favorites', []);
    const getRatings = () => ls.get('ratings', {});
    const getClickCounts = () => ls.get('clickCounts', {});
    const getViewMode = () => ls.get('viewMode', 'grid');
    // NOWOŚĆ: Stan rozwinięcia super-grup
    const getExpandedSuperGroups = () => ls.get('expandedSuperGroups', ['DZIEDZINY OSINT']);

    const highlightText = (text, searchTerm) => {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    // --- Inicjalizacja Podstawowych Funkcji (Motyw, Widok) ---
    (() => {
        const savedTheme = ls.get('theme', 'dark');
        if (savedTheme === 'light') dom.body.classList.add('light-theme');
        dom.themeSwitcher.addEventListener('click', () => {
            dom.body.classList.toggle('light-theme');
            ls.set('theme', dom.body.classList.contains('light-theme') ? 'light' : 'dark');
        });
        if (getViewMode() === 'list') {
            dom.toolsContainer.className = 'tools-list';
            dom.viewGridBtn.classList.remove('active');
            dom.viewListBtn.classList.add('active');
        }
        dom.viewGridBtn.addEventListener('click', () => switchView('grid'));
        dom.viewListBtn.addEventListener('click', () => switchView('list'));
        dom.mobileMenuBtn.addEventListener('click', () => dom.sidebar.classList.toggle('is-open'));
        dom.modalCloseBtn.addEventListener('click', () => dom.modalContainer.classList.remove('is-open'));
        dom.randomToolBtn.addEventListener('click', showRandomTool);
    })();

    function switchView(mode) {
        dom.toolsContainer.className = `tools-${mode}`;
        dom.viewGridBtn.classList.toggle('active', mode === 'grid');
        dom.viewListBtn.classList.toggle('active', mode === 'list');
        ls.set('viewMode', mode);
    }

    // --- Generowanie HTML ---
    function generateToolCard(tool, searchTerm = '') {
        const favorites = getFavorites();
        const ratings = getRatings();
        const color = categoryColors[tool.category_slug] || '#9ca3af';
        const isFavorite = favorites.includes(tool.name);
        const rating = ratings[tool.name] || 0;
        const isNew = (new Date() - new Date(tool.date_added)) / (1000 * 60 * 60 * 24) < 14;
        const highlightedName = highlightText(tool.name, searchTerm);
        const highlightedDesc = highlightText(tool.description, searchTerm);

        return `
            <div class="tool-card" data-tool-name="${tool.name}" data-tool-url="${tool.url}">
                ${isNew ? '<span class="new-badge">Nowe!</span>' : ''}
                <div class="tool-card-main">
                    <div class="tool-card-header">
                        <h3>${highlightedName}</h3>
                        <button class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" title="Dodaj do ulubionych">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <p class="tool-category" style="--card-accent-color: ${color};">${tool.category}</p>
                    <p class="tool-description">${highlightedDesc}</p>
                </div>
                <div class="tool-card-actions">
                    <div class="rating-stars" data-rating="${rating}">
                        ${[...Array(5)].map((_, i) => `<i class="fas fa-star ${i < rating ? 'is-rated' : ''}"></i>`).join('')}
                    </div>
                    <div class="tool-actions-group">
                        <button class="copy-btn" title="Kopiuj URL"><i class="fas fa-copy"></i></button>
                        <a href="${tool.url}" target="_blank" class="tool-link"><i class="fas fa-external-link-alt"></i> Otwórz</a>
                    </div>
                </div>
            </div>`;
    }
    
    function buildMindmapNode(item, isSpecial = false, count = 0, accentColor = null) {
        const node = document.createElement('div');
        node.className = 'mindmap-node';
        if (accentColor) {
            node.style.setProperty('--node-accent-color', accentColor);
        }
        const content = document.createElement('div');
        content.className = 'node-content';
        node.appendChild(content);

        const countSpan = count > 0 ? `<span class="node-count">(${count})</span>` : '';
        // ZMIANA: Usunięto ikonę z `nameAndCount`, bo jest teraz w `item.icon`
        const itemIconHTML = isSpecial ? item.icon : (item.icon ? `<i class="${item.icon}"></i>` : '');
        const nameAndCount = `<span>${itemIconHTML}${item.name}</span>${countSpan}`;

        if (item.children?.length > 0) {
            content.classList.add('is-expandable');
            const expanderIcon = `<i class="fas fa-angle-right"></i>`;
            content.innerHTML = `${expanderIcon} ${nameAndCount}`;
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            const innerDiv = document.createElement('div');
            item.children.forEach(child => innerDiv.appendChild(buildMindmapNode(child, false, child.count, accentColor)));
            childrenContainer.appendChild(innerDiv);
            node.appendChild(childrenContainer);
            content.addEventListener('click', () => node.classList.toggle('is-expanded'));
        } else {
            content.innerHTML = nameAndCount;
            content.dataset.categorySlug = item.slug;
            content.dataset.categoryName = item.name;
            content.addEventListener('click', handleCategorySelection);
        }
        return node;
    }

    // --- PRZEBUDOWANA FUNKCJA GENERUJĄCA MAPĘ MYŚLI ---
    function generateMindmap() {
        dom.mindmapRoot.innerHTML = ''; // Wyczyść stary widok
        const categoryCounts = allTools.reduce((acc, tool) => {
            acc[tool.category_slug] = (acc[tool.category_slug] || 0) + 1;
            return acc;
        }, {});
        
        // --- NOWA STRUKTURA Z SUPER-GRUPAMI ---
        const superGroupsConfig = [
            {
                name: 'DZIEDZINY OSINT',
                icon: 'fas fa-search-location',
                categories: [
                    { name: 'Wyszukiwanie Osób', icon: 'fas fa-user-friends', keywords: ['username-search-engines', 'specific-sites', 'email-search', 'common-email-formats', 'email-verification', 'breach-data', 'general-people-search', 'registries', 'dating', 'voicemail', 'telephone-numbers', 'birth-records', 'death-records', 'osoby', 'linki-do-profili', 'nazwiska', 'genealogia', 'zmarli'] },
                    { name: 'Obrazy i Media', icon: 'fas fa-photo-video', keywords: ['image-search', 'instagram', 'flickr', 'metadata', 'forensics', 'pictures', 'location--mapping', 'videos', 'webcams', 'wyszukiwanie', 'analiza', 'wideo', 'search'] },
                    { name: 'Biznes i Instytucje', icon: 'fas fa-building', keywords: ['property-records', 'court--criminal-records', 'government-records', 'financial--tax-resources', 'us-county-data', 'us-voter-records', 'patent-records', 'us-political-records', 'public-records', 'annual-reports', 'general-info--news', 'company-profiles', 'employee-profiles--resumes', 'additional-resources', 'rejestry-publiczne', 'biznes--gospodarka', 'gielda', 'gieldy-dlugow', 'przetargi', 'rejestry', 'opinie', 'branzowe'] },
                    { name: 'Transport i Komunikacja', icon: 'fas fa-car-side', keywords: ['vehicle-records', 'air-traffic-records', 'marine-records', 'railway-records', 'transportation', 'geolocation-tools', 'coordinates', 'map-locations', 'map-reporting-tools', 'mobile-coverage', 'geolocation-tools--maps', 'rozkłady-jazdy', 'miejscowości', 'lokalizacja-pojazdow', 'tablice-rejestracyjne', 'skradzione-pojazdy', 'spotting', 'ladowy', 'lotniczy', 'morski', 'telekomunikacja'] },
                    { name: '🇵🇱 Polskie Źródła', icon: 'fas fa-flag', keywords: ['adresy-e-mail', 'geolokalizacja', 'listy--rejestry', 'skracacze', 'whois', 'domeny', 'historyczne', 'lotnicze', 'miejskie-systemy-informacji-przestrzennej', 'meteorologiczne', 'wojewodzkie-systemy-informacji-przestrzennej', 'mapy--uslugi-lokalizacyjne', 'medycyna', 'nauka', 'partie', 'polityka', 'prawo', 'diecezje', 'kosciol-katolicki', 'duchowienstwo', 'pozostale', 'fediwersum', 'serwisy-spolecznosciowe', 'seks', 'serwisy-randkowe', 'kosy--zgody--uklady', 'ustawki', 'kibice', 'subkultury', 'spoleczenstwo', 'bezpieczenstwo-publiczne', 'allegro', 'przemysl', 'archiwa', 'jezyki--gwara', 'slang', 'symbolika', 'rejestry-zwierzat'] }
                ]
            },
            {
                name: 'ANALIZA TECHNICZNA I CYBERSEC',
                icon: 'fas fa-shield-virus',
                categories: [
                    { name: 'Analiza Techniczna', icon: 'fas fa-sitemap', keywords: ['mail-blacklists', 'whois-records', 'subdomains', 'discovery', 'certificate-search', 'passivedns', 'host--port-discovery', 'ipv4', 'ipv6', 'bgp', 'dnssec', 'cloud-resources', 'network-analysis-tools', 'ip-loggers'] },
                    { name: 'Cyberbezpieczeństwo', icon: 'fas fa-shield-alt', keywords: ['reputation', 'domain-blacklists', 'typosquatting', 'scanners', 'disclosure-sites', 'vulnerabilities', 'report-malicious-sites', 'malicious-file-analysis', 'default-passwords', 'exploits--advisories', 'phishing', 'ioc-tools', 'ttps', 'threat-intelligence', 'search', 'office-files', 'pdfs', 'android', 'hosted-automated-analysis', 'pcaps'] },
                    { name: 'Analiza Sieci i Archiwa', icon: 'fas fa-globe-americas', keywords: ['analytics', 'change-detection', 'web', 'web-browsing', 'przechowywanie', 'wklejki'] },
                    { name: 'Kryptowaluty', icon: 'fab fa-bitcoin', keywords: ['bitcoin', 'ethereum', 'monero'] },
                ]
            },
            {
                name: 'WARSZTAT ANALITYKA',
                icon: 'fas fa-tools',
                categories: [
                    { name: 'Narzędzia i Automatyzacja', icon: 'fas fa-cogs', keywords: ['tools', 'url-expanders', 'barcodes--qr', 'javascript', 'php', 'unix', 'windows', 'python', 'encoding--decoding', 'osint-automation', 'pentesting-recon', 'virtual-machines', 'wordlist', 'ai-tools', 'emulation-tools', 'screen-capture', 'narzedzia', 'platformy-sledcze', 'generatory-danych--tozsamosci'] },
                    { name: 'Bazy Wiedzy i Wyszukiwarki', icon: 'fas fa-book', keywords: ['social-analysis', 'general-search', 'meta-search', 'code-search', 'ftp-search', 'academic--publication-search', 'news-search', 'other-search', 'search-tools', 'search-engine-guides', 'fact-checking', 'forum-search-engines', 'blog-search-engines', 'irc-search', 'other-media', 'text', 'fonts', 'data-leaks', 'public-datasets', 'games', 'training', 'blogi', 'kursy--prezentacje', 'literatura', 'newslettery'] },
                    { name: 'Prywatność i OPSEC', icon: 'fas fa-user-secret', keywords: ['persona-creation', 'anonymous-vpns', 'spoof-user-agent', 'vpn-tests', 'proxy-tests', 'anonymous-browsing', 'privacy--clean-up', 'metadata--style', 'tor', 'tor-search', 'tor-directories', 'dark-web', 'tymczasowe-skrzynki-e-mail'] },
                ]
            }
        ];
        
        const specialCategories = [
            { name: 'Wszystkie narzędzia', slug: 'all', icon: '<i class="fas fa-grip-horizontal"></i>', count: allTools.length },
            { name: 'Ulubione', slug: 'favorites', icon: '<i class="fas fa-star" style="color:var(--yellow-star);"></i>', count: getFavorites().length },
            { name: 'Popularne', slug: 'popular', icon: '<i class="fas fa-fire" style="color:#f59e0b;"></i>', count: 10 },
            { name: 'Baza Wiedzy', slug: 'knowledge', icon: '<i class="fas fa-book-open"></i>' },
            { name: 'Statystyki', slug: 'stats', icon: '<i class="fas fa-chart-pie"></i>' },
        ];
        
        specialCategories.forEach(cat => dom.mindmapRoot.appendChild(buildMindmapNode(cat, true, cat.count)));
        
        const separator = document.createElement('hr');
        separator.className = 'sidebar-separator';
        dom.mindmapRoot.appendChild(separator);

        const uniqueSubCategories = new Map();
        allTools.forEach(tool => {
            if (!uniqueSubCategories.has(tool.category_slug)) {
                uniqueSubCategories.set(tool.category_slug, { name: tool.category, slug: tool.category_slug, count: categoryCounts[tool.category_slug] });
            }
        });

        const assignedSlugs = new Set();
        const expandedSuperGroups = getExpandedSuperGroups();

        superGroupsConfig.forEach(superGroup => {
            const superGroupNode = document.createElement('div');
            superGroupNode.className = 'super-group-node';
            if (expandedSuperGroups.includes(superGroup.name)) {
                superGroupNode.classList.add('is-expanded');
            }

            const header = document.createElement('div');
            header.className = 'super-group-header';
            header.innerHTML = `<i class="fas fa-chevron-right super-group-toggle"></i><i class="${superGroup.icon} super-group-icon"></i> ${superGroup.name}`;
            
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'super-group-children';
            const childrenInner = document.createElement('div');
            childrenContainer.appendChild(childrenInner);

            superGroup.categories.forEach(category => {
                const subCategoriesForThis = [];
                category.keywords.forEach(keyword => {
                    if (uniqueSubCategories.has(keyword)) {
                        subCategoriesForThis.push(uniqueSubCategories.get(keyword));
                        assignedSlugs.add(keyword);
                    }
                });

                if (subCategoriesForThis.length > 0) {
                    const totalCount = subCategoriesForThis.reduce((sum, child) => sum + (child.count || 0), 0);
                    subCategoriesForThis.sort((a, b) => a.name.localeCompare(b.name));
                    category.children = subCategoriesForThis;
                    childrenInner.appendChild(buildMindmapNode(category, false, totalCount, category.color));
                }
            });

            if (childrenInner.hasChildNodes()) {
                header.addEventListener('click', () => {
                    superGroupNode.classList.toggle('is-expanded');
                    const currentExpanded = getExpandedSuperGroups();
                    if (superGroupNode.classList.contains('is-expanded')) {
                        if (!currentExpanded.includes(superGroup.name)) currentExpanded.push(superGroup.name);
                    } else {
                        const index = currentExpanded.indexOf(superGroup.name);
                        if (index > -1) currentExpanded.splice(index, 1);
                    }
                    ls.set('expandedSuperGroups', currentExpanded);
                });
                superGroupNode.appendChild(header);
                superGroupNode.appendChild(childrenContainer);
                dom.mindmapRoot.appendChild(superGroupNode);
            }
        });

        // Obsługa kategorii "Inne" dla nieprzypisanych
        const unassignedCategories = [];
        uniqueSubCategories.forEach((cat, slug) => {
            if (!assignedSlugs.has(slug)) {
                unassignedCategories.push(cat);
            }
        });

        if (unassignedCategories.length > 0) {
            const otherCategory = { name: 'Inne', icon: 'fas fa-asterisk', children: unassignedCategories.sort((a, b) => a.name.localeCompare(b.name)) };
            const totalCount = otherCategory.children.reduce((sum, child) => sum + (child.count || 0), 0);
            dom.mindmapRoot.appendChild(buildMindmapNode(otherCategory, false, totalCount));
        }
    }

    // --- Pozostała część kodu (logika filtrowania, interakcje) bez zmian ---
    function handleCategorySelection(event) {
        const target = event.currentTarget;
        document.querySelectorAll('.node-content.is-active').forEach(n => n.classList.remove('is-active'));
        target.classList.add('is-active');
        if (window.innerWidth <= 1024) dom.sidebar.classList.remove('is-open');

        const parentSuperGroup = target.closest('.super-group-node');
        if(parentSuperGroup && !parentSuperGroup.classList.contains('is-expanded')) {
            parentSuperGroup.classList.add('is-expanded');
        }

        renderContent();
    }
    
    function renderContent() {
        const activeNode = document.querySelector('.node-content.is-active');
        if (!activeNode) return;
        const slug = activeNode.dataset.categorySlug;
        const name = activeNode.dataset.categoryName;
        const searchTerm = dom.searchInput.value.toLowerCase().trim();

        dom.categoryTitle.textContent = name;
        dom.toolsContainer.innerHTML = '';
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
            } else {
                // NOWOŚĆ: Obsługa kliknięcia na nadkategorię
                const clickedNode = document.querySelector(`[data-category-name="${name}"]`);
                const parentNode = clickedNode ? clickedNode.closest('.mindmap-node') : null;
                if (parentNode && parentNode.querySelector('.node-children')) { // To jest nadkategoria
                    const childSlugs = [...parentNode.querySelectorAll('[data-category-slug]')].map(n => n.dataset.categorySlug);
                    toolsToDisplay = allTools.filter(t => childSlugs.includes(t.category_slug));
                } else { // To jest podkategoria
                    toolsToDisplay = allTools.filter(t => t.category_slug === slug);
                }
            }

            const filteredTools = toolsToDisplay.filter(tool =>
                searchTerm === '' || tool.name.toLowerCase().includes(searchTerm) || tool.description.toLowerCase().includes(searchTerm)
            );

            dom.toolCount.textContent = `${filteredTools.length} narzędzi`;
            if (filteredTools.length > 0) {
                dom.toolsContainer.innerHTML = filteredTools.map(tool => generateToolCard(tool, searchTerm)).join('');
            } else {
                dom.toolsContainer.innerHTML = '<p class="no-results">😢 Brak wyników dla podanych kryteriów.</p>';
            }
        }
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
        let statsHTML = `<div class="stats-container"><h3>Narzędzia wg kategorii</h3>`;
        sortedCategories.forEach(([name, count]) => {
            const width = (count / maxCount) * 100;
            statsHTML += `<div class="stat-bar"><span class="stat-bar-label">${name} (${count})</span><div class="stat-bar-progress"><div class="stat-bar-fill" style="width: ${width}%;"></div></div></div>`;
        });
        statsHTML += `</div>`;
        dom.toolsContainer.innerHTML = statsHTML;
        dom.toolCount.textContent = `Łącznie ${allTools.length} narzędzi`;
    }

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
        }

        const star = e.target.closest('.rating-stars .fa-star');
        if (star) {
            const ratingContainer = star.parentElement;
            const toolName = ratingContainer.closest('.tool-card').dataset.toolName;
            const newRating = [...ratingContainer.children].indexOf(star) + 1;
            let ratings = getRatings();
            ratings[toolName] = newRating;
            ls.set('ratings', ratings);
            [...ratingContainer.children].forEach((s, i) => s.classList.toggle('is-rated', i < newRating));
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
                copyBtn.dataset.tooltip = 'Skopiowano!';
                
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    copyBtn.classList.remove('copied');
                    copyBtn.removeAttribute('data-tooltip');
                }, 1500);
            }).catch(err => {
                console.error('Błąd kopiowania:', err);
                copyBtn.dataset.tooltip = 'Błąd!';
            });
        }
    });

    function showRandomTool() {
        if (allTools.length === 0) return;
        const randomTool = allTools[Math.floor(Math.random() * allTools.length)];
        dom.modalBody.innerHTML = generateToolCard(randomTool);
        dom.modalContainer.classList.add('is-open');
    }

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
            uniqueCategories.forEach(slug => categoryColors[slug] = colorPalette[colorIndex++ % colorPalette.length]);
            
            generateMindmap();
            document.querySelector('[data-category-slug="all"]').classList.add('is-active');
            renderContent();
            
            dom.searchInput.addEventListener('input', renderContent);
        } catch (error) {
            console.error("Błąd inicjalizacji aplikacji:", error);
            renderPlaceholder('exclamation-triangle', 'Błąd Krytyczny', 'Nie można załadować bazy narzędzi. Sprawdź konsolę, aby uzyskać więcej informacji.');
        }
    }

    initializeApp();
});
