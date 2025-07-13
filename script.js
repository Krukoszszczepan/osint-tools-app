document.addEventListener('DOMContentLoaded', function () {
    // --- Elementy DOM ---
    const searchInput = document.getElementById('searchInput');
    const toolGrid = document.getElementById('tools-grid');
    const mindmapRoot = document.getElementById('mindmap-root');
    const themeSwitcher = document.getElementById('theme-switcher');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const categoryTitle = document.getElementById('current-category-title');
    const toolCount = document.getElementById('tool-count');
    const body = document.body;

    let allTools = [];
    const colorPalette = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const categoryColors = {};
    let colorIndex = 0;

    // --- Inicjalizacja i Motywy ---
    (function applyInitialTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') body.classList.add('light-theme');
    })();

    themeSwitcher.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        localStorage.setItem('theme', body.classList.contains('light-theme') ? 'light' : 'dark');
    });

    mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('is-open'));

    function getColorForCategory(categorySlug) {
        if (!categoryColors[categorySlug]) {
            categoryColors[categorySlug] = colorPalette[colorIndex++ % colorPalette.length];
        }
        return categoryColors[categorySlug];
    }

    // --- Generowanie dynamicznych elementów ---
    function generateToolCard(tool) {
        const color = getColorForCategory(tool.category_slug);
        return `
            <div class="tool-card">
                <div>
                    <h3>${tool.name}</h3>
                    <p class="tool-category" style="--card-accent-color: ${color};">${tool.category}</p>
                    <p class="tool-description">${tool.description}</p>
                </div>
                <a href="${tool.url}" target="_blank" class="tool-link">
                    <i class="fas fa-external-link-alt"></i> Otwórz
                </a>
            </div>
        `;
    }

    function buildMindmapNode(item) {
        const node = document.createElement('div');
        node.className = 'mindmap-node';

        const content = document.createElement('div');
        content.className = 'node-content';
        node.appendChild(content);

        if (item.children && item.children.length > 0) {
            // Węzeł rozwijany (Super-kategoria)
            content.classList.add('is-expandable');
            content.innerHTML = `<i class="fas fa-angle-right"></i> ${item.name}`;
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            const innerDiv = document.createElement('div'); // Potrzebne do animacji grid
            item.children.forEach(child => innerDiv.appendChild(buildMindmapNode(child)));
            childrenContainer.appendChild(innerDiv);
            node.appendChild(childrenContainer);

            content.addEventListener('click', () => node.classList.toggle('is-expanded'));
        } else {
            // Liść (Kategoria końcowa)
            content.textContent = item.name;
            content.dataset.categorySlug = item.slug;
            content.dataset.categoryName = item.name;
            content.addEventListener('click', handleCategorySelection);
        }
        return node;
    }

    function generateMindmap(tools) {
        const superCategoriesConfig = {
            'Wyszukiwanie Osób': ['username', 'email', 'people', 'osoby', 'person', 'phone'],
            'Analiza Techniczna': ['domain', 'ip', 'dns', 'siec', 'malware', 'exploit', 'vulnerabilities'],
            'Obrazy i Media': ['image', 'video', 'obrazy', 'wideo', 'maps', 'mapy', 'geolokalizacja', 'metadata'],
            'Biznes i Instytucje': ['business', 'firmy', 'rejestry', 'finanse', 'dane-publiczne', 'government'],
            'Transport i Komunikacja': ['transport', 'lotnictwo', 'morski', 'pociagi', 'samochody', 'flight'],
            'Inne Narzędzia': []
        };
        
        const superCatMap = new Map(Object.keys(superCategoriesConfig).map(scName => [scName, { name: scName, children: [] }]));
        
        const uniqueCategories = new Map();
        tools.forEach(tool => {
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
        
        // Dodaj korzeń "Wszystkie"
        const allNode = buildMindmapNode({ name: 'Wszystkie narzędzia', slug: 'all' });
        allNode.querySelector('.node-content').classList.add('is-active'); // Aktywny domyślnie
        mindmapRoot.appendChild(allNode);
        
        // Buduj resztę drzewa
        superCatMap.forEach(superCat => {
            if (superCat.children.length > 0) {
                superCat.children.sort((a, b) => a.name.localeCompare(b.name));
                mindmapRoot.appendChild(buildMindmapNode(superCat));
            }
        });
    }

    // --- Logika Aplikacji ---
    function handleCategorySelection(event) {
        const target = event.currentTarget;
        document.querySelectorAll('.node-content.is-active').forEach(n => n.classList.remove('is-active'));
        target.classList.add('is-active');
        
        if (window.innerWidth <= 1024) {
            sidebar.classList.remove('is-open');
        }
        
        filterAndDisplayTools();
    }

    function filterAndDisplayTools() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeNode = document.querySelector('.node-content.is-active');
        const activeCategorySlug = activeNode.dataset.categorySlug;
        const activeCategoryName = activeNode.dataset.categoryName || activeNode.textContent;

        const filteredTools = allTools.filter(tool => {
            const matchesCategory = activeCategorySlug === 'all' || tool.category_slug === activeCategorySlug;
            const matchesSearch = searchTerm === '' ||
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.description.toLowerCase().includes(searchTerm) ||
                tool.category.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        categoryTitle.textContent = activeCategoryName;
        toolCount.textContent = `${filteredTools.length} narzędzi`;
        
        if (filteredTools.length > 0) {
            toolGrid.innerHTML = filteredTools.map(generateToolCard).join('');
        } else {
            toolGrid.innerHTML = '<p class="no-results">😢 Brak wyników dla podanych kryteriów.</p>';
        }
    }

    // --- Inicjalizacja Aplikacji ---
    async function initializeApp() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
            allTools = await response.json();
            
            generateMindmap(allTools);
            filterAndDisplayTools(); // Wyświetl wszystko na starcie
            
            searchInput.addEventListener('input', filterAndDisplayTools);
        } catch (error) {
            console.error("Błąd inicjalizacji aplikacji:", error);
            toolGrid.innerHTML = '<p class="no-results">Wystąpił krytyczny błąd podczas ładowania narzędzi.</p>';
        }
    }

    initializeApp();
});
