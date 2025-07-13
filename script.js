document.addEventListener('DOMContentLoaded', function () {
    // --- Referencje do elementów DOM ---
    const searchInput = document.getElementById('searchInput');
    const toolGrid = document.getElementById('tools-grid');
    const mindmapContainer = document.getElementById('mindmap-container');
    const mindmapRoot = document.getElementById('mindmap-root');
    const themeSwitcher = document.getElementById('theme-switcher');
    const body = document.body;
    const openMapBtn = document.getElementById('open-map-btn');
    const closeMapBtn = document.getElementById('close-map-btn');
    const categoryTitle = document.getElementById('current-category-title');

    let allTools = [];
    let categoryColors = {};
    const colorPalette = [
        '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', 
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];
    let colorIndex = 0;

    // --- 1. FUNKCJE POMOCNICZE (MOTYW, KOLORY) ---

    (function applyInitialTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') body.classList.add('light-theme');
    })();

    themeSwitcher.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        localStorage.setItem('theme', body.classList.contains('light-theme') ? 'light' : 'dark');
    });

    function getColorForCategory(categorySlug) {
        if (!categoryColors[categorySlug]) {
            categoryColors[categorySlug] = colorPalette[colorIndex % colorPalette.length];
            colorIndex++;
        }
        return categoryColors[categorySlug];
    }
    
    // --- 2. GENEROWANIE KART NARZĘDZI ---

    function generateToolCard(tool, accentColor) {
        return `
            <div class="tool-card" style="--card-accent-color: ${accentColor};">
                <h3>${tool.name}</h3>
                <p class="tool-description">${tool.description}</p>
                <a href="${tool.url}" target="_blank" class="tool-link">
                    <i class="fas fa-external-link-alt"></i> Otwórz
                </a>
            </div>
        `;
    }

    function renderTools(tools, activeCategorySlug) {
        if (tools.length === 0) {
            toolGrid.innerHTML = '<p class="no-results">Brak narzędzi pasujących do kryteriów.</p>';
        } else {
            const accentColor = activeCategorySlug === 'all' ? '#94a3b8' : getColorForCategory(activeCategorySlug);
            toolGrid.innerHTML = tools.map(tool => generateToolCard(tool, accentColor)).join('');
        }
    }

    // --- 3. GENEROWANIE I OBSŁUGA MAPY MYŚLI ---

    function buildMindmapNode(item, isRoot = false) {
        const node = document.createElement('div');
        node.className = 'mindmap-node';
        if (isRoot) node.classList.add('is-root');

        const content = document.createElement('div');
        content.className = 'node-content';
        content.textContent = item.name;
        content.style.borderColor = item.color;
        node.appendChild(content);

        if (item.children && item.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            item.children.forEach(child => childrenContainer.appendChild(buildMindmapNode(child)));
            node.appendChild(childrenContainer);
            
            content.addEventListener('click', () => node.classList.toggle('is-expanded'));
        } else {
            // To jest liść (kategoria końcowa)
            content.dataset.categorySlug = item.slug;
            content.dataset.categoryName = item.name;
            content.addEventListener('click', handleCategorySelection);
        }
        return node;
    }

    function generateMindmap(tools) {
        const superCategories = {
            'Wyszukiwanie Osób': ['username', 'email', 'people', 'osoby', 'person', 'phone', 'numer-telefonu'],
            'Analiza Techniczna': ['domain', 'ip', 'dns', 'adresy-ip', 'siec', 'malware', 'exploit', 'vulnerabilities'],
            'Obrazy i Media': ['image', 'video', 'obrazy', 'wideo', 'maps', 'mapy', 'geolokalizacja', 'metadata'],
            'Biznes i Instytucje': ['business', 'firmy', 'rejestry', 'finanse', 'dane-publiczne', 'government'],
            'Transport i Komunikacja': ['transport', 'lotnictwo', 'morski', 'pociagi', 'samochody', 'flight'],
            'Inne Narzędzia': []
        };

        const categoryTree = { name: 'Wszystkie Kategorie', slug: 'all', children: [] };
        const superCatMap = new Map();

        // Stwórz super-kategorie
        Object.keys(superCategories).forEach(scName => {
            const superCatNode = { name: scName, slug: scName.toLowerCase().replace(/\s/g, '-'), children: [] };
            categoryTree.children.push(superCatNode);
            superCatMap.set(scName, superCatNode);
        });

        // Grupuj kategorie
        const uniqueCategories = new Map();
        tools.forEach(tool => {
            if (!uniqueCategories.has(tool.category_slug)) {
                uniqueCategories.set(tool.category_slug, { name: tool.category, slug: tool.category_slug });
            }
        });

        uniqueCategories.forEach(cat => {
            let assigned = false;
            for (const [scName, keywords] of Object.entries(superCategories)) {
                if (keywords.some(kw => cat.slug.includes(kw))) {
                    superCatMap.get(scName).children.push(cat);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) superCatMap.get('Inne Narzędzia').children.push(cat);
        });

        // Sortuj i czyść
        categoryTree.children.forEach(sc => {
            sc.children.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Dodaj korzeń "Wszystkie"
        const allNode = { name: 'Pokaż Wszystkie', slug: 'all' };
        mindmapRoot.appendChild(buildMindmapNode(allNode, true));

        // Buduj resztę drzewa
        categoryTree.children.forEach(superCat => {
            if(superCat.children.length > 0) {
                 mindmapRoot.appendChild(buildMindmapNode(superCat));
            }
        });
    }

    // --- 4. LOGIKA APLIKACJI (FILTROWANIE, ZDARZENIA) ---
    
    function handleCategorySelection(event) {
        const target = event.currentTarget;
        const slug = target.dataset.categorySlug;
        const name = target.dataset.categoryName || "Wszystkie narzędzia";
        
        document.querySelectorAll('.mindmap-node.is-active').forEach(n => n.classList.remove('is-active'));
        target.closest('.mindmap-node').classList.add('is-active');

        categoryTitle.textContent = name;
        filterAndDisplayTools();

        if (window.innerWidth < 1024) {
            mindmapContainer.classList.remove('is-open');
            body.classList.remove('map-is-open');
        }
    }

    function filterAndDisplayTools() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeNode = document.querySelector('.mindmap-node.is-active .node-content');
        const activeCategory = activeNode ? activeNode.dataset.categorySlug : 'all';

        const toolsToDisplay = allTools.filter(tool => {
            const matchesCategory = activeCategory === 'all' || tool.category_slug === activeCategory;
            const matchesSearch = searchTerm === '' || 
                                  tool.name.toLowerCase().includes(searchTerm) ||
                                  tool.description.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });
        
        renderTools(toolsToDisplay, activeCategory);
    }
    
    function setupEventListeners() {
        searchInput.addEventListener('input', filterAndDisplayTools);
        
        openMapBtn.addEventListener('click', () => {
            mindmapContainer.classList.add('is-open');
            body.classList.add('map-is-open');
        });
        
        closeMapBtn.addEventListener('click', () => {
            mindmapContainer.classList.remove('is-open');
            body.classList.remove('map-is-open');
        });
    }

    // --- 5. INICJALIZACJA ---

    async function initializeApp() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) throw new Error(`Błąd wczytywania bazy: ${response.statusText}`);
            allTools = await response.json();
            
            generateMindmap(allTools);
            
            // Domyślnie zaznacz "Wszystkie"
            document.querySelector('.mindmap-node.is-root').classList.add('is-active');
            filterAndDisplayTools();
            
            setupEventListeners();
        } catch (error) {
            console.error("Błąd inicjalizacji aplikacji:", error);
            toolGrid.innerHTML = '<p class="no-results" style="color: #ef4444;">Nie można załadować bazy narzędzi. Sprawdź konsolę, aby uzyskać więcej informacji.</p>';
        }
    }

    initializeApp();
});
