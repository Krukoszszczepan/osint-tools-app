// script.js - Wersja dynamiczna
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const toolGrid = document.querySelector('.tools-grid');
    const categoryNav = document.querySelector('.category-nav .container');

    let allTools = []; // Tutaj będziemy przechowywać wszystkie narzędzia po wczytaniu

    // --- FUNKCJE GENERUJĄCE HTML ---

    /** Tworzy kod HTML dla pojedynczej karty narzędzia */
    function generateToolCard(tool) {
        return `
            <div class="tool-card" data-category="${tool.category_slug}">
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
            toolGrid.innerHTML = '<p class="no-results" style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">Brak wyników spełniających kryteria.</p>';
            return;
        }
        toolGrid.innerHTML = tools.map(generateToolCard).join('');
    }

    /** Generuje przyciski kategorii na podstawie wczytanych danych */
    function generateCategoryButtons(tools) {
        const categories = [...new Set(tools.map(tool => tool.category))];
        categories.sort(); // Sortuj alfabetycznie

        categories.forEach(category => {
            const slug = [...new Set(tools.filter(t => t.category === category).map(t => t.category_slug))][0];
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.dataset.category = slug;
            button.textContent = category;
            categoryNav.appendChild(button);
        });

        // Po dodaniu przycisków, musimy ponownie podpiąć do nich event listenery
        setupCategoryButtonListeners();
    }

    // --- LOGIKA FILTROWANIA ---

    /** Główna funkcja filtrująca */
    function filterAndDisplayTools() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeCategory = document.querySelector('.category-btn.active').dataset.category;

        const filteredTools = allTools.filter(tool => {
            const matchesSearch = searchTerm === '' ||
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.category.toLowerCase().includes(searchTerm);
            
            const matchesCategory = activeCategory === 'all' || tool.category_slug === activeCategory;

            return matchesSearch && matchesCategory;
        });

        renderTools(filteredTools);
    }
    
    // --- PODPINANIE EVENT LISTENERÓW ---

    /** Dodaje obsługę kliknięć do przycisków kategorii */
    function setupCategoryButtonListeners() {
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                filterAndDisplayTools();
            });
        });
    }

    // --- GŁÓWNA FUNKCJA URUCHOMIENIOWA ---

    /** Wczytuje dane i inicjalizuje aplikację */
    async function initializeApp() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) {
                throw new Error(`Błąd wczytywania bazy danych: ${response.statusText}`);
            }
            allTools = await response.json();
            
            renderTools(allTools);
            generateCategoryButtons(allTools);
            
            // Podepnij listenery do paska wyszukiwania i (początkowo) do przycisków
            searchInput.addEventListener('input', filterAndDisplayTools);

        } catch (error) {
            console.error("Nie udało się zainicjować aplikacji:", error);
            toolGrid.innerHTML = '<p class="error" style="color: #ef4444; grid-column: 1 / -1; text-align: center;">Nie można załadować narzędzi. Sprawdź konsolę, aby zobaczyć błędy.</p>';
        }
    }

    // Uruchom aplikację!
    initializeApp();
});