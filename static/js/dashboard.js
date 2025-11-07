// Main Dashboard Application
// All utility functions and services are now modularized
// This file now focuses on orchestrating the main application functionality

// Initialize all functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard DOM loaded, initializing...');
    
    // Initialize basic components first - order matters
    try {
        if (typeof BootstrapInit !== 'undefined') {
            BootstrapInit.init();
        } else {
            console.warn('BootstrapInit not available');
        }
    } catch (e) {
        console.warn('BootstrapInit failed:', e);
    }
    
    // Initialize theme manager early to prevent flashing
    try {
        if (typeof ThemeManager !== 'undefined') {
            ThemeManager.init();
        } else {
            console.warn('ThemeManager not available');
        }
    } catch (e) {
        console.warn('ThemeManager failed:', e);
    }
    
    // Initialize navigation - this is essential
    try {
        if (typeof NavigationModule !== 'undefined') {
            NavigationModule.init();
        } else {
            // Fallback navigation setup
            console.log('Using fallback navigation setup');
            setupBasicNavigation();
        }
    } catch (e) {
        console.error('Navigation initialization failed:', e);
        setupBasicNavigation();
    }
    
    // Initialize feature modules
    try {
        if (typeof CandidatesModule !== 'undefined') {
            CandidatesModule.init();
            console.log('CandidatesModule initialized');
        } else {
            console.warn('CandidatesModule not available');
        }
    } catch (e) {
        console.error('CandidatesModule initialization failed:', e);
    }

    // Setup application features
    setupSidebarToggle();
    setupFileUploadHandlers();
    
    // Make UploadModule available globally for compatibility
    if (typeof UploadModule !== 'undefined') {
        window.UploadModule = UploadModule;
        window.triggerFileUpload = (mode) => UploadModule.triggerFileUpload(mode);
    }
    
    console.log('Dashboard initialized successfully');
});

// Keep backward compatibility for existing functions
const API = CONFIG.API;
const showToast = (message, type, options) => ToastUtils.showToast(message, type, options);
const formatDate = FormatUtils.formatDate;

// Utility functions for file handling and display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getScoreColorClass(score) {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
}

// Global variables
let selectedJobId = null;
let selectedFiles = [];

// Fallback navigation setup
function setupBasicNavigation() {
    console.log('Setting up basic navigation fallback');
    
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    const sections = document.querySelectorAll('.content-section');
    const sectionTitle = document.getElementById('sectionTitle');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            
            // Hide all sections
            sections.forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            
            // Remove active class from all nav links
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            
            // Show target section
            const targetSection = document.getElementById(`${sectionId}Section`);
            if (targetSection) {
                targetSection.style.display = 'block';
                targetSection.classList.add('active');
                link.classList.add('active');
                
                // Update page title
                if (sectionTitle) {
                    const titleSpan = link.querySelector('span');
                    sectionTitle.textContent = titleSpan ? titleSpan.textContent : sectionId;
                }
                
                // Load section data
                loadSectionData(sectionId);
            }
        });
    });
    
    // Load initial section (upload by default)
    const defaultSection = document.querySelector('.nav-link[data-section="upload"]');
    if (defaultSection) {
        defaultSection.click();
    }
}

function loadSectionData(sectionId) {
    console.log('Loading data for section:', sectionId);
    
    switch(sectionId) {
        case 'upload':
            // Initialize upload module with retry mechanism
            const initUploadModule = () => {
                console.log('📤 Upload section loaded - checking UploadModule...');
                console.log('🔍 UploadModule type:', typeof UploadModule);
                console.log('🔍 Available globals:', Object.keys(window).filter(key => key.includes('Module') || key.includes('upload')));
                
                if (typeof UploadModule !== 'undefined' && UploadModule.init) {
                    console.log('✅ UploadModule found, initializing...');
                    try {
                        UploadModule.init();
                        UploadModule.loadJobPostings();
                        console.log('✅ UploadModule initialization complete');
                    } catch (error) {
                        console.error('❌ Error initializing UploadModule:', error);
                    }
                } else {
                    console.warn('⚠️ UploadModule not found, retrying in 100ms...');
                    setTimeout(initUploadModule, 100);
                }
            };
            
            initUploadModule();
            break;
        case 'analytics':
            console.log('Analytics section loaded');
            break;
        case 'candidates':
            console.log('Candidates section loaded');
            break;
        case 'settings':
            console.log('Settings section loaded');
            break;
        default:
            console.log('Unknown section:', sectionId);
    }
}

