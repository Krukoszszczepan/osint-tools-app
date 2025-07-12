document.addEventListener('DOMContentLoaded', function () {
    // --- Referencje do elementów DOM ---
    const searchInput = document.getElementById('searchInput');
    const toolGrid = document.querySelector('.tools-grid');
    const categoryTreeContainer = document.getElementById('category-tree');
    const themeSwitcher = document.getElementById('theme-switcher');
    const body = document.body;

    let allTools = []; // Przechowuje wszystkie narzędzia po wczytaniu

    // --- 1. OBSŁUGA MOTYWU (JASNY/CIEMNY) ---

    // Funkcja do natychmiastowego zastosowania motywu, aby uniknąć "mrugania"
    (function applyInitialTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            body.classList.add('light-theme');
        }
    })();

    themeSwitcher.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        const currentTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
    });

    // --- 2. KODOWANIE KOLORAMI KATEGORII ---

    const categoryColors = {};
    const colorPalette = [
        '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', 
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];
    let colorIndex = 0;

    function getColorForCategory(categorySlug) {
        if (!categoryColors[categorySlug]) {
            categoryColors[categorySlug] = colorPalette[colorIndex % colorPalette.length];
            colorIndex++;
        }
        return categoryColors[categorySlug];
    }

    // --- 3. GENEROWANIE DRZEWA KATEGORII I KART NARZĘDZI ---

    /** Tworzy kod HTML dla pojedynczej karty narzędzia */
    function generateToolCard(tool) {
        const accentColor = getColorForCategory(tool.category_slug);
        return `
            <div class="tool-card" style="--card-accent-color: ${accentColor};">
                <div class="tool-header">
                    <h3><i class="fas fa-wrench"></i> ${tool.name}</h3>
                    <span class="tool-category">${tool.category}</span>
                </div>
                <p class="tool-description">${tool.description}</p>
                <div class="tool-links">
                    <a href="${tool.url}" target="_blank" class="tool-link">
                        <i class="fas fa-external-link-alt"></i> Otwórz
                    </a>
                </div>
            </div>
        `;
    }

    /** Wyświetla narzędzia w siatce */
    function renderTools(tools) {
        if (tools.length === 0) {
            toolGrid.innerHTML = '<p class="no-results" style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">Brak wyników.</p>';
        } else {
            toolGrid.innerHTML = tools.map(generateToolCard).join('');
        }
    }

    /** Generuje rozwijane drzewo kategorii */
    function generateCategoryTree(tools) {
        // Stworzenie prostego grupowania na podstawie słów kluczowych
        const superCategories = {
            'Wyszukiwanie Osób': ['username', 'email', 'people', 'osoby', 'person', 'phone', 'numer-telefonu'],
            'Analiza Techniczna': ['domain', 'ip', 'dns', 'adresy-ip', 'siec', 'malware', 'exploit'],
            'Obrazy i Media': ['image', 'video', 'obrazy', 'wideo', 'maps', 'mapy', 'geolokalizacja'],
            'Biznes i Instytucje': ['business', 'firmy', 'rejestry', 'finanse', 'dane-publiczne'],
            'Transport i Komunikacja': ['transport', 'lotnictwo', 'morski', 'pociagi', 'samochody'],
            'Inne Narzędzia': [] // Domyślna grupa
        };

        const categoryGroups = {};
        const uniqueCategories = new Map();
        tools.forEach(tool => {
            if (!uniqueCategories.has(tool.category_slug)) {
                uniqueCategories.set(tool.category_slug, tool.category);
            }
        });
        
        // Przypisanie każdej unikalnej kategorii do super-kategorii
        uniqueCategories.forEach((name, slug) => {
            let found = false;
            for (const superCat in superCategories) {
                if (superCategories[superCat].some(keyword => slug.includes(keyword))) {
                    if (!categoryGroups[superCat]) categoryGroups[superCat] = [];
                    categoryGroups[superCat].push({ name, slug });
                    found = true;
                    break;
                }
            }
            if (!found) {
                if (!categoryGroups['Inne Narzędzia']) categoryGroups['Inne Narzędzia'] = [];
                categoryGroups['Inne Narzędzia'].push({ name, slug });
            }
        });

        // Generowanie HTML dla drzewa
        let treeHtml = `<div class="category-tree"><a href="#" class="category-item active" data-category="all">Wszystkie</a>`;
        for (const superCat in categoryGroups) {
            treeHtml += `<details><summary>${superCat}</summary>`;
            categoryGroups[superCat].sort((a,b) => a.name.localeCompare(b.name)).forEach(cat => {
                treeHtml += `<a href="#" class="category-item" data-category="${cat.slug}">${cat.name}</a>`;
            });
            treeHtml += `</details>`;
        }
        treeHtml += `</div>`;
        categoryTreeContainer.innerHTML = treeHtml;

        setupCategoryClickListeners();
    }

    // --- LOGIKA FILTROWANIA I OBSŁUGA ZDARZEŃ ---

    function filterAndDisplayTools() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeCategory = document.querySelector('.category-item.active').dataset.category;

        const filteredTools = allTools.filter(tool => {
            const matchesSearch = searchTerm === '' || tool.name.toLowerCase().includes(searchTerm);
            const matchesCategory = activeCategory === 'all' || tool.category_slug === activeCategory;
            return matchesSearch && matchesCategory;
        });
        renderTools(filteredTools);
    }
    
    function setupCategoryClickListeners() {
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                categoryItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                filterAndDisplayTools();
            });
        });
    }

    // --- INICJALIZACJA APLIKACJI ---

    async function initializeApp() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) throw new Error(`Błąd wczytywania bazy: ${response.statusText}`);
            allTools = await response.json();
            
            generateCategoryTree(allTools);
            renderTools(allTools);
            
            searchInput.addEventListener('input', filterAndDisplayTools);
        } catch (error) {
            console.error("Błąd inicjalizacji aplikacji:", error);
            toolGrid.innerHTML = '<p class="error" style="color: #ef4444;">Nie można załadować narzędzi.</p>';
        }
    }

    initializeApp();
});
