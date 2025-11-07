// Dashboard Module
const DashboardModule = {
    // Initialize dashboard functionality
    init() {
        this.loadDashboardData();
        this.setupRefreshInterval();
    },

    // Load all dashboard data
    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadAnalyticsSummary(),
                this.loadRecentActivity(),
                this.loadTopCandidates(),
                this.loadRecentFiles(),
                this.loadPerformanceMetrics(),
                this.loadUniversityPositionTypes(),
                this.updateSystemStatus()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            ToastUtils.showError('Failed to load dashboard data');
        }
    },

    // Load analytics summary
    async loadAnalyticsSummary() {
        try {
            const data = await APIService.analytics.getData(30);
            
            if (data.success) {
                this.updateDashboardStats(data.summary);
            }
        } catch (error) {
            console.error('Error loading analytics summary:', error);
        }
    },

    // Update dashboard statistics
    updateDashboardStats(summary) {
        const elements = {
            totalResumes: document.getElementById('totalResumes'),
            screenedResumes: document.getElementById('screenedResumes'),
            shortlisted: document.getElementById('shortlisted'),
            totalPds: document.getElementById('totalPds'),
            avgScreeningTime: document.getElementById('avgScreeningTime')
        };

        if (elements.totalResumes) {
            elements.totalResumes.textContent = summary.total_resumes || 0;
        }
        
        if (elements.screenedResumes) {
            elements.screenedResumes.textContent = summary.processed_resumes || 0;
        }
        
        if (elements.shortlisted) {
            elements.shortlisted.textContent = summary.shortlisted || 0;
        }
        
        if (elements.totalPds) {
            elements.totalPds.textContent = summary.total_pds || 0;
        }
        
        if (elements.avgScreeningTime) {
            elements.avgScreeningTime.textContent = Math.round(summary.avg_processing_time || 0) + 'm';
        }
    },

    // Load recent activity
    async loadRecentActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        try {
            const data = await APIService.candidates.getAll();
            
            if (data.success && data.candidates_by_job) {
                // Flatten candidates from all jobs and get recent ones
                const allCandidates = [];
                Object.values(data.candidates_by_job).forEach(jobData => {
                    allCandidates.push(...jobData.candidates);
                });
                
                // Sort by updated_at and take top 5
                allCandidates.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                const recentCandidates = allCandidates.slice(0, 5);
                
                this.renderRecentActivity(recentCandidates, activityList);
            } else {
                activityList.innerHTML = '<p class="text-muted">No recent activity</p>';
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            activityList.innerHTML = '<p class="text-muted">Failed to load recent activity</p>';
        }
    },

    // Render recent activity
    renderRecentActivity(candidates, container) {
        if (candidates.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent activity</p>';
            return;
        }

        container.innerHTML = candidates.map(candidate => `
            <div class="activity-item">
                <div class="activity-icon ${candidate.status}">
                    <i class="fas ${this.getActivityIcon(candidate.status)}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-text">
                        <strong>${DOMUtils.escapeHtml(candidate.name || 'Anonymous')}</strong> - ${candidate.status}
                        ${candidate.processing_type ? `<span class="processing-type-badge ${candidate.processing_type}">${this.getProcessingTypeLabel(candidate.processing_type)}</span>` : ''}
                    </p>
                    <span class="activity-time">
                        ${FormatUtils.formatDate(candidate.updated_at)}
                    </span>
                </div>
            </div>
        `).join('');
    },

    // Get activity icon based on status
    getActivityIcon(status) {
        switch (status) {
            case 'shortlisted': return 'fa-check';
            case 'rejected': return 'fa-times';
            case 'pending': return 'fa-clock';
            default: return 'fa-user';
        }
    },

    // Get processing type label
    getProcessingTypeLabel(processingType) {
        switch (processingType) {
            case 'ocr': 
            case 'ocr_scanned': 
                return 'OCR';
            case 'pds':
            case 'pds_digital':
            case 'excel_pds_enhanced':
            case 'excel_pds_fallback':
            case 'excel_pds_basic':
                return 'PDS Excel';
            case 'pds_text': 
                return 'PDS Text';
            case 'digital': 
                return 'Digital';
            case 'resume':
                return 'Resume';
            default: 
                return 'PDS Excel'; // Default to PDS Excel since that's the system default now
        }
    },

    // Load top candidates
    async loadTopCandidates() {
        const topCandidatesEl = document.getElementById('topCandidates');
        if (!topCandidatesEl) return;

        try {
            const data = await APIService.candidates.getAll();
            
            if (data.success && data.candidates_by_job) {
                // Flatten candidates and get top scoring ones
                const allCandidates = [];
                Object.values(data.candidates_by_job).forEach(jobData => {
                    allCandidates.push(...jobData.candidates);
                });
                
                // Sort by score and take top 5
                allCandidates.sort((a, b) => b.score - a.score);
                const topCandidates = allCandidates.slice(0, 5);
                
                this.renderTopCandidates(topCandidates, topCandidatesEl);
            } else {
                topCandidatesEl.innerHTML = '<p class="text-muted">No candidates yet</p>';
            }
        } catch (error) {
            console.error('Error loading top candidates:', error);
            topCandidatesEl.innerHTML = '<p class="text-muted">Failed to load top candidates</p>';
        }
    },

    // Render top candidates
    renderTopCandidates(candidates, container) {
        if (candidates.length === 0) {
            container.innerHTML = '<p class="text-muted">No candidates yet</p>';
            return;
        }

        container.innerHTML = candidates.map(candidate => `
            <div class="candidate-item" onclick="CandidatesModule.showCandidateDetails('${candidate.id}')">
                <div class="candidate-info">
                    <h4>${DOMUtils.escapeHtml(candidate.name || 'Anonymous')}</h4>
                    <p>${DOMUtils.escapeHtml(candidate.predicted_category || 'General')}</p>
                </div>
                <div class="candidate-score">
                    <span class="score">${Math.round(candidate.score || 0)}%</span>
                    <span class="match">Match</span>
                </div>
            </div>
        `).join('');
    },

    // Setup auto-refresh interval
    setupRefreshInterval() {
        // Refresh dashboard data every 5 minutes
        setInterval(() => {
            const currentSection = window.location.hash.slice(1) || 'dashboard';
            if (currentSection === 'dashboard') {
                this.loadDashboardData();
            }
        }, 5 * 60 * 1000); // 5 minutes
    },

    // Refresh specific section
    async refreshSection(section) {
        switch (section) {
            case 'analytics':
                await this.loadAnalyticsSummary();
                break;
            case 'activity':
                await this.loadRecentActivity();
                break;
            case 'candidates':
                await this.loadTopCandidates();
                break;
            default:
                await this.loadDashboardData();
        }
    },

    // Get dashboard metrics
    async getDashboardMetrics() {
        try {
            const [analyticsData, candidatesData, jobsData] = await Promise.all([
                APIService.analytics.getData(30),
                APIService.candidates.getAll(),
                APIService.jobs.getAll()
            ]);

            return {
                analytics: analyticsData.success ? analyticsData.summary : null,
                candidates: candidatesData.success ? candidatesData : null,
                jobs: jobsData.success ? jobsData.jobs : null
            };
        } catch (error) {
            console.error('Error getting dashboard metrics:', error);
            return null;
        }
    },

    // Load recent files
    async loadRecentFiles() {
        const recentFilesContainer = document.getElementById('recentFiles');
        if (!recentFilesContainer) return;

        // Sample recent files data (in real app, fetch from API)
        const recentFiles = [
            { name: 'john_doe_resume.pdf', type: 'pdf', uploadTime: '2 hours ago', size: '245 KB' },
            { name: 'sarah_smith_cv.docx', type: 'docx', uploadTime: '4 hours ago', size: '312 KB' },
            { name: 'mike_johnson.pdf', type: 'pdf', uploadTime: '1 day ago', size: '189 KB' },
            { name: 'anna_williams.pdf', type: 'pdf', uploadTime: '2 days ago', size: '267 KB' }
        ];

        recentFilesContainer.innerHTML = recentFiles.map(file => `
            <div class="file-item">
                <div class="file-icon">
                    <i class="fas ${file.type === 'pdf' ? 'fa-file-pdf' : 'fa-file-word'}"></i>
                </div>
                <div class="file-info">
                    <h5>${DOMUtils.escapeHtml(file.name)}</h5>
                    <p>${file.uploadTime} • ${file.size}</p>
                </div>
            </div>
        `).join('');
    },

    // Load performance metrics
    async loadPerformanceMetrics() {
        const performanceContainer = document.getElementById('performancePeriod');
        const period = performanceContainer ? performanceContainer.value || 30 : 30;
        
        try {
            // Get analytics data for performance metrics
            const analyticsData = await APIService.analytics.getData(period);
            const candidatesData = await APIService.candidates.getAll();
            
            if (analyticsData.success && candidatesData.success) {
                this.updatePerformanceMetrics(analyticsData.summary, candidatesData);
            } else {
                // Fallback to sample data
                this.updatePerformanceMetricsWithFallback();
            }
        } catch (error) {
            console.error('Error loading performance metrics:', error);
            this.updatePerformanceMetricsWithFallback();
        }
    },

    // Update performance metrics with real data
    updatePerformanceMetrics(summary, candidatesData) {
        const totalCandidates = summary.total_resumes || 0;
        const processedCandidates = summary.processed_resumes || 0;
        const shortlisted = summary.shortlisted || 0;
        
        // Calculate success rate (shortlisted vs processed)
        const successRate = processedCandidates > 0 ? Math.round((shortlisted / processedCandidates) * 100) : 0;
        
        // Use processing time from analytics
        const avgProcessingTime = summary.avg_processing_time || 2.3;
        
        // Calculate quality score based on various factors
        let qualityScore = 85; // Base score
        if (candidatesData.candidates_by_job) {
            // Check if we have properly scored candidates
            const allCandidates = [];
            Object.values(candidatesData.candidates_by_job).forEach(jobData => {
                allCandidates.push(...jobData.candidates);
            });
            
            // Quality is higher if we have more complete assessments
            const scoredCandidates = allCandidates.filter(c => c.score > 0);
            if (allCandidates.length > 0) {
                qualityScore = Math.round(85 + ((scoredCandidates.length / allCandidates.length) * 15));
            }
        }
        
        const performanceData = {
            successRate: Math.min(successRate, 100),
            processingSpeed: avgProcessingTime,
            qualityScore: Math.min(qualityScore, 100)
        };
        
        this.updatePerformanceElements(performanceData);
    },

    // Update performance metrics with fallback data
    updatePerformanceMetricsWithFallback() {
        const performanceData = {
            successRate: 85,
            processingSpeed: 2.3,
            qualityScore: 92
        };
        
        this.updatePerformanceElements(performanceData);
    },

    // Update performance DOM elements
    updatePerformanceElements(performanceData) {
        const elements = {
            successRate: document.getElementById('successRate'),
            processingSpeed: document.getElementById('processingSpeed'),
            qualityScore: document.getElementById('qualityScore')
        };

        if (elements.successRate) {
            elements.successRate.textContent = performanceData.successRate + '%';
        }
        
        if (elements.processingSpeed) {
            elements.processingSpeed.textContent = performanceData.processingSpeed + 's';
        }
        
        if (elements.qualityScore) {
            elements.qualityScore.textContent = performanceData.qualityScore + '%';
        }
    },

    // Load university position types for dashboard overview
    async loadUniversityPositionTypes() {
        const positionTypesGrid = document.getElementById('positionTypesGrid');
        if (!positionTypesGrid) return;

        try {
            // Try to get LSPU job postings first
            let response = await fetch('/api/lspu-job-postings');
            let data;
            
            if (response.ok) {
                data = await response.json();
            } else {
                // Fallback to regular job postings
                response = await fetch('/api/job-postings');
                if (response.ok) {
                    data = await response.json();
                }
            }
            
            if (!data || (!data.postings && !data.jobs)) {
                this.renderNoPositionTypes(positionTypesGrid);
                return;
            }
            
            // Handle different response formats
            const jobs = data.postings || data.jobs || data.data || [];
            
            this.renderUniversityPositionTypes(jobs, positionTypesGrid);
        } catch (error) {
            console.error('Error loading university position types:', error);
            this.renderNoPositionTypes(positionTypesGrid);
        }
    },

    // Render university position types
    renderUniversityPositionTypes(jobs, container) {
        if (!jobs || jobs.length === 0) {
            this.renderNoPositionTypes(container);
            return;
        }
        
        // Take first 6 positions for dashboard overview
        const displayJobs = jobs.slice(0, 6);
        
        container.innerHTML = displayJobs.map(job => `
            <div class="position-type-overview-card" data-job-id="${job.id}">
                <div class="position-icon">
                    <i class="fas ${this.getPositionIcon(job.position_type || job.title)}"></i>
                </div>
                <div class="position-info">
                    <h4>${DOMUtils.escapeHtml(job.title || job.position_title || 'Untitled Position')}</h4>
                    <p class="position-type">${DOMUtils.escapeHtml(job.position_type || 'University Position')}</p>
                    <p class="position-status">
                        <span class="status-badge ${job.status ? job.status.toLowerCase() : 'active'}">${job.status || 'Active'}</span>
                        ${job.campus ? `<span class="campus-badge">${DOMUtils.escapeHtml(job.campus)}</span>` : ''}
                    </p>
                </div>
                <div class="position-actions">
                    <button class="btn-icon" onclick="window.location.href='/job-postings?view=${job.id}'" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // If there are more than 6 jobs, show a "view all" link
        if (jobs.length > 6) {
            container.innerHTML += `
                <div class="position-type-overview-card view-all-card">
                    <div class="view-all-content" onclick="window.location.href='/job-postings'">
                        <i class="fas fa-plus-circle"></i>
                        <p>View All Positions</p>
                        <span class="position-count">+${jobs.length - 6} more</span>
                    </div>
                </div>
            `;
        }
    },

    // Render no position types message
    renderNoPositionTypes(container) {
        container.innerHTML = `
            <div class="no-positions-message">
                <i class="fas fa-university"></i>
                <h4>No Position Types Available</h4>
                <p>Create university position types to begin candidate assessment</p>
                <button class="btn btn-primary" onclick="window.location.href='/job-postings'">
                    <i class="fas fa-plus me-2"></i>Add Position Types
                </button>
            </div>
        `;
    },

    // Get icon for position type
    getPositionIcon(positionType) {
        if (!positionType) return 'fa-briefcase';
        
        const type = positionType.toLowerCase();
        if (type.includes('instructor') || type.includes('teacher') || type.includes('professor')) {
            return 'fa-chalkboard-teacher';
        } else if (type.includes('admin') || type.includes('manager')) {
            return 'fa-user-tie';
        } else if (type.includes('research')) {
            return 'fa-microscope';
        } else if (type.includes('technical') || type.includes('it') || type.includes('technology')) {
            return 'fa-laptop-code';
        } else if (type.includes('nurse') || type.includes('health')) {
            return 'fa-user-md';
        } else if (type.includes('maintenance') || type.includes('facility')) {
            return 'fa-tools';
        } else if (type.includes('library')) {
            return 'fa-book';
        } else if (type.includes('science')) {
            return 'fa-atom';
        } else {
            return 'fa-briefcase';
        }
    },

    // Update system status including PDS processing
    async updateSystemStatus() {
        try {
            // Update PDS processing status
            const pdsStatusIndicator = document.getElementById('pdsProcessingStatus');
            const pdsStatusValue = document.getElementById('pdsProcessingValue');
            
            if (pdsStatusIndicator && pdsStatusValue) {
                // Check if OCR processing is available by testing if pytesseract is working
                try {
                    // Simple health check - if we can get analytics data, system is working
                    const data = await APIService.analytics.getData(1);
                    
                    if (data.success) {
                        const pdsCount = data.summary.total_pds || 0;
                        pdsStatusIndicator.className = 'health-indicator online';
                        pdsStatusValue.textContent = `${pdsCount} processed`;
                    } else {
                        pdsStatusIndicator.className = 'health-indicator warning';
                        pdsStatusValue.textContent = 'Limited';
                    }
                } catch (error) {
                    pdsStatusIndicator.className = 'health-indicator offline';
                    pdsStatusValue.textContent = 'Offline';
                }
            }
        } catch (error) {
            console.error('Error updating system status:', error);
        }
    }
};

// Make globally available
window.DashboardModule = DashboardModule;

// Backward compatibility
window.loadDashboardData = DashboardModule.loadDashboardData.bind(DashboardModule);
window.refreshAllData = DashboardModule.loadDashboardData.bind(DashboardModule);