// Navigation Setup - now delegated to NavigationModule
function setupNavigation() {
    // Deprecated: Use NavigationModule.init() instead
    NavigationModule.init();
}

// Sidebar toggle
function setupSidebarToggle() {
    console.log('🔧 Setting up sidebar toggle...');
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    const floatingSidebarToggle = document.getElementById('floatingSidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Debug: Log which elements are found
    console.log('Sidebar elements found:', {
        sidebarToggle: !!sidebarToggle,
        floatingSidebarToggle: !!floatingSidebarToggle,
        sidebar: !!sidebar,
        mainContent: !!mainContent,
        sidebarOverlay: !!sidebarOverlay
    });
    
    if (!sidebarToggle) {
        console.error('❌ sidebarToggle button not found!');
        return;
    }
    
    if (!sidebar) {
        console.error('❌ sidebar element not found!');
        return;
    }
    
    if (!mainContent) {
        console.error('❌ mainContent element not found!');
        return;
    }
    
    // Check if we're on mobile
    const isMobile = () => window.innerWidth <= 992;
    
    console.log('📱 Current screen mode:', isMobile() ? 'Mobile' : 'Desktop');
    
    // Load saved state from storage (only for desktop)
    if (!isMobile()) {
        const sidebarCollapsed = StorageService.app.getSidebarCollapsed();
        if (sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        }
        console.log('📁 Loaded saved sidebar state:', sidebarCollapsed ? 'collapsed' : 'expanded');
    }
    
    // Toggle function
    const toggleSidebar = () => {
        console.log('🎯 Sidebar toggle clicked!');
        
        if (isMobile()) {
            // Mobile behavior: show/hide sidebar with overlay
            const isActive = sidebar.classList.toggle('active');
            console.log('📱 Mobile sidebar toggled:', isActive ? 'active' : 'inactive');
            
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active', isActive);
            }
            // Prevent body scroll when sidebar is open
            document.body.classList.toggle('sidebar-open', isActive);
        } else {
            // Desktop behavior: collapse/expand sidebar
            const isCollapsed = sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded', isCollapsed);
            StorageService.app.setSidebarCollapsed(isCollapsed);
            console.log('🖥️ Desktop sidebar toggled:', isCollapsed ? 'collapsed' : 'expanded');
        }
    };
    
    // Close mobile sidebar
    const closeMobileSidebar = () => {
        if (isMobile()) {
            console.log('📱 Closing mobile sidebar');
            sidebar.classList.remove('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('active');
            }
            document.body.classList.remove('sidebar-open');
        }
    };
    
    // Attach click handlers
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎯 Main sidebar toggle clicked');
            toggleSidebar();
        });
        console.log('✅ Main sidebar toggle listener attached');
    }
    
    if (floatingSidebarToggle) {
        floatingSidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎯 Floating sidebar toggle clicked');
            toggleSidebar();
        });
        console.log('✅ Floating sidebar toggle listener attached');
    }
    
    // Close sidebar when clicking overlay on mobile
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            console.log('🎯 Overlay clicked');
            closeMobileSidebar();
        });
        console.log('✅ Overlay click listener attached');
    }
    
    // Close sidebar when clicking nav links on mobile
    const navLinks = sidebar.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (isMobile()) {
                console.log('🎯 Nav link clicked on mobile - closing sidebar');
                closeMobileSidebar();
            }
        });
    });
    console.log(`✅ Nav link listeners attached to ${navLinks.length} links`);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const wasMobile = document.body.dataset.wasMobile === 'true';
        const nowMobile = isMobile();
        
        if (wasMobile !== nowMobile) {
            console.log('📐 Screen mode changed:', nowMobile ? 'Desktop → Mobile' : 'Mobile → Desktop');
            document.body.dataset.wasMobile = nowMobile.toString();
            
            if (!nowMobile) {
                // On desktop, remove mobile classes and restore saved state
                sidebar.classList.remove('active');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('active');
                }
                document.body.classList.remove('sidebar-open');
                
                // Restore desktop saved state
                const sidebarCollapsed = StorageService.app.getSidebarCollapsed();
                if (sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    mainContent.classList.add('expanded');
                } else {
                    sidebar.classList.remove('collapsed');
                    mainContent.classList.remove('expanded');
                }
            } else {
                // On mobile, remove desktop classes
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
            }
        }
    });
    
    // Set initial mobile state
    document.body.dataset.wasMobile = isMobile().toString();
    
    // Add keyboard shortcut (Ctrl+B or Cmd+B) to toggle sidebar
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            console.log('⌨️ Keyboard shortcut used');
            toggleSidebar();
        }
        
        // ESC key to close mobile sidebar
        if (e.key === 'Escape' && isMobile() && sidebar.classList.contains('active')) {
            console.log('⌨️ ESC key pressed - closing mobile sidebar');
            closeMobileSidebar();
        }
    });
    
    console.log('✅ Sidebar toggle setup complete!');
}

