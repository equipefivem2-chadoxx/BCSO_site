document.addEventListener('DOMContentLoaded', () => {
    // Ciblage du conteneur principal (s'adapte à ton HTML)
    const container = document.querySelector('#swup') || document.querySelector('.main-content-wrapper');
    if (!container) return;

    // Style de transition de base
    container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

    async function loadPage(url, pushState = true) {
        try {
            // 1. Animation de sortie (Disparition rapide)
            container.style.opacity = '0';
            container.style.transform = 'translateY(-6px)';

            // 2. Fetch du HTML de la nouvelle page
            const response = await fetch(url);
            if (!response.ok) { window.location.href = url; return; }

            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const newContent = doc.querySelector('#swup') || doc.querySelector('.main-content-wrapper');

            if (!newContent) {
                window.location.href = url;
                return;
            }

            setTimeout(() => {
                // 3. Remplacement du contenu
                container.innerHTML = newContent.innerHTML;

                // 4. Exécution propre des <script> contenus dans la nouvelle page
                container.querySelectorAll('script').forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    newScript.textContent = oldScript.textContent;
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                });

                // 5. Changement d'URL
                if (pushState) {
                    history.pushState({ url }, '', url);
                }

                // 6. Animation d'entrée
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';

                // Relance DOMContentLoaded pour réveiller les scripts
                window.dispatchEvent(new Event('DOMContentLoaded'));
            }, 200);

        } catch (err) {
            console.error("Erreur Router:", err);
            window.location.href = url; // Fallback classique si souci
        }
    }

    // Interception globale des clics sur les liens
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Ignorer les liens externes, ancres, ou téléchargements
        if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') return;

        e.preventDefault();
        loadPage(href);
    });

    // Gestion du bouton Suivant / Précédent du navigateur
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.url) {
            loadPage(e.state.url, false);
        } else {
            loadPage(window.location.pathname, false);
        }
    });
});