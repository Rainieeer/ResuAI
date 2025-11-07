// Theme Management Component
const ThemeManager = {
    // Initialize theme functionality
    init() {
        this.html = document.documentElement;
        
        // Load theme immediately on init to prevent flickering
        this.loadSavedTheme();
        
        // Set up DOM elements after initial theme load
        this.initializeElements();
        this.setupEventListeners();
        
        console.log('ThemeManager initialized');
    },

    // Initialize DOM elements
    initializeElements() {
        // Wait for DOM to be ready if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.findThemeToggle();
            });
        } else {
            this.findThemeToggle();
        }
    },

    // Find and set up theme toggle button
    findThemeToggle() {
        this.themeToggle = document.getElementById('themeToggle');
        if (this.themeToggle) {
            this.updateToggleIcon();
            console.log('Theme toggle button found and initialized');
        } else {
            console.warn('Theme toggle button not found');
        }
    },

    // Load saved theme from storage
    loadSavedTheme() {
        try {
            const savedTheme = StorageService ? StorageService.app.getTheme() : 
                               (localStorage.getItem('theme') || 'light');
            this.setTheme(savedTheme, false); // Don't save on initial load
        } catch (error) {
            console.warn('Failed to load saved theme, using light theme:', error);
            this.setTheme('light', false);
        }
    },

    // Set theme
    setTheme(theme, saveToStorage = true) {
        if (!this.html) {
            console.error('HTML element not available for theme setting');
            return;
        }
        
        // Validate theme
        if (theme !== 'light' && theme !== 'dark') {
            console.warn(`Invalid theme "${theme}", defaulting to light`);
            theme = 'light';
        }
        
        // Set theme attribute
        this.html.setAttribute('data-theme', theme);
        
        // Update toggle icon
        this.updateToggleIcon();
        
        // Save theme preference if requested
        if (saveToStorage) {
            try {
                if (StorageService) {
                    StorageService.app.setTheme(theme);
                } else {
                    localStorage.setItem('theme', theme);
                }
            } catch (error) {
                console.error('Failed to save theme preference:', error);
            }
        }
        
        console.log(`Theme set to: ${theme}`);
    },

    // Update toggle icon based on current theme
    updateToggleIcon() {
        if (!this.themeToggle) return;
        
        const currentTheme = this.getCurrentTheme();
        this.themeToggle.innerHTML = currentTheme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    },

    // Toggle theme
    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        
        console.log(`Theme toggled from ${currentTheme} to ${newTheme}`);
    },

    // Setup event listeners
    setupEventListeners() {
        // Set up click handler for theme toggle
        document.addEventListener('click', (e) => {
            if (e.target && (e.target.id === 'themeToggle' || e.target.closest('#themeToggle'))) {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    },

    // Get current theme
    getCurrentTheme() {
        return this.html ? (this.html.getAttribute('data-theme') || 'light') : 'light';
    }
};

// Make available globally
window.ThemeManager = ThemeManager;

// Keep backward compatibility
window.setupThemeToggle = ThemeManager.init.bind(ThemeManager);