// Global function to show sidebar (accessible from console)
window.showSidebar = function() {
    console.log('🌍 Global showSidebar called');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const isMobile = () => window.innerWidth <= 992;
    
    if (sidebar && mainContent) {
        if (isMobile()) {
            sidebar.classList.add('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('active');
            }
            document.body.classList.add('sidebar-open');
            console.log('📱 Global: Mobile sidebar shown');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
            StorageService.app.setSidebarCollapsed(false);
            console.log('🖥️ Global: Desktop sidebar shown');
        }
        console.log('Sidebar is now visible');
    } else {
        console.error('❌ Global showSidebar: Required elements not found');
    }
};

// Global function to toggle sidebar (accessible from console)
window.toggleSidebar = function() {
    console.log('🌍 Global toggleSidebar called');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const isMobile = () => window.innerWidth <= 992;
    
    if (sidebar && mainContent) {
        if (isMobile()) {
            const isActive = sidebar.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active', isActive);
            }
            document.body.classList.toggle('sidebar-open', isActive);
            console.log('📱 Global: Mobile sidebar toggled:', isActive ? 'visible' : 'hidden');
        } else {
            const isCollapsed = sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded', isCollapsed);
            StorageService.app.setSidebarCollapsed(isCollapsed);
            console.log('🖥️ Global: Desktop sidebar toggled:', isCollapsed ? 'hidden' : 'visible');
        }
        console.log('Sidebar toggled:', 
            isMobile() ? 
                (sidebar.classList.contains('active') ? 'visible' : 'hidden') :
                (sidebar.classList.contains('collapsed') ? 'hidden' : 'visible')
        );
    } else {
        console.error('❌ Global toggleSidebar: Required elements not found');
    }
};

// Keep backward compatibility - delegate to new components
function initializeBootstrapComponents() {
    BootstrapInit.init();
}

function setupThemeToggle() {
    // Deprecated: Use ThemeManager.init() instead
    ThemeManager.init();
}

