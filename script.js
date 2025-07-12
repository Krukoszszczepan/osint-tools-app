// script.js - Wersja 2.0 z ulepszonym UI/UX
document.addEventListener('DOMContentLoaded', function() {
    // --- Referencje do elementów DOM ---
    const searchInput = document.getElementById('searchInput');
    const toolGrid = document.querySelector('.tools-grid');
    const categoryFilter = document.getElementById('categoryFilter');
    const resultsCount = document.getElementById('resultsCount');
    const loader = document.getElementById('loader');

    let allTools = []; // Przechowuje wszystkie narzędzia po wczytaniu z JSON

    // --- Mapa ikon dla kategorii ---
    const iconMap = {
        'default': 'fa-wrench',
        'username': 'fa-user-secret',
        'email': 'fa-at',
        'domain': 'fa-globe',
        'ip-address': 'fa-network-wired',
        'adresy-ip': 'fa-network-wired',
        'people': 'fa-users',
        'osoby': 'fa-users',
        'wyszukiwanie-osob': 'fa-users',
        'business': 'fa-building',
        'firmy-i-instytucje': 'fa-building',
        'social-media': 'fa-share-alt',
        'media-spolecznosciowe': 'fa-share-alt',
        'phone': 'fa-phone-alt',
        'numer-telefonu': 'fa-phone-alt',
        'images': 'fa-image',
        'obrazy': 'fa-image',
        'videos': 'fa-video',
        'wideo': 'fa-video',
        'maps': 'fa-map-marker-alt',
        'mapy': 'fa-map-marker-alt',
        'transport': 'fa-plane-departure',
        'transport-i-komunikacja': 'fa-plane-departure'
    };

    /** Znajduje odpowiednią ikonę dla kategorii */
    function getIconForCategory(categorySlug) {
        for (const key in iconMap) {
            if (categorySlug.includes(key)) {
                return iconMap[key];
            }
        }
        return iconMap['default'];
    }

    // --- Funkcje renderujące ---

    /** Tworzy kod HTML dla pojedynczej karty narzędzia */
    function generateToolCard(tool, searchTerm) {
        const iconClass = getIconForCategory(tool.category_slug);
        let displayName = tool.name;
        let displayDescription = tool.description;

        // Podświetlanie wyszukiwanej frazy
        if (searchTerm) {
            const regex = new RegExp(searchTerm, 'gi');
            displayName = tool.name.replace(regex, (match) => `<mark>${match}</mark>`);
            displayDescription = tool.description.replace(regex, (match) => `<mark>${match}</mark>`);
        }
        
        return `
            <div class="tool-card" data-category="${tool.category_slug}">
                <div class="tool-header">
                    <h3><i class="fas ${iconClass}"></i> ${displayName}</h3>
                    <span class="tool-category">${tool.category}</span>
                </div>
                <p class="tool-description">${displayDescription}</p>
                <div class="tool-links">
                    <a href="${tool.url}" target="_blank" class="tool-link">
                        <i class="fas fa-external-link-alt"></i> Otwórz
                    </a>
                </div>
            </div>
        `;
    }

    /** Wyświetla narzędzia w siatce */
    function renderTools(tools, searchTerm = '') {
        // Ukryj wskaźnik ładowania, gdy mamy już co wyświetlić
        loader.style.display = 'none';

        if (tools.length === 0) {
            toolGrid.innerHTML = '<p class="no-results" style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">Brak wyników spełniających kryteria.</p>';
        } else {
            toolGrid.innerHTML = tools.map(tool => generateToolCard(tool, searchTerm)).join('');
        }
        // Zaktualizuj licznik wyników
        resultsCount.textContent = `Znaleziono: ${tools.length} narzędzi`;
    }

    /** Generuje opcje dla listy rozwijanej z kategoriami */
    function populateCategoryFilter(tools) {
        // Tworzymy mapę, aby uniknąć duplikatów kategorii (np. "Email" i "E-mail")
        const categories = new Map();
        tools.forEach(tool => {
            if (!categories.has(tool.category_slug)) {
                categories.set(tool.category_slug, tool.category);
            }
        });

        // Sortujemy alfabetycznie po nazwie kategorii
        const sortedCategories = [...categories.entries()].sort((a, b) => a[1].localeCompare(b[1]));

        sortedCategories.forEach(([slug, name]) => {
            const option = document.createElement('option');
            option.value = slug;
            option.textContent = name;
            categoryFilter.appendChild(option);
        });
    }

    // --- Logika filtrowania ---

    /** Główna funkcja filtrująca, która jest wywoływana przy każdej zmianie */
    function filterAndDisplayTools() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeCategory = categoryFilter.value;

        const filteredTools = allTools.filter(tool => {
            const matchesSearch = searchTerm === '' ||
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.description.toLowerCase().includes(searchTerm);
            
            const matchesCategory = activeCategory === 'all' || tool.category_slug === activeCategory;

            return matchesSearch && matchesCategory;
        });

        renderTools(filteredTools, searchTerm);
    }
    
    // --- Inicjalizacja Aplikacji ---

    /** Wczytuje dane i inicjalizuje aplikację */
    async function initializeApp() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) {
                throw new Error(`Błąd wczytywania bazy danych: ${response.statusText}`);
            }
            allTools = await response.json();
            
            populateCategoryFilter(allTools);
            filterAndDisplayTools(); // Wyświetl wszystko na starcie
            
            // Podpięcie event listenerów do filtrów
            searchInput.addEventListener('input', filterAndDisplayTools);
            categoryFilter.addEventListener('change', filterAndDisplayTools);

        } catch (error) {
            console.error("Nie udało się zainicjować aplikacji:", error);
            loader.style.display = 'none';
            toolGrid.innerHTML = '<p class="error" style="color: #ef4444; grid-column: 1 / -1; text-align: center;">Nie można załadować narzędzi. Sprawdź konsolę, aby zobaczyć błędy.</p>';
        }
    }

    // Uruchom aplikację!
    initializeApp();
});
