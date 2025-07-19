/**
 * @file Skrypt do obsługi podstrony "Baza Wiedzy o Zagrożeniach".
 * @version 1.0.0
 * @description Dynamicznie buduje menu nawigacyjne i wczytuje artykuły
 *              z plików Markdown.
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- Elementy DOM ---
    const dom = {
        sidebar: document.getElementById('sidebar'),
        menuRoot: document.getElementById('threat-menu-root'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        themeSwitcher: document.getElementById('theme-switcher'),
        articleContainer: document.getElementById('article-content-container'),
        pageTitle: document.getElementById('page-title'),
        body: document.body,
    };

    // --- Inicjalizacja podstawowych funkcji ---
    (() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        dom.body.classList.toggle('light-theme', savedTheme === 'light');

        dom.themeSwitcher.addEventListener('click', () => {
            dom.body.classList.toggle('light-theme');
            localStorage.setItem('theme', dom.body.classList.contains('light-theme') ? 'light' : 'dark');
        });
        
        dom.mobileMenuBtn.addEventListener('click', () => dom.sidebar.classList.toggle('is-open'));
    })();

    /**
     * Rekursywnie buduje menu w panelu bocznym na podstawie struktury JSON.
     * @param {object} item - Obiekt węzła z pliku threats.json.
     * @returns {HTMLElement} Element <li> z linkiem lub zagnieżdżoną listą.
     */
    function buildMenuItem(item) {
        const node = document.createElement('div');
        node.className = 'mindmap-node';

        const content = document.createElement('div');
        content.className = 'node-content';
        node.appendChild(content);

        const iconHTML = item.icon ? `<i class="${item.icon}" aria-hidden="true"></i>` : '';
        
        if (item.children) { // To jest kategoria z podkategoriami
            content.classList.add('is-expandable');
            content.innerHTML = `<i class="fas fa-angle-right" aria-hidden="true"></i><span>${iconHTML}${item.name}</span>`;
            
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            const innerDiv = document.createElement('div');
            
            item.children
                .sort((a,b) => a.name.localeCompare(b.name))
                .forEach(child => innerDiv.appendChild(buildMenuItem(child)));

            childrenContainer.appendChild(innerDiv);
            node.appendChild(childrenContainer);

            content.addEventListener('click', (e) => {
                e.stopPropagation();
                node.classList.toggle('is-expanded');
            });

        } else { // To jest link do artykułu
            content.innerHTML = `<span>${iconHTML}${item.name}</span>`;
            content.dataset.file = item.file;
            content.dataset.title = item.name;
            content.addEventListener('click', handleArticleSelection);
        }
        return node;
    }
    
    /**
     * Obsługuje kliknięcie na link artykułu w menu.
     * @param {Event} event 
     */
    function handleArticleSelection(event) {
        event.stopPropagation();
        const target = event.currentTarget;
        
        document.querySelectorAll('.node-content.is-active').forEach(n => n.classList.remove('is-active'));
        target.classList.add('is-active');

        if (window.innerWidth <= 1024) {
            dom.sidebar.classList.remove('is-open');
        }

        const file = target.dataset.file;
        const title = target.dataset.title;
        displayArticle(file, title);
    }
    
    /**
     * Wczytuje i wyświetla treść artykułu z pliku Markdown.
     * @param {string} fileSlug - Nazwa pliku .md bez rozszerzenia.
     * @param {string} title - Tytuł do wyświetlenia w nagłówku.
     */
    async function displayArticle(fileSlug, title) {
        dom.pageTitle.textContent = title;
        dom.articleContainer.innerHTML = '<div class="loading-indicator"><div class="spinner"></div></div>';
        
        try {
            const response = await fetch(`threats/${fileSlug}.md`);
            if (!response.ok) throw new Error(`Nie można załadować pliku: ${fileSlug}.md`);
            const markdown = await response.text();
            
            // Używamy biblioteki 'marked' załadowanej w index.html
            dom.articleContainer.innerHTML = marked.parse(markdown);

        } catch (error) {
            console.error("Błąd ładowania artykułu:", error);
            dom.articleContainer.innerHTML = `<p>Wystąpił błąd. Artykuł nie mógł zostać załadowany. Sprawdź konsolę, aby uzyskać więcej informacji.</p>`;
        }
    }

    /**
     * Główna funkcja inicjalizująca podstronę Bazy Wiedzy.
     */
    async function initializeWiki() {
        try {
            const response = await fetch('threats/threats.json');
            if (!response.ok) throw new Error('Błąd ładowania spisu treści Bazy Wiedzy.');
            const menuData = await response.json();
            
            dom.menuRoot.innerHTML = ''; // Wyczyść placeholder
            menuData.children
                .sort((a,b) => a.name.localeCompare(b.name))
                .forEach(item => {
                    const menuItem = buildMenuItem(item);
                    dom.menuRoot.appendChild(menuItem);
            });
            
            // Domyślnie wczytaj pierwszy artykuł
            const firstArticleNode = dom.menuRoot.querySelector('[data-file]');
            if (firstArticleNode) {
                firstArticleNode.classList.add('is-active');
                displayArticle(firstArticleNode.dataset.file, firstArticleNode.dataset.title);
            }

        } catch (error) {
            console.error(error);
            dom.articleContainer.innerHTML = `<p>Nie udało się załadować struktury Bazy Wiedzy. Sprawdź, czy plik threats/threats.json istnieje i ma poprawną strukturę.</p>`;
        }
    }

    initializeWiki();
});