// Upload functionality - original simple version
async function loadJobCategoriesForUpload() {
    try {
        console.log('Loading job categories for upload...');
        
        // Try to get LSPU job postings first
        let response = await fetch('/api/lspu-job-postings');
        let data;
        
        if (response.ok) {
            data = await response.json();
            console.log('LSPU jobs response:', data);
        } else {
            // Load LSPU job postings
            response = await fetch('/api/job-postings');
            if (!response.ok) {
                throw new Error(`Failed to load job postings: ${response.status} ${response.statusText}`);
            }
            data = await response.json();
            console.log('Regular jobs response:', data);
        }
        
        // Handle different response formats
        let jobs;
        if (Array.isArray(data)) {
            jobs = data;
        } else if (data && Array.isArray(data.jobs)) {
            jobs = data.jobs;
        } else if (data && Array.isArray(data.data)) {
            jobs = data.data;
        } else if (data && Array.isArray(data.postings)) {
            // Handle LSPU job postings format
            jobs = data.postings;
        } else {
            console.error('Unexpected API response format:', data);
            jobs = [];
        }
        
        console.log('Processed jobs array:', jobs);
        
        // Try multiple container IDs for compatibility
        const containerIds = ['positionTypesUpload', 'jobCategoriesUpload', 'jobSelectContainer', 'uploadJobSelection'];
        let container = null;
        
        for (const id of containerIds) {
            container = document.getElementById(id);
            if (container) break;
        }
        
        if (!container) {
            console.log('No job selection container found. Checked IDs:', containerIds);
            console.log('Available elements with "position" in ID:');
            document.querySelectorAll('[id*="position"]').forEach(el => {
                console.log('- Element found:', el.id, el);
            });
            // This is expected behavior if we're not on the upload page
            return;
        }
        
        console.log('✅ Found container:', container.id, container);
        
        if (!jobs || jobs.length === 0) {
            container.innerHTML = `
                <div class="no-jobs-message">
                    <i class="fas fa-briefcase"></i>
                    <h3>No Job Positions Available</h3>
                    <p>Please add job positions to begin resume screening.</p>
                </div>
            `;
            return;
        }
        
        // Generate job cards using the correct format for upload section
        container.innerHTML = jobs.map(job => `
            <div class="position-type-card" data-job-id="${job.id}">
                <div class="position-type-header">
                    <h4>${escapeHtml(job.title || job.position_title || 'Untitled Position')}</h4>
                    <div class="job-posting-badges">
                        <span class="badge bg-primary">${escapeHtml(job.position_type || 'University Position')}</span>
                        <span class="badge bg-info">${escapeHtml(job.campus || 'Main Campus')}</span>
                        ${job.status ? `<span class="badge bg-success">${escapeHtml(job.status)}</span>` : ''}
                    </div>
                </div>
                <div class="position-type-body">
                    <div class="job-posting-details">
                        <p class="job-reference"><strong>Ref:</strong> ${escapeHtml(job.reference_number || 'N/A')}</p>
                        ${job.quantity ? `<p class="job-quantity"><strong>Positions:</strong> ${job.quantity}</p>` : ''}
                        ${job.deadline ? `<p class="job-deadline"><strong>Deadline:</strong> ${new Date(job.deadline).toLocaleDateString()}</p>` : ''}
                    </div>
                </div>
                <div class="position-type-footer">
                    <button class="btn btn-primary select-position" data-job-id="${job.id}" data-job-title="${escapeHtml(job.title || job.position_title || 'Untitled Position')}" onclick="selectJobForUpload(${job.id}, ${JSON.stringify(job).replace(/"/g, '&quot;')})">
                        <i class="fas fa-check-circle me-2"></i>Select Position
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Successfully populated container with', jobs.length, 'job cards');
        console.log('Container content length:', container.innerHTML.length);
        
    } catch (error) {
        console.error('Error loading job categories:', error);
        showToast('Failed to load job categories. Please try again.', 'error');
    }
}

// Job selection functionality
function selectJob(jobId) {
    selectedJobId = jobId;
    
    // Also update UploadModule if available
    if (typeof UploadModule !== 'undefined') {
        UploadModule.selectedJobId = jobId;
        UploadModule.updateUploadButton();
    }
    
    // Update UI to show selected job
    document.querySelectorAll('.job-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`[data-job-id="${jobId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        
        // Show upload zone
        const uploadInstructions = document.getElementById('uploadInstructions');
        const uploadZone = document.getElementById('uploadZone');
        
        if (uploadInstructions && uploadZone) {
            uploadInstructions.style.display = 'none';
            uploadZone.style.display = 'block';
        }
        
        // Show selected job details (if exists)
        showSelectedJobDetails(jobId);
    }
}

function showSelectedJobDetails(jobId) {
    // Find the selected job data
    const jobCard = document.querySelector(`[data-job-id="${jobId}"]`);
    if (!jobCard) return;
    
    const jobTitle = jobCard.querySelector('h3')?.textContent || 'Unknown Job';
    const jobDepartment = jobCard.querySelector('.job-department')?.textContent || 'General';
    const jobDescription = jobCard.querySelector('p')?.textContent || '';
    
    // Show selected job information in the upload area
    const selectedJobInfo = document.getElementById('selectedJobInfo');
    if (selectedJobInfo) {
        selectedJobInfo.innerHTML = `
            <div class="alert alert-info mb-3" role="alert">
                <div class="d-flex align-items-center">
                    <i class="fas fa-briefcase me-2"></i>
                    <div class="flex-grow-1">
                        <strong>Target Position:</strong> ${escapeHtml(jobTitle)}
                        <br>
                        <small class="text-muted">Department: ${escapeHtml(jobDepartment)}</small>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearJobSelection()">
                        <i class="fas fa-times"></i> Change
                    </button>
                </div>
            </div>
        `;
        selectedJobInfo.style.display = 'block';
    }
    
    // Also update the upload stats with job information
    updateUploadButtonState();
    
    console.log('Selected job:', jobId, jobTitle);
}

function clearJobSelection() {
    selectedJobId = null;
    
    // Also update UploadModule if available
    if (typeof UploadModule !== 'undefined') {
        UploadModule.selectedJobId = null;
        UploadModule.updateUploadButton();
    }
    
    // Update UI
    document.querySelectorAll('.job-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Hide upload zone
    const uploadInstructions = document.getElementById('uploadInstructions');
    const uploadZone = document.getElementById('uploadZone');
    const selectedJobInfo = document.getElementById('selectedJobInfo');
    
    if (uploadInstructions && uploadZone) {
        uploadInstructions.style.display = 'block';
        uploadZone.style.display = 'none';
    }
    
    if (selectedJobInfo) {
        selectedJobInfo.style.display = 'none';
        selectedJobInfo.innerHTML = '';
    }
    
    // Clear any selected files as well
    clearSelectedFiles();
}

// File upload functionality - DISABLED (handled by UploadModule)
function triggerFileUpload() {
    console.log('triggerFileUpload - disabled, handled by UploadModule');
    // File upload functionality is now handled by the UploadModule
}

// File handling and preview functionality
function setupFileUploadHandlers() {
    // Upload functionality is now handled by the UploadModule
    // Dashboard upload handlers are disabled to prevent conflicts
    console.log('Upload handlers setup - delegated to UploadModule');
    
    // Initialize the upload module for this section
    if (typeof UploadModule !== 'undefined') {
        UploadModule.init();
    }
}

function handleFileSelection(event) {
    console.log('handleFileSelection - disabled, handled by UploadModule');
    // File selection is now handled by the UploadModule
}

function isValidFile(file) {
    // Check file type
    const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'xls'];
    const fileExt = file.name.toLowerCase().split('.').pop();
    
    if (!allowedTypes.includes(fileExt)) {
        return false;
    }
    
    // Check file size (16MB max)
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
        return false;
    }
    
    return true;
}

function handleDragOver(event) {
    console.log('handleDragOver - disabled, handled by UploadModule');
    // Drag and drop is now handled by the UploadModule
}

function handleDragEnter(event) {
    console.log('handleDragEnter - disabled, handled by UploadModule');
    // Drag and drop is now handled by the UploadModule
}

function handleDragLeave(event) {
    console.log('handleDragLeave - disabled, handled by UploadModule');
    // Drag and drop is now handled by the UploadModule
}

function handleFileDrop(event) {
    console.log('handleFileDrop - disabled, handled by UploadModule');
    // Drag and drop is now handled by the UploadModule
}

function displayFilePreview() {
    console.log('displayFilePreview - disabled, handled by UploadModule');
    // File preview is now handled by the UploadModule
}

function getFileIcon(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
        case 'pdf': return 'pdf text-danger';
        case 'doc':
        case 'docx': return 'word text-primary';
        case 'txt': return 'alt text-secondary';
        case 'xlsx':
        case 'xls': return 'excel text-success';
        default: return 'alt text-muted';
    }
}

