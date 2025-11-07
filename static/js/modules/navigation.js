// Navigation Module - Updated for proper URL routing
const NavigationModule = {
    // Initialize navigation functionality
    init() {
        this.navLinks = document.querySelectorAll('.nav-link[data-section]');
        this.sections = document.querySelectorAll('.content-section');
        this.sectionTitle = document.getElementById('sectionTitle');
        
        this.setupEventListeners();
        this.loadInitialSection();
        
        // Add debugging for development
        this.addDebugSupport();
    },

    // Add debugging support for development
    addDebugSupport() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.navDebug = {
                showSection: (section) => this.showSection(section),
                getValidSections: () => ['dashboard', 'upload', 'candidates', 'analytics', 'job-postings', 'settings', 'user-management'],
                getCurrentSection: () => this.getCurrentSectionFromUrl(),
                testFallback: (invalidSection) => this.showNotFoundFallback(invalidSection)
            };
            console.log('Navigation debug tools available at window.navDebug');
        }
    },

    // Get current section from URL path or server variable
    getCurrentSectionFromUrl() {
        // First try to get from server-provided variable
        if (window.currentSection) {
            return window.currentSection;
        }
        
        // Fallback to URL path parsing
        const path = window.location.pathname;
        if (path === '/' || path === '/dashboard') {
            return 'dashboard';
        }
        // Remove leading slash and return the section
        return path.slice(1);
    },

    // Show a specific section
    showSection(sectionId) {
        // Validate section ID and provide fallback
        const validSections = ['dashboard', 'upload', 'candidates', 'analytics', 'job-postings', 'settings', 'user-management'];
        
        // Check if the section is valid
        if (!validSections.includes(sectionId)) {
            console.warn(`Invalid section: ${sectionId}. Redirecting to dashboard.`);
            this.showNotFoundFallback(sectionId);
            return;
        }

        // Hide all sections first
        this.sections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Remove active class from all nav links
        this.navLinks.forEach(link => link.classList.remove('active'));

        // Show the target section
        const targetSection = document.getElementById(`${sectionId}Section`);
        const targetLink = document.querySelector(`[data-section="${sectionId}"]`);

        if (targetSection && targetLink) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
            targetLink.classList.add('active');
            
            // Update page title
            if (this.sectionTitle) {
                const titleSpan = targetLink.querySelector('span');
                this.sectionTitle.textContent = titleSpan ? titleSpan.textContent : sectionId;
            }
            
            // Load section-specific data
            this.loadSectionData(sectionId);
        } else {
            // Section exists in valid list but DOM element not found
            console.error(`Section DOM element not found for: ${sectionId}`);
            this.showNotFoundFallback(sectionId);
        }
    },

    // Load data for specific sections
    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'upload':
                if (typeof UploadModule !== 'undefined' && UploadModule.init) {
                    UploadModule.init();
                }
                if (typeof loadJobCategoriesForUpload === 'function') {
                    loadJobCategoriesForUpload();
                }
                break;
            case 'candidates':
                console.log('🎯 Navigation: Loading candidates section');
                
                // Show immediate loading indicator for better UX
                const candidatesContent = document.getElementById('candidatesContent');
                if (candidatesContent && 
                    (!candidatesContent.innerHTML.trim() || 
                     candidatesContent.innerHTML.includes('will be loaded dynamically'))) {
                    candidatesContent.innerHTML = `
                        <div class="candidates-loading-container" data-loading-type="nav-initial">
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary mb-3" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <h5 class="text-muted mb-2">Loading Candidates</h5>
                                <p class="text-muted small">Please wait while we fetch the candidate data...</p>
                            </div>
                        </div>
                    `;
                }
                
                // Enhanced candidates section loading with better timing
                const loadCandidatesData = () => {
                    if (typeof CandidatesModule !== 'undefined') {
                        console.log('✅ CandidatesModule found');
                        
                        // Ensure module is initialized first
                        if (!CandidatesModule.candidatesContent) {
                            console.log('🔄 Re-initializing CandidatesModule...');
                            CandidatesModule.init();
                        }
                        
                        // Clear any existing loading states to prevent duplicates
                        if (typeof CandidatesModule.clearAllLoadingStates === 'function') {
                            CandidatesModule.clearAllLoadingStates();
                        }
                        
                        // Load data if not already loaded
                        if (!CandidatesModule.hasLoadedInitially || !CandidatesModule.candidatesData) {
                            console.log('📊 Loading candidates data for first time or refreshing...');
                            CandidatesModule.loadCandidates();
                        } else {
                            console.log('✅ Candidates data already loaded');
                        }
                    } else if (typeof loadCandidatesSection === 'function') {
                        console.log('🔄 Using fallback loadCandidatesSection function');
                        loadCandidatesSection();
                    } else {
                        console.warn('⚠️ Neither CandidatesModule nor loadCandidatesSection available, retrying...');
                        // Retry after a short delay in case modules are still loading
                        setTimeout(loadCandidatesData, 100);
                    }
                };
                
                // Execute immediately
                loadCandidatesData();
                break;
            case 'dashboard':
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
                break;
            case 'analytics':
                if (typeof loadAnalytics === 'function') {
                    loadAnalytics();
                }
                break;
            case 'job-postings':
                if (typeof jobPostingManager !== 'undefined' && jobPostingManager.loadJobPostings) {
                    // Show the job posting management section
                    const jobPostingSection = document.getElementById('jobPostingManagement');
                    if (jobPostingSection) {
                        jobPostingSection.style.display = 'block';
                        jobPostingManager.loadJobPostings();
                    }
                }
                break;
            case 'user-management':
                if (typeof UserManagementModule !== 'undefined' && UserManagementModule.loadUsers) {
                    UserManagementModule.loadUsers();
                }
                break;
        }
    },

    // Show fallback for invalid sections
    showNotFoundFallback(invalidSection) {
        // For invalid sections, redirect to dashboard URL
        window.location.href = '/dashboard';
    },

    // Setup event listeners
    setupEventListeners() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const section = link.getAttribute('data-section');
                if (section) {
                    // For same-page sections, prevent default and show section
                    // The server routing will handle the URL change
                    const currentSection = this.getCurrentSectionFromUrl();
                    if (currentSection === section) {
                        e.preventDefault();
                        this.showSection(section);
                    }
                    // If different section, allow normal navigation to new URL
                }
                // Allow normal navigation for links without data-section (like logout)
            });
        });
    },

    // Load initial section based on current URL
    loadInitialSection() {
        const currentSection = this.getCurrentSectionFromUrl();
        this.showSection(currentSection);
    }
};

// Make globally available
window.NavigationModule = NavigationModule;
window.showSection = NavigationModule.showSection.bind(NavigationModule);

// Backward compatibility
window.setupNavigation = NavigationModule.init.bind(NavigationModule);
