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
        get: (key, fallback) => JSON.parse(localStorage.getItem(key)) || fallback,
        set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    };
    const getFavorites = () => ls.get('favorites', []);
    const getRatings = () => ls.get('ratings', {});
    const getClickCounts = () => ls.get('clickCounts', {});
    const getViewMode = () => ls.get('viewMode', 'grid');
    
    // --- Inicjalizacja Podstawowych Funkcji (Motyw, Widok) ---
    (() => {
        // Motyw
        const savedTheme = ls.get('theme', 'dark');
        if (savedTheme === 'light') dom.body.classList.add('light-theme');
        dom.themeSwitcher.addEventListener('click', () => {
            dom.body.classList.toggle('light-theme');
            ls.set('theme', dom.body.classList.contains('light-theme') ? 'light' : 'dark');
        });

        // Widok
        if (getViewMode() === 'list') {
            dom.toolsContainer.className = 'tools-list';
            dom.viewGridBtn.classList.remove('active');
            dom.viewListBtn.classList.add('active');
        }
        dom.viewGridBtn.addEventListener('click', () => switchView('grid'));
        dom.viewListBtn.addEventListener('click', () => switchView('list'));

        // Menu mobilne i modal
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
    function generateToolCard(tool) {
        const favorites = getFavorites();
        const ratings = getRatings();
        const color = categoryColors[tool.category_slug] || '#9ca3af';
        const isFavorite = favorites.includes(tool.name);
        const rating = ratings[tool.name] || 0;
        const isNew = (new Date() - new Date(tool.date_added)) / (1000 * 60 * 60 * 24) < 14;

        return `
            <div class="tool-card" data-tool-name="${tool.name}">
                ${isNew ? '<span class="new-badge">Nowe!</span>' : ''}
                <div class="tool-card-main">
                    <div class="tool-card-header">
                        <h3>${tool.name}</h3>
                        <button class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" title="Dodaj do ulubionych">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <p class="tool-category" style="--card-accent-color: ${color};">${tool.category}</p>
                    <p class="tool-description">${tool.description}</p>
                </div>
                <div class="tool-card-actions">
                    <div class="rating-stars" data-rating="${rating}">
                        ${[...Array(5)].map((_, i) => `<i class="fas fa-star ${i < rating ? 'is-rated' : ''}"></i>`).join('')}
                    </div>
                    <a href="${tool.url}" target="_blank" class="tool-link"><i class="fas fa-external-link-alt"></i> Otwórz</a>
                </div>
            </div>`;
    }

    function buildMindmapNode(item, isSpecial = false) {
        const node = document.createElement('div');
        node.className = 'mindmap-node';
        const content = document.createElement('div');
        content.className = 'node-content';
        node.appendChild(content);

        if (item.children?.length > 0) {
            content.classList.add('is-expandable');
            content.innerHTML = `<i class="fas fa-angle-right"></i> ${item.name}`;
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            const innerDiv = document.createElement('div');
            item.children.forEach(child => innerDiv.appendChild(buildMindmapNode(child)));
            childrenContainer.appendChild(innerDiv);
            node.appendChild(childrenContainer);
            content.addEventListener('click', () => node.classList.toggle('is-expanded'));
        } else {
            content.innerHTML = `${isSpecial ? item.icon + ' ' : ''}${item.name}`;
            content.dataset.categorySlug = item.slug;
            content.dataset.categoryName = item.name;
            content.addEventListener('click', handleCategorySelection);
        }
        return node;
    }

    function generateMindmap() {
        // Definicje kategorii
        const superCategoriesConfig = { 'Wyszukiwanie Osób': ['username', 'email', 'people', 'osoby', 'person', 'phone'], 'Analiza Techniczna': ['domain', 'ip', 'dns', 'siec', 'malware', 'exploit', 'vulnerabilities'], 'Obrazy i Media': ['image', 'video', 'obrazy', 'wideo', 'maps', 'mapy', 'geolokalizacja', 'metadata'], 'Biznes i Instytucje': ['business', 'firmy', 'rejestry', 'finanse', 'dane-publiczne', 'government'], 'Transport i Komunikacja': ['transport', 'lotnictwo', 'morski', 'pociagi', 'samochody', 'flight'], 'Inne Narzędzia': [] };
        const specialCategories = [
            { name: 'Wszystkie narzędzia', slug: 'all', icon: '<i class="fas fa-grip-horizontal"></i>' },
            { name: 'Ulubione', slug: 'favorites', icon: '<i class="fas fa-star" style="color:var(--yellow-star);"></i>' },
            { name: 'Popularne', slug: 'popular', icon: '<i class="fas fa-fire" style="color:#f59e0b;"></i>' },
            { name: 'Baza Wiedzy', slug: 'knowledge', icon: '<i class="fas fa-book-open"></i>' },
            { name: 'Statystyki', slug: 'stats', icon: '<i class="fas fa-chart-pie"></i>' },
        ];
        
        // Dodaj kategorie specjalne
        specialCategories.forEach(cat => dom.mindmapRoot.appendChild(buildMindmapNode(cat, true)));
        
        // Przetwarzaj i dodaj kategorie narzędzi
        const superCatMap = new Map(Object.keys(superCategoriesConfig).map(scName => [scName, { name: scName, children: [] }]));
        const uniqueCategories = new Map();
        allTools.forEach(tool => {
            if (!uniqueCategories.has(tool.category_slug)) {
                uniqueCategories.set(tool.category_slug, { name: tool.category, slug: tool.category_slug });
            }
        });
        uniqueCategories.forEach(cat => {
            let assigned = false;
            for (const [scName, keywords] of Object.entries(superCategoriesConfig)) {
                if (keywords.some(kw => cat.slug.includes(kw))) {
                    superCatMap.get(scName).children.push(cat);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) superCatMap.get('Inne Narzędzia').children.push(cat);
        });
        superCatMap.forEach(superCat => {
            if (superCat.children.length > 0) {
                superCat.children.sort((a, b) => a.name.localeCompare(b.name));
                dom.mindmapRoot.appendChild(buildMindmapNode(superCat));
            }
        });
    }

    // --- Główna Logika (Filtrowanie, Wyświetlanie) ---
    function handleCategorySelection(event) {
        const target = event.currentTarget;
        document.querySelectorAll('.node-content.is-active').forEach(n => n.classList.remove('is-active'));
        target.classList.add('is-active');
        if (window.innerWidth <= 1024) dom.sidebar.classList.remove('is-open');
        renderContent();
    }

    function renderContent() {
        const activeNode = document.querySelector('.node-content.is-active');
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
            if (slug === 'all') {
                toolsToDisplay = allTools;
            } else if (slug === 'favorites') {
                const favorites = getFavorites();
                toolsToDisplay = allTools.filter(t => favorites.includes(t.name));
            } else if (slug === 'popular') {
                const counts = getClickCounts();
                toolsToDisplay = allTools.sort((a, b) => (counts[b.name] || 0) - (counts[a.name] || 0)).slice(0, 10);
            } else {
                toolsToDisplay = allTools.filter(t => t.category_slug === slug);
            }

            const filteredTools = toolsToDisplay.filter(tool =>
                searchTerm === '' || tool.name.toLowerCase().includes(searchTerm) || tool.description.toLowerCase().includes(searchTerm)
            );

            dom.toolCount.textContent = `${filteredTools.length} narzędzi`;
            if (filteredTools.length > 0) {
                dom.toolsContainer.innerHTML = filteredTools.map(generateToolCard).join('');
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
        const maxCount = sortedCategories[0][1];

        let statsHTML = `<div class="stats-container"><h3>Narzędzia wg kategorii</h3>`;
        sortedCategories.forEach(([name, count]) => {
            const width = (count / maxCount) * 100;
            statsHTML += `
                <div class="stat-bar">
                    <span class="stat-bar-label">${name} (${count})</span>
                    <div class="stat-bar-progress"><div class="stat-bar-fill" style="width: ${width}%;"></div></div>
                </div>`;
        });
        statsHTML += `</div>`;
        
        dom.toolsContainer.innerHTML = statsHTML;
        dom.toolCount.textContent = `Łącznie ${allTools.length} narzędzi`;
    }

    // --- Interakcje Użytkownika ---
    dom.toolsContainer.addEventListener('click', e => {
        // Ulubione
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
            }
            ls.set('favorites', favorites);
        }

        // Oceny
        const star = e.target.closest('.rating-stars .fa-star');
        if (star) {
            const ratingContainer = star.parentElement;
            const card = ratingContainer.closest('.tool-card');
            const toolName = card.dataset.toolName;
            const newRating = [...ratingContainer.children].indexOf(star) + 1;
            
            let ratings = getRatings();
            ratings[toolName] = newRating;
            ls.set('ratings', ratings);
            
            // Zaktualizuj wygląd gwiazdek
            [...ratingContainer.children].forEach((s, i) => s.classList.toggle('is-rated', i < newRating));
        }

        // Zliczanie kliknięć
        const link = e.target.closest('.tool-link');
        if(link) {
            const toolName = link.closest('.tool-card').dataset.toolName;
            let counts = getClickCounts();
            counts[toolName] = (counts[toolName] || 0) + 1;
            ls.set('clickCounts', counts);
        }
    });

    function showRandomTool() {
        const randomTool = allTools[Math.floor(Math.random() * allTools.length)];
        dom.modalBody.innerHTML = generateToolCard(randomTool);
        dom.modalContainer.classList.add('is-open');
    }

    // --- Inicjalizacja Aplikacji ---
    async function initializeApp() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
            const toolsData = await response.json();
            
            // Symulacja daty dodania dla funkcji "Nowe!"
            allTools = toolsData.map((tool, index) => ({
                ...tool,
                date_added: new Date(new Date().setDate(new Date().getDate() - (toolsData.length - index))).toISOString(),
            }));

            // Inicjalizacja kolorów
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