function removeFile(index) {
    console.log('removeFile - disabled, handled by UploadModule');
    // File removal is now handled by the UploadModule
}

function updateUploadStats() {
    console.log('updateUploadStats - disabled, handled by UploadModule');
    // Upload stats are now handled by the UploadModule
}

function updateUploadButtonState() {
    console.log('updateUploadButtonState - disabled, handled by UploadModule');
    // Button state is now handled by the UploadModule
}

function showUploadActions() {
    console.log('showUploadActions - disabled, handled by UploadModule');
    // Upload actions are now handled by the UploadModule
}

function clearSelectedFiles() {
    console.log('clearSelectedFiles - disabled, handled by UploadModule');
    // File clearing is now handled by the UploadModule
}

async function startFileAnalysis() {
    console.log('startFileAnalysis - disabled, handled by UploadModule');
    // File analysis is now handled by the UploadModule
    // This function has been disabled to prevent conflicts with the new upload system
}

function showResultsSection(results) {
    const resultsStep = document.getElementById('resultsStep');
    const rankingResults = document.getElementById('rankingResults');
    
    if (resultsStep) {
        resultsStep.style.display = 'block';
        resultsStep.scrollIntoView({ behavior: 'smooth' });
    }
    
    if (rankingResults && results) {
        // Display results
        displayRankingResults(results);
        
        // Update summary stats
        updateResultsSummary(results);
    }
}

