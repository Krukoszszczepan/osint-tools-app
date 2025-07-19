/**
 * @file Skrypt do obsługi podstrony "Baza Wiedzy o Zagrożeniach".
 * @version 2.0.0
 * @description Dynamicznie buduje menu, wczytuje artykuły, generuje spis treści,
 *              obsługuje wskaźnik postępu czytania i podświetlanie aktywnej sekcji.
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
        progressBar: document.getElementById('reading-progress-bar'),
        tocContainer: document.getElementById('toc-container'),
    };

    let intersectionObserver;

    // --- Inicjalizacja podstawowych funkcji ---
    (() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        dom.body.classList.toggle('light-theme', savedTheme === 'light');

        dom.themeSwitcher.addEventListener('click', () => {
            dom.body.classList.toggle('light-theme');
            localStorage.setItem('theme', dom.body.classList.contains('light-theme') ? 'light' : 'dark');
        });
        
        dom.mobileMenuBtn.addEventListener('click', () => dom.sidebar.classList.toggle('is-open'));

        window.addEventListener('scroll', updateReadingProgress);
    })();

    /**
     * Rekursywnie buduje menu w panelu bocznym.
     * @param {object} item - Obiekt węzła z pliku threats.json.
     * @returns {HTMLElement} Element DOM węzła.
     */
    function buildMenuItem(item) {
        const node = document.createElement('div');
        node.className = 'mindmap-node';

        const content = document.createElement('div');
        content.className = 'node-content';
        node.appendChild(content);

        const iconHTML = item.icon ? `<i class="${item.icon}" aria-hidden="true"></i>` : '';
        
        if (item.children) {
            content.classList.add('is-expandable');
            content.innerHTML = `<i class="fas fa-angle-right" aria-hidden="true"></i><span>${iconHTML}${item.name}</span>`;
            
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            const innerDiv = document.createElement('div');
            
            item.children.sort((a,b) => a.name.localeCompare(b.name)).forEach(child => innerDiv.appendChild(buildMenuItem(child)));
            childrenContainer.appendChild(innerDiv);
            node.appendChild(childrenContainer);

            content.addEventListener('click', (e) => {
                e.stopPropagation();
                node.classList.toggle('is-expanded');
            });
        } else {
            content.innerHTML = `<span>${iconHTML}${item.name}</span>`;
            content.dataset.file = item.file;
            content.dataset.title = item.name;
            content.addEventListener('click', handleArticleSelection);
        }
        return node;
    }
    
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
     * Wczytuje i wyświetla treść artykułu, a następnie generuje spis treści.
     * @param {string} fileSlug - Nazwa pliku .md bez rozszerzenia.
     * @param {string} title - Tytuł do wyświetlenia w nagłówku.
     */
    async function displayArticle(fileSlug, title) {
        dom.pageTitle.textContent = title;
        dom.articleContainer.innerHTML = '<div class="loading-indicator"><div class="spinner"></div></div>';
        dom.tocContainer.innerHTML = ''; // Wyczyść stary spis treści
        
        try {
            const response = await fetch(`threats/${fileSlug}.md`);
            if (!response.ok) throw new Error(`Nie można załadować pliku: ${fileSlug}.md`);
            const markdown = await response.text();
            
            dom.articleContainer.innerHTML = marked.parse(markdown);

            generateTableOfContents();
            updateReadingProgress(); // Zaktualizuj pasek po wczytaniu nowej treści

        } catch (error) {
            console.error("Błąd ładowania artykułu:", error);
            dom.articleContainer.innerHTML = `<p>Wystąpił błąd. Artykuł nie mógł zostać załadowany.</p>`;
        }
    }

    /**
     * Generuje dynamiczny spis treści na podstawie nagłówków w artykule.
     */
    function generateTableOfContents() {
        const headings = dom.articleContainer.querySelectorAll('h2, h3');
        if (headings.length < 2) {
            dom.tocContainer.innerHTML = '';
            return;
        }

        // Czyszczenie starych ID i obserwatorów
        if (intersectionObserver) intersectionObserver.disconnect();
        
        const tocList = document.createElement('ul');
        let headingIndex = 0;

        headings.forEach(heading => {
            const id = `toc-heading-${headingIndex++}`;
            heading.id = id;

            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${id}`;
            a.textContent = heading.textContent;
            a.classList.add(heading.tagName.toLowerCase() === 'h3' ? 'toc-h3' : 'toc-h2');
            a.dataset.targetId = id;
            
            li.appendChild(a);
            tocList.appendChild(li);
        });

        const tocHeader = document.createElement('h4');
        tocHeader.textContent = 'Spis Treści';
        dom.tocContainer.innerHTML = '';
        dom.tocContainer.appendChild(tocHeader);
        dom.tocContainer.appendChild(tocList);

        setupIntersectionObserver();
    }

    /**
     * Ustawia Intersection Observer do śledzenia widocznych nagłówków.
     */
    function setupIntersectionObserver() {
        const tocLinks = dom.tocContainer.querySelectorAll('a');
        const headings = dom.articleContainer.querySelectorAll('h2, h3');

        const observerOptions = {
            rootMargin: '-50px 0px -50% 0px',
            threshold: 0
        };

        intersectionObserver = new IntersectionObserver((entries) => {
            tocLinks.forEach(link => link.classList.remove('active-toc-link'));

            const visibleEntries = entries.filter(entry => entry.isIntersecting);
            if (visibleEntries.length > 0) {
                const targetId = visibleEntries[0].target.id;
                const activeLink = dom.tocContainer.querySelector(`a[data-target-id="${targetId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active-toc-link');
                }
            }
        }, observerOptions);

        headings.forEach(heading => intersectionObserver.observe(heading));
    }
    
    /**
     * Aktualizuje szerokość paska postępu czytania.
     */
    function updateReadingProgress() {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollHeight <= clientHeight) {
            dom.progressBar.style.width = '0%';
            return;
        }
        const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
        dom.progressBar.style.width = `${scrollPercent}%`;
    }

    /**
     * Główna funkcja inicjalizująca podstronę Bazy Wiedzy.
     */
    async function initializeWiki() {
        try {
            const response = await fetch('threats/threats.json');
            if (!response.ok) throw new Error('Błąd ładowania spisu treści Bazy Wiedzy.');
            const menuData = await response.json();
            
            dom.menuRoot.innerHTML = '';
            menuData.children
                .sort((a,b) => a.name.localeCompare(b.name))
                .forEach(item => {
                    dom.menuRoot.appendChild(buildMenuItem(item));
            });
            
            const firstArticleNode = dom.menuRoot.querySelector('[data-file]');
            if (firstArticleNode) {
                firstArticleNode.classList.add('is-active');
                displayArticle(firstArticleNode.dataset.file, firstArticleNode.dataset.title);
            }

        } catch (error) {
            console.error(error);
            dom.articleContainer.innerHTML = `<p>Nie udało się załadować struktury Bazy Wiedzy.</p>`;
        }
    }

    initializeWiki();
});
