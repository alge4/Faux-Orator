// static/js/sidebar_move.js

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    
    function adjustContentWidth() {
        const sidebarMaxWidth = 300;
        const sidebarWidth = Math.min(window.innerWidth * 0.2, sidebarMaxWidth);
        if (sidebar.classList.contains('hidden')) {
            content.style.width = '100%';
        } else {
            content.style.width = `calc(100% - ${sidebarWidth}px)`;
        }
    }

    toggleButton.addEventListener('click', function() {
        sidebar.classList.toggle('hidden');
        adjustContentWidth();
    });

    window.addEventListener('resize', function() {
        adjustContentWidth();
    });

    // Initial adjustment
    adjustContentWidth();
});