function updateResultsSummary(results) {
    const processedCount = document.getElementById('processedCount');
    const avgScore = document.getElementById('avgScore');
    const topCandidates = document.getElementById('topCandidates');
    
    if (processedCount) {
        processedCount.textContent = results.length;
    }
    
    if (avgScore && results.length > 0) {
        const scores = results.map(r => r.matchScore || r.total_score || 0);
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        avgScore.textContent = Math.round(average) + '%';
    }
    
    if (topCandidates) {
        const highScorers = results.filter(r => (r.matchScore || r.total_score || 0) >= 70);
        topCandidates.textContent = highScorers.length;
    }
}

// Make functions globally available
window.selectJob = selectJob;
window.clearJobSelection = clearJobSelection;
window.triggerFileUpload = triggerFileUpload;
window.loadJobCategoriesForUpload = loadJobCategoriesForUpload;
window.removeFile = removeFile;
window.clearSelectedFiles = clearSelectedFiles;
window.setupFileUploadHandlers = setupFileUploadHandlers;

function displayRankingResults(results) {
    const rankingResults = document.getElementById('rankingResults');
    if (!rankingResults || !results || results.length === 0) {
        if (rankingResults) {
            rankingResults.innerHTML = '<div class="no-results">No results to display</div>';
        }
        return;
    }

    rankingResults.innerHTML = results.map((result, index) => {
        const score = result.matchScore || result.total_score || 0;
        const scoreClass = getScoreColorClass(score);
        
        return `
            <div class="result-item">
                <div class="result-header">
                    <div class="result-rank">#${index + 1}</div>
                    <div class="result-info">
                        <h4 class="candidate-name">${escapeHtml(result.name || 'Unknown')}</h4>
                        <p class="candidate-email">${escapeHtml(result.email || '')}</p>
                    </div>
                    <div class="result-score">
                        <span class="score-value ${scoreClass}">${score}%</span>
                        <span class="score-label">Match</span>
                    </div>
                </div>
                <div class="result-details">
                    ${result.matchedSkills ? `
                        <div class="matched-skills">
                            <strong>Matched Skills:</strong>
                            <div class="skills-list">
                                ${result.matchedSkills.map(skill => `<span class="skill-tag matched">${escapeHtml(skill)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${result.missingSkills && result.missingSkills.length > 0 ? `
                        <div class="missing-skills">
                            <strong>Missing Skills:</strong>
                            <div class="skills-list">
                                ${result.missingSkills.map(skill => `<span class="skill-tag missing">${escapeHtml(skill)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${result.education ? `
                        <div class="education-info">
                            <strong>Education:</strong> ${escapeHtml(JSON.stringify(result.education))}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    console.log('Displaying ranking results:', results);
}

// =============================================================================
// REFACTORING COMPLETE
// =============================================================================
// This file has been successfully refactored and modularized.
// All major functionality has been delegated to appropriate modules:
//
// - NavigationModule: Navigation and routing
// - UploadModule: Resume upload and job selection
// - JobsModule: Job management and categories
// - CandidatesModule: Candidate management and display
// - AnalyticsModule: Analytics, charts, and metrics
// - DashboardModule: Dashboard data loading and widgets
//
// Legacy functions are maintained for backward compatibility but are
// deprecated and delegate to their respective modules.
// =============================================================================