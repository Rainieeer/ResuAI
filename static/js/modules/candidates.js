// Candidates Module
const CandidatesModule = {
    candidatesContent: null,
    modal: null,
    searchInput: null,
    sortSelect: null,
    filterSelect: null,
    candidatesData: null,
    selectedCandidates: new Set(),
    isLoading: false,
    hasLoadedInitially: false,

    // Initialize candidates functionality
    init() {
        this.setupElements();
        this.setupEventListeners();
        this.initializeFilters();
        
        // Auto-load candidates data if this is the first initialization
        // and we have the necessary DOM elements
        if (!this.hasLoadedInitially && this.candidatesContent) {
            console.log('🚀 CandidatesModule: Auto-loading candidates on first init');
            this.loadCandidatesIfVisible();
        }
    },

    // Setup DOM elements
    setupElements() {
        this.candidatesContent = document.getElementById('candidatesContent');
        this.searchInput = document.getElementById('candidateSearch');
        this.sortSelect = document.getElementById('candidateSort');
        this.filterSelect = document.getElementById('candidateFilter');
        
        if (document.getElementById('candidateDetailsModal')) {
            this.modal = new bootstrap.Modal(document.getElementById('candidateDetailsModal'));
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshCandidates');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadCandidates();
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportCandidates');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCandidates();
            });
        }

        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce(() => {
                this.filterAndDisplayCandidates();
            }, 300));
        }

        // Sort functionality
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', () => {
                this.filterAndDisplayCandidates();
            });
        }

        // Filter functionality
        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', () => {
                this.filterAndDisplayCandidates();
            });
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Bulk actions
        const bulkActionsBtn = document.getElementById('bulkActions');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => {
                this.showBulkActionsMenu();
            });
        }

        // Modal action buttons
        this.setupModalActions();
    },

    // Initialize filters and controls
    initializeFilters() {
        // Set default values if elements exist
        if (this.sortSelect) {
            this.sortSelect.value = 'score-desc';
        }
        if (this.filterSelect) {
            this.filterSelect.value = 'all';
        }
    },

    // Load candidates if the section is currently visible
    loadCandidatesIfVisible() {
        // Check if candidates section is currently active/visible
        const candidatesSection = document.getElementById('candidatesSection');
        
        if (candidatesSection && 
            (candidatesSection.style.display !== 'none' && 
             candidatesSection.classList.contains('active') || 
             window.location.pathname === '/candidates' ||
             window.currentSection === 'candidates')) {
            
            console.log('📊 Candidates section is visible, loading data...');
            
            // Show immediate loading state if content is empty
            if (this.candidatesContent && 
                (!this.candidatesContent.innerHTML.trim() || 
                 this.candidatesContent.innerHTML.includes('will be loaded dynamically'))) {
                this.showInitialLoadingState();
            }
            
            this.loadCandidates();
        } else {
            console.log('📊 Candidates section not visible, data will load when section is shown');
        }
    },

    // Show initial loading state immediately
    showInitialLoadingState() {
        if (!this.candidatesContent) return;
        
        this.candidatesContent.innerHTML = `
            <div class="candidates-loading-container" data-loading-type="initial">
                <div class="text-center py-5">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <h5 class="text-muted mb-2">Loading Candidates</h5>
                    <p class="text-muted small">Initializing candidate data...</p>
                </div>
            </div>
        `;
    },

    // Debounce utility for search
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Load candidates from API
    async loadCandidates() {
        if (!this.candidatesContent) return;

        // Prevent duplicate loading if already in progress
        if (this.isLoading) {
            console.log('⚠️ Candidates already loading, skipping duplicate request');
            return;
        }

        this.setLoadingState(true);

        try {
            console.log('📊 Loading candidates data from API...');
            const data = await APIService.candidates.getAll();
            
            if (data.success) {
                this.candidatesData = data.candidates_by_job;
                this.totalCandidates = data.total_candidates;
                this.filterAndDisplayCandidates();
                this.updateCandidateStats();
                
                // Mark as loaded initially
                this.hasLoadedInitially = true;
                console.log('✅ Candidates data loaded successfully');
            } else {
                ToastUtils.showError('Failed to load candidates');
                console.error('❌ API returned error:', data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('❌ Error loading candidates:', error);
            ToastUtils.showError('Error loading candidates');
        } finally {
            // Always clean up loading states
            this.setLoadingState(false);
            
            // Extra cleanup to ensure no duplicate loading animations remain
            setTimeout(() => {
                this.clearAllLoadingStates();
            }, 100);
        }
    },

    // Filter and display candidates based on search, sort, and filter criteria
    filterAndDisplayCandidates() {
        if (!this.candidatesData) return;

        let filteredData = { ...this.candidatesData };
        const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
        const sortBy = this.sortSelect ? this.sortSelect.value : 'score-desc';
        const statusFilter = this.filterSelect ? this.filterSelect.value : 'all';

        // Apply filters to each job category
        Object.keys(filteredData).forEach(jobId => {
            let candidates = filteredData[jobId].candidates;

            // Apply search filter
            if (searchTerm) {
                candidates = candidates.filter(candidate => 
                    candidate.name.toLowerCase().includes(searchTerm) ||
                    candidate.email.toLowerCase().includes(searchTerm) ||
                    candidate.predicted_category.toLowerCase().includes(searchTerm) ||
                    (candidate.all_skills || []).some(skill => 
                        skill.toLowerCase().includes(searchTerm)
                    )
                );
            }

            // Apply status filter
            if (statusFilter !== 'all') {
                candidates = candidates.filter(candidate => 
                    candidate.status.toLowerCase() === statusFilter
                );
            }

            // Apply sorting
            candidates = this.sortCandidates(candidates, sortBy);

            filteredData[jobId].candidates = candidates;
        });

        this.displayCandidatesByJob(filteredData, this.totalCandidates);
        this.setupCandidateActionListeners();
    },

    // Sort candidates based on criteria
    sortCandidates(candidates, sortBy) {
        return [...candidates].sort((a, b) => {
            switch (sortBy) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'score-asc':
                    return a.score - b.score;
                case 'score-desc':
                    return b.score - a.score;
                case 'category-asc':
                    return a.predicted_category.localeCompare(b.predicted_category);
                case 'category-desc':
                    return b.predicted_category.localeCompare(a.predicted_category);
                case 'status-asc':
                    return a.status.localeCompare(b.status);
                case 'status-desc':
                    return b.status.localeCompare(a.status);
                default:
                    return b.score - a.score; // Default to score desc
            }
        });
    },

    // Set loading state
    setLoadingState(isLoading) {
        this.isLoading = isLoading;
        const refreshBtn = document.getElementById('refreshCandidates');
        const exportBtn = document.getElementById('exportCandidates');
        
        // Update refresh button state
        if (refreshBtn) {
            if (isLoading) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
            } else {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync me-2"></i>Refresh';
            }
        }

        // Update export button state
        if (exportBtn) {
            exportBtn.disabled = isLoading;
        }

        if (!this.candidatesContent) return;

        if (isLoading) {
            // Clean up any existing loading indicators first
            this.clearAllLoadingStates();
            
            // Always show a simple loading indicator when loading
            if (!this.candidatesData || Object.keys(this.candidatesData).length === 0) {
                // First time loading - show full loading state
                this.candidatesContent.innerHTML = `
                    <div class="candidates-loading-container" data-loading-type="full">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <h5 class="text-muted mb-2">Loading Candidates</h5>
                            <p class="text-muted small">Please wait while we fetch the latest candidate information...</p>
                        </div>
                    </div>
                `;
            } else {
                // Refreshing existing data - show overlay with backdrop
                const loadingOverlay = document.createElement('div');
                loadingOverlay.className = 'candidates-refresh-overlay';
                loadingOverlay.setAttribute('data-loading-type', 'overlay');
                loadingOverlay.innerHTML = `
                    <div class="overlay-content">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <span class="ms-2 fw-medium">Refreshing candidates...</span>
                    </div>
                `;
                
                // Ensure parent has relative positioning
                this.candidatesContent.style.position = 'relative';
                this.candidatesContent.appendChild(loadingOverlay);
            }
        } else {
            // Remove loading states when done
            this.clearAllLoadingStates();
        }
    },

    // Clear all loading states to prevent duplicates
    clearAllLoadingStates() {
        if (!this.candidatesContent) return;
        
        // Remove specific loading containers
        const loadingContainers = this.candidatesContent.querySelectorAll(
            '.candidates-loading-container, .candidates-refresh-overlay, .candidates-loading-overlay, [data-loading-type], .loading-state'
        );
        loadingContainers.forEach(container => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        // Also remove any standalone spinners that might be left over
        const spinners = this.candidatesContent.querySelectorAll('.spinner-border, .loading-spinner, .fa-spinner');
        spinners.forEach(spinner => {
            if (spinner && spinner.parentNode === this.candidatesContent) {
                spinner.parentNode.removeChild(spinner);
            }
        });
    },

    // Update candidate statistics
    updateCandidateStats() {
        const statsContainer = document.getElementById('candidateStats');
        if (!statsContainer || !this.candidatesData) return;

        const totalCandidates = Object.values(this.candidatesData)
            .reduce((sum, job) => sum + job.candidates.length, 0);
        
        const statusCounts = {};
        Object.values(this.candidatesData).forEach(job => {
            job.candidates.forEach(candidate => {
                statusCounts[candidate.status] = (statusCounts[candidate.status] || 0) + 1;
            });
        });

        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${totalCandidates}</div>
                    <div class="stat-label">Total Candidates</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${statusCounts.pending || 0}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${statusCounts.shortlisted || 0}</div>
                    <div class="stat-label">Shortlisted</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${statusCounts.rejected || 0}</div>
                    <div class="stat-label">Rejected</div>
                </div>
            </div>
        `;
    },

    // Display candidates grouped by job
    displayCandidatesByJob(candidatesByJob, totalCandidates) {
        this.candidatesContent.innerHTML = '';
        
        if (totalCandidates === 0) {
            this.candidatesContent.innerHTML = `
                <div class="no-candidates-message">
                    <div class="no-candidates-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h4>No Candidates Found</h4>
                    <p>Upload some PDS files in the "Upload Documents" section to see candidates here.</p>
                    <a href="#upload" class="btn btn-primary" onclick="NavigationModule.showSection('upload')">
                        <i class="fas fa-upload me-2"></i>Upload PDS Files
                    </a>
                </div>
            `;
            return;
        }
        
        // Create content for each job category
        Object.entries(candidatesByJob).forEach(([jobId, jobData]) => {
            if (jobData.candidates.length === 0) return;
            
            const jobSection = this.createJobSection(jobData);
            this.candidatesContent.appendChild(jobSection);
        });
    },

    // Create job section element
    createJobSection(jobData) {
        const jobSection = document.createElement('div');
        jobSection.className = 'job-section';
        
        // Handle LSPU job structure vs legacy/unassigned
        const isLSPUJob = jobData.position_title && jobData.campus_name;
        const jobTitle = isLSPUJob ? jobData.position_title : (jobData.job_title || 'Unassigned Candidates');
        const jobCategory = isLSPUJob ? jobData.position_category : (jobData.job_category || 'General');
        
        jobSection.innerHTML = `
            <div class="job-header">
                <h3 class="job-title">
                    <i class="fas fa-briefcase me-2"></i>
                    ${DOMUtils.escapeHtml(jobTitle)}
                </h3>
                <div class="job-meta">
                    <span class="badge bg-primary">${DOMUtils.escapeHtml(jobCategory)}</span>
                    ${isLSPUJob ? `<span class="badge bg-info">${DOMUtils.escapeHtml(jobData.campus_name)}</span>` : ''}
                    <span class="candidate-count">${jobData.candidates.length} candidate${jobData.candidates.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            ${isLSPUJob ? this.renderLSPUJobDetails(jobData) : this.renderBasicJobDetails(jobData)}
            <div class="candidates-table-container">
                <div class="table-responsive">
                    <table class="table table-hover candidates-table-compact">
                        <thead class="table-dark">
                            <tr>
                                <th class="checkbox-header">
                                    <input type="checkbox" class="select-all-candidates" title="Select All">
                                </th>
                                <th class="candidate-header">Candidate</th>
                                <th class="gov-ids-header">Government IDs</th>
                                <th class="education-level-header">Education Level</th>
                                <th class="civil-service-header">Civil Service Eligibility</th>
                                <th class="score-header">Assessment Score</th>
                                <th class="status-header">Status</th>
                                <th class="actions-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderCandidateRows(jobData.candidates)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        return jobSection;
    },

    // Render LSPU job details with enhanced information
    renderLSPUJobDetails(jobData) {
        return `
            <div class="job-description lspu-job-details">
                <div class="row">
                    <div class="col-md-6">
                        <div class="job-detail-item">
                            <strong><i class="fas fa-building me-2"></i>Department:</strong> 
                            ${DOMUtils.escapeHtml(jobData.department_office || 'Not specified')}
                        </div>
                        <div class="job-detail-item">
                            <strong><i class="fas fa-map-marker-alt me-2"></i>Campus:</strong> 
                            ${DOMUtils.escapeHtml(jobData.campus_name)}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="job-detail-item">
                            <strong><i class="fas fa-money-bill-wave me-2"></i>Salary Grade:</strong> 
                            ${DOMUtils.escapeHtml(jobData.salary_grade || 'Not specified')}
                        </div>
                        <div class="job-detail-item">
                            <strong><i class="fas fa-tag me-2"></i>Position Type:</strong> 
                            ${DOMUtils.escapeHtml(jobData.position_category)}
                        </div>
                    </div>
                </div>
                ${jobData.job_description ? `
                    <div class="job-description-text mt-3">
                        <strong><i class="fas fa-info-circle me-2"></i>Description:</strong>
                        <p>${FormatUtils.truncateText(jobData.job_description, 300)}</p>
                    </div>
                ` : ''}
                ${jobData.job_requirements ? `
                    <div class="job-requirements mt-2">
                        <strong><i class="fas fa-list-check me-2"></i>Required Skills:</strong> 
                        ${DOMUtils.escapeHtml(jobData.job_requirements)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Render basic job details for legacy/unassigned categories
    renderBasicJobDetails(jobData) {
        if (!jobData.job_description && !jobData.job_requirements) {
            return `
                <div class="job-description">
                    <p class="text-muted"><i class="fas fa-info-circle me-2"></i>Candidates not yet assigned to a specific LSPU job posting.</p>
                </div>
            `;
        }
        
        return `
            <div class="job-description">
                ${jobData.job_description ? `<p>${FormatUtils.truncateText(jobData.job_description, 200)}</p>` : ''}
                ${jobData.job_requirements ? `
                    <div class="job-requirements">
                        <strong>Required Skills:</strong> ${DOMUtils.escapeHtml(jobData.job_requirements)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Render candidate table rows
    renderCandidateRows(candidates) {
        return candidates.map(candidate => {
            // Use semantic score for styling and display (primary ranking score)
            const semanticScore = candidate.semantic_score || candidate.assessment_score || candidate.score || 0;
            const scoreClass = this.getScoreColorClass(semanticScore);
            const statusClass = `status-${candidate.status.toLowerCase()}`;
            const isSelected = this.selectedCandidates.has(candidate.id);
            const processingTypeLabel = this.getProcessingTypeLabel(candidate.processing_type, candidate.ocr_confidence);
            
            // Extract PDS-specific data with fallbacks
            const governmentIds = this.formatGovernmentIds(candidate);
            const educationLevel = this.getHighestEducationLevel(candidate);
            const civilServiceEligibility = this.formatCivilServiceEligibility(candidate);
            const assessmentScoreFormatted = this.formatAssessmentScore(candidate);
            
            return `
                <tr data-candidate-id="${candidate.id}" class="candidate-row ${isSelected ? 'selected' : ''}" onclick="CandidatesModule.showCandidateDetails('${candidate.id}')">
                    <td class="checkbox-column">
                        <input type="checkbox" class="candidate-checkbox" 
                               ${isSelected ? 'checked' : ''} 
                               data-candidate-id="${candidate.id}"
                               onclick="event.stopPropagation()">
                    </td>
                    <td class="candidate-column">
                        <div class="candidate-compact">
                            <div class="candidate-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="candidate-info">
                                <div class="candidate-name">${DOMUtils.escapeHtml(candidate.name)}</div>
                                <div class="candidate-meta">
                                    <span class="candidate-email">${DOMUtils.escapeHtml(candidate.email)}</span>
                                    <span class="candidate-phone">${DOMUtils.escapeHtml(candidate.phone || 'No phone')}</span>
                                </div>
                                <div class="candidate-education">
                                    ${FormatUtils.truncateText(candidate.education, 60)}
                                </div>
                                <div class="processing-type-label">
                                    ${processingTypeLabel}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="gov-ids-column">
                        <div class="gov-ids-compact">
                            ${governmentIds}
                        </div>
                    </td>
                    <td class="education-level-column">
                        <div class="education-level-compact">
                            <span class="education-badge">${educationLevel}</span>
                        </div>
                    </td>
                    <td class="civil-service-column">
                        <div class="civil-service-compact">
                            ${civilServiceEligibility}
                        </div>
                    </td>
                    <td class="score-column">
                        <div class="score-compact">
                            <div class="score-badge ${scoreClass}">${assessmentScoreFormatted}</div>
                            <div class="score-bar-mini">
                                <div class="score-fill ${scoreClass}" style="width: ${semanticScore}%"></div>
                            </div>
                        </div>
                    </td>
                    <td class="status-column">
                        <span class="status-badge ${statusClass}">${candidate.status}</span>
                    </td>
                    <td class="actions-column">
                        <div class="action-buttons-compact">
                            <button class="btn btn-sm btn-outline-success shortlist-candidate" 
                                    title="Shortlist" onclick="event.stopPropagation(); CandidatesModule.updateCandidateStatus('${candidate.id}', 'shortlisted')">
                                <i class="fas fa-star"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger reject-candidate" 
                                    title="Reject" onclick="event.stopPropagation(); CandidatesModule.updateCandidateStatus('${candidate.id}', 'rejected')">
                                <i class="fas fa-times"></i>
                            </button>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                        data-bs-toggle="dropdown" title="More" onclick="event.stopPropagation()">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><button class="dropdown-item view-candidate" onclick="CandidatesModule.showCandidateDetails('${candidate.id}')">
                                        <i class="fas fa-eye me-2"></i>View Details</button></li>
                                    <li><button class="dropdown-item shortlist-candidate" onclick="CandidatesModule.updateCandidateStatus('${candidate.id}', 'pending')">
                                        <i class="fas fa-clock me-2"></i>Set Pending</button></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><button class="dropdown-item remove-candidate text-danger" onclick="CandidatesModule.handleRemoveCandidate('${candidate.id}')">
                                        <i class="fas fa-trash me-2"></i>Remove</button></li>
                                </ul>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Setup candidate action listeners
    setupCandidateActionListeners() {
        if (!this.candidatesContent) return;

        // Individual candidate checkboxes
        this.candidatesContent.addEventListener('change', (e) => {
            if (e.target.classList.contains('candidate-checkbox')) {
                const candidateId = e.target.dataset.candidateId;
                const candidateRow = e.target.closest('.candidate-row');
                
                if (e.target.checked) {
                    this.selectedCandidates.add(candidateId);
                    candidateRow.classList.add('selected');
                } else {
                    this.selectedCandidates.delete(candidateId);
                    candidateRow.classList.remove('selected');
                }
                
                this.updateBulkActionsVisibility();
                this.updateSelectAllState();
            }
        });

        // Select all checkboxes
        this.candidatesContent.addEventListener('change', (e) => {
            if (e.target.classList.contains('select-all-candidates')) {
                const table = e.target.closest('table');
                const checkboxes = table.querySelectorAll('.candidate-checkbox');
                const isChecked = e.target.checked;
                
                checkboxes.forEach(checkbox => {
                    const candidateId = checkbox.dataset.candidateId;
                    const candidateRow = checkbox.closest('.candidate-row');
                    
                    checkbox.checked = isChecked;
                    
                    if (isChecked) {
                        this.selectedCandidates.add(candidateId);
                        candidateRow.classList.add('selected');
                    } else {
                        this.selectedCandidates.delete(candidateId);
                        candidateRow.classList.remove('selected');
                    }
                });
                
                this.updateBulkActionsVisibility();
            }
        });

        // Candidate actions
        this.candidatesContent.addEventListener('click', async (e) => {
            const candidateRow = e.target.closest('.candidate-row');
            if (!candidateRow) return;
            
            const candidateId = candidateRow.dataset.candidateId;
            
            // Prevent row click when interacting with controls
            if (e.target.closest('.candidate-checkbox') || 
                e.target.closest('.action-buttons-compact') ||
                e.target.closest('.dropdown-menu')) {
                return;
            }
            
            // Handle button clicks
            if (e.target.closest('.view-candidate')) {
                e.stopPropagation();
                await this.showCandidateDetails(candidateId);
            } else if (e.target.closest('.shortlist-candidate')) {
                e.stopPropagation();
                await this.updateCandidateStatus(candidateId, 'shortlisted');
            } else if (e.target.closest('.reject-candidate')) {
                e.stopPropagation();
                await this.updateCandidateStatus(candidateId, 'rejected');
            } else if (e.target.closest('.remove-candidate')) {
                e.stopPropagation();
                const confirmed = await confirmRemove('this candidate');
                if (confirmed) {
                    await this.removeCandidate(candidateId);
                }
            }
            // Row click is handled by onclick attribute in the HTML for better performance
        });
    },

    // Update bulk actions visibility
    updateBulkActionsVisibility() {
        const bulkActionsContainer = document.getElementById('bulkActionsContainer');
        const selectedCount = this.selectedCandidates.size;
        
        if (bulkActionsContainer) {
            if (selectedCount > 0) {
                bulkActionsContainer.style.display = 'block';
                bulkActionsContainer.querySelector('.selected-count').textContent = selectedCount;
            } else {
                bulkActionsContainer.style.display = 'none';
            }
        }
    },

    // Update select all checkbox state
    updateSelectAllState() {
        const selectAllCheckboxes = this.candidatesContent.querySelectorAll('.select-all-candidates');
        
        selectAllCheckboxes.forEach(selectAll => {
            const table = selectAll.closest('table');
            const allCheckboxes = table.querySelectorAll('.candidate-checkbox');
            const checkedCheckboxes = table.querySelectorAll('.candidate-checkbox:checked');
            
            if (checkedCheckboxes.length === 0) {
                selectAll.indeterminate = false;
                selectAll.checked = false;
            } else if (checkedCheckboxes.length === allCheckboxes.length) {
                selectAll.indeterminate = false;
                selectAll.checked = true;
            } else {
                selectAll.indeterminate = true;
                selectAll.checked = false;
            }
        });
    },

    // Show bulk actions menu
    showBulkActionsMenu() {
        if (this.selectedCandidates.size === 0) {
            ToastUtils.showWarning('Please select candidates first');
            return;
        }

        // Create bulk actions modal or dropdown
        const actions = [
            { id: 'bulk-shortlist', label: 'Shortlist Selected', icon: 'fas fa-star', action: () => this.bulkUpdateStatus('shortlisted') },
            { id: 'bulk-reject', label: 'Reject Selected', icon: 'fas fa-times', action: () => this.bulkUpdateStatus('rejected') },
            { id: 'bulk-pending', label: 'Set as Pending', icon: 'fas fa-clock', action: () => this.bulkUpdateStatus('pending') },
            { id: 'bulk-remove', label: 'Remove Selected', icon: 'fas fa-trash', action: () => this.bulkRemoveCandidates(), className: 'text-danger' }
        ];

        // You can implement a proper modal here or use a simple confirm approach
        this.showBulkActionsDialog(actions);
    },

    // Show bulk actions dialog
    showBulkActionsDialog(actions) {
        const selectedCount = this.selectedCandidates.size;
        let actionsHtml = actions.map(action => 
            `<button class="dropdown-item ${action.className || ''}" data-action="${action.id}">
                <i class="${action.icon} me-2"></i>${action.label}
            </button>`
        ).join('');

        // Simple implementation using browser confirm - you can enhance this with a proper modal
        const actionChoice = prompt(`Selected ${selectedCount} candidates. Choose action:\n1. Shortlist\n2. Reject\n3. Set as Pending\n4. Remove\n\nEnter number (1-4):`);
        
        switch(actionChoice) {
            case '1':
                this.bulkUpdateStatus('shortlisted');
                break;
            case '2':
                this.bulkUpdateStatus('rejected');
                break;
            case '3':
                this.bulkUpdateStatus('pending');
                break;
            case '4':
                this.bulkRemoveCandidates();
                break;
        }
    },

    // Bulk update candidate status
    async bulkUpdateStatus(status) {
        const selectedIds = Array.from(this.selectedCandidates);
        const updatePromises = selectedIds.map(id => this.updateCandidateStatus(id, status, false));
        
        try {
            await Promise.all(updatePromises);
            ToastUtils.showSuccess(`${selectedIds.length} candidates updated to ${status}`);
            this.selectedCandidates.clear();
            this.updateBulkActionsVisibility();
            await this.loadCandidates();
        } catch (error) {
            ToastUtils.showError('Some candidates could not be updated');
        }
    },

    // Bulk remove candidates
    async bulkRemoveCandidates() {
        const selectedIds = Array.from(this.selectedCandidates);
        const confirmed = await confirmRemove(`${selectedIds.length} candidates`);
        
        if (!confirmed) return;

        const removePromises = selectedIds.map(id => this.removeCandidate(id, false));
        
        try {
            await Promise.all(removePromises);
            ToastUtils.showSuccess(`${selectedIds.length} candidates removed`);
            this.selectedCandidates.clear();
            this.updateBulkActionsVisibility();
            await this.loadCandidates();
        } catch (error) {
            ToastUtils.showError('Some candidates could not be removed');
        }
    },

    // Export candidates with comprehensive assessment data
    async exportCandidates() {
        try {
            ToastUtils.showInfo('Preparing enhanced export with assessment data...');
            
            // Prepare export data with comprehensive assessment information
            const exportData = [];
            const assessmentPromises = [];
            
            // Collect all candidates and their assessment data
            Object.values(this.candidatesData || {}).forEach(jobData => {
                jobData.candidates.forEach(candidate => {
                    assessmentPromises.push(this.prepareEnhancedCandidateData(candidate, jobData));
                });
            });
            
            // Wait for all assessment data to be fetched
            const enhancedCandidates = await Promise.all(assessmentPromises);
            exportData.push(...enhancedCandidates);

            // Convert to CSV
            const csvContent = this.arrayToCSV(exportData);
            
            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `candidates_enhanced_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            ToastUtils.showSuccess('Enhanced candidates export completed successfully');
        } catch (error) {
            console.error('Export error:', error);
            ToastUtils.showError('Failed to export candidates');
        }
    },

    // Prepare enhanced candidate data with assessment information
    async prepareEnhancedCandidateData(candidate, jobData) {
        try {
            // Handle LSPU job structure vs legacy/unassigned
            const isLSPUJob = jobData.position_title && jobData.campus_name;
            
            // Basic candidate information
            const exportRow = {
                // Core candidate data
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone || '',
                education: candidate.education,
                skills: candidate.all_skills.join(', '),
                predicted_category: candidate.predicted_category,
                status: candidate.status,
                
                // Processing information
                processing_type: candidate.processing_type || 'pds',
                extraction_status: candidate.extraction_status || 'pending',
                uploaded_filename: candidate.uploaded_filename || '',
                ocr_confidence: candidate.ocr_confidence || '',
                
                // PDS data
                total_education_entries: candidate.total_education_entries || 0,
                total_work_positions: candidate.total_work_positions || 0,
                
                // Timestamps
                created_at: candidate.created_at || '',
                updated_at: candidate.updated_at || ''
            };
            
            // Add position/job information
            if (isLSPUJob) {
                exportRow.position_title = jobData.position_title;
                exportRow.position_category = jobData.position_category;
                exportRow.campus_name = jobData.campus_name;
                exportRow.department_office = jobData.department_office || '';
                exportRow.salary_grade = jobData.salary_grade || '';
                exportRow.job_reference_number = jobData.job_reference_number || '';
            } else {
                exportRow.position_title = jobData.job_title || 'Unassigned';
                exportRow.position_category = jobData.job_category || 'General';
                exportRow.campus_name = '';
                exportRow.department_office = '';
                exportRow.salary_grade = '';
                exportRow.job_reference_number = '';
            }
            
            // Fetch comprehensive assessment data
            const assessmentData = await this.fetchAssessmentData(candidate.id);
            
            if (assessmentData) {
                // Overall scoring
                exportRow.overall_assessment_score = assessmentData.overall_total || 0;
                exportRow.automated_total = assessmentData.automated_total || 0;
                exportRow.semantic_score = assessmentData.semantic_score || 0;
                exportRow.traditional_score = assessmentData.traditional_score || 0;
                
                // University assessment breakdown
                const detailedScores = assessmentData.university_assessment?.detailed_scores || {};
                exportRow.education_score = detailedScores.education || assessmentData.education_score || 0;
                exportRow.experience_score = detailedScores.experience || assessmentData.experience_score || 0;
                exportRow.training_score = detailedScores.training || assessmentData.training_score || 0;
                exportRow.eligibility_score = detailedScores.eligibility || assessmentData.eligibility_score || 0;
                exportRow.accomplishments_score = detailedScores.performance || assessmentData.accomplishments_score || 0;
                exportRow.potential_score = assessmentData.potential_score || 0;
                
                // Semantic analysis details
                if (assessmentData.semantic_analysis) {
                    exportRow.semantic_match_percentage = assessmentData.semantic_analysis.match_percentage || 0;
                    exportRow.semantic_confidence = assessmentData.semantic_analysis.confidence || 0;
                    exportRow.semantic_relevant_skills = (assessmentData.semantic_analysis.relevant_skills || []).join('; ');
                    exportRow.semantic_skill_gaps = (assessmentData.semantic_analysis.skill_gaps || []).join('; ');
                }
                
                // Assessment metadata
                exportRow.assessment_type = assessmentData.assessment_type || 'unknown';
                exportRow.assessment_version = assessmentData.version || '';
                exportRow.assessment_timestamp = assessmentData.timestamp || '';
                
                // Traditional vs semantic comparison
                exportRow.score_difference = (assessmentData.traditional_score || 0) - (assessmentData.semantic_score || 0);
                exportRow.hybrid_ranking = assessmentData.hybrid_ranking || '';
                
            } else {
                // Fallback to basic score if no assessment data
                exportRow.overall_assessment_score = candidate.score || 0;
                exportRow.automated_total = candidate.score || 0;
                exportRow.semantic_score = 0;
                exportRow.traditional_score = 0;
                exportRow.education_score = 0;
                exportRow.experience_score = 0;
                exportRow.training_score = 0;
                exportRow.eligibility_score = 0;
                exportRow.accomplishments_score = 0;
                exportRow.potential_score = 0;
                exportRow.semantic_match_percentage = 0;
                exportRow.semantic_confidence = 0;
                exportRow.semantic_relevant_skills = '';
                exportRow.semantic_skill_gaps = '';
                exportRow.assessment_type = 'basic';
                exportRow.assessment_version = '';
                exportRow.assessment_timestamp = '';
                exportRow.score_difference = 0;
                exportRow.hybrid_ranking = '';
            }
            
            return exportRow;
            
        } catch (error) {
            console.error('Error preparing candidate data for export:', error);
            // Return basic data if assessment fetch fails
            return {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                error: 'Assessment data unavailable'
            };
        }
    },

    // Clear all filters
    clearFilters() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.sortSelect) this.sortSelect.value = 'score-desc';
        if (this.filterSelect) this.filterSelect.value = 'all';
        this.selectedCandidates.clear();
        this.updateBulkActionsVisibility();
        this.filterAndDisplayCandidates();
    },

    // Convert array to CSV
    arrayToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add header row
        csvRows.push(headers.map(header => `"${header}"`).join(','));
        
        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    },

    // Show candidate details modal
    async showCandidateDetails(candidateId) {
        if (!this.modal) return;

        try {
            const data = await APIService.candidates.getById(candidateId);
            
            if (data.success) {
                const candidate = data.candidate;
                
                // Get the job ID for this candidate to fetch assessment data
                const jobId = this.getJobIdForCandidate(candidate);
                
                if (jobId) {
                    // Fetch assessment data for this candidate and job
                    try {
                        console.log(`🔄 Fetching assessment data for candidate ${candidateId}, job ${jobId}`);
                        const assessmentResponse = await fetch(`/api/candidates/${candidateId}/assessment/${jobId}`);
                        
                        if (assessmentResponse.ok) {
                            const assessmentData = await assessmentResponse.json();
                            if (assessmentData.success && assessmentData.assessment) {
                                // Add assessment data to candidate object
                                candidate.semantic_score = assessmentData.assessment.enhanced_assessment?.semantic_score || 0;
                                candidate.traditional_score = assessmentData.assessment.enhanced_assessment?.traditional_score || 0;
                                candidate.assessment_score = candidate.semantic_score; // Use semantic as primary
                                candidate.unified_assessment = {
                                    semantic_score: candidate.semantic_score,
                                    traditional_score: candidate.traditional_score,
                                    criteria: assessmentData.assessment.university_assessment?.detailed_scores || {}
                                };
                                
                                console.log('✅ Assessment data loaded:', {
                                    semantic: candidate.semantic_score,
                                    traditional: candidate.traditional_score,
                                    criteria: candidate.unified_assessment.criteria
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching assessment data:', error);
                    }
                }
                
                this.populateModal(candidate);
                this.modal.show();
            } else {
                ToastUtils.showError('Failed to load candidate details');
            }
        } catch (error) {
            console.error('Error loading candidate details:', error);
            ToastUtils.showError('Error loading candidate details');
        }
    },

    // Populate modal with candidate data
    populateModal(candidate) {
        console.log('🎯 Populating modal for candidate:', candidate);
        
        // Enhanced basic info with fallbacks
        let candidateName = candidate.name || 'Unknown';
        let candidateEmail = candidate.email || '';
        let candidatePhone = candidate.phone || '';
        
        // If we have PDS data, try to get better information
        if (candidate.pds_data && candidate.pds_data.personal_info) {
            const personalInfo = candidate.pds_data.personal_info;
            
            // Better name extraction
            if (personalInfo.full_name && 
                personalInfo.full_name.trim() !== '' && 
                personalInfo.full_name.toLowerCase() !== 'n/a') {
                candidateName = personalInfo.full_name.replace(/\s+N\/a$/i, '').trim();
            } else {
                const nameParts = [
                    personalInfo.first_name,
                    personalInfo.middle_name,
                    personalInfo.surname,
                    personalInfo.name_extension
                ].filter(part => part && 
                          part.trim() !== '' && 
                          part.toLowerCase() !== 'n/a');
                
                if (nameParts.length > 0) {
                    candidateName = nameParts.join(' ');
                }
            }
            
            // Better email extraction
            if (personalInfo.email && 
                personalInfo.email.trim() !== '' && 
                personalInfo.email.toLowerCase() !== 'n/a') {
                candidateEmail = personalInfo.email;
            }
            
            // Better phone extraction
            if (personalInfo.mobile_no && 
                personalInfo.mobile_no.trim() !== '' && 
                personalInfo.mobile_no.toLowerCase() !== 'n/a') {
                candidatePhone = personalInfo.mobile_no;
            } else if (personalInfo.telephone_no && 
                       personalInfo.telephone_no.trim() !== '' && 
                       personalInfo.telephone_no.toLowerCase() !== 'n/a') {
                candidatePhone = personalInfo.telephone_no;
            }
        }
        
        console.log('👤 Final header info:', {
            name: candidateName,
            email: candidateEmail,
            phone: candidatePhone
        });
        
        // Set header information
        document.querySelector('#candidateDetailsModal .candidate-name').textContent = candidateName;
        document.querySelector('#candidateDetailsModal .email').textContent = candidateEmail || 'N/A';
        document.querySelector('#candidateDetailsModal .phone').textContent = candidatePhone || 'N/A';
        
        // Initialize score display with loading state
        const matchScore = document.querySelector('#candidateDetailsModal .match-score');
        
        if (matchScore) {
            // Debug: Check all possible score fields in candidate data
            console.log('🔍 All candidate score fields:', {
                semantic_score: candidate.semantic_score,
                assessment_score: candidate.assessment_score,
                traditional_score: candidate.traditional_score,
                score: candidate.score,
                unified_assessment: candidate.unified_assessment,
                assessment_breakdown: candidate.assessment_breakdown
            });
            
            // Use the same dual score format as the working column
            let semanticScore = candidate.semantic_score || candidate.assessment_score || candidate.score || 0;
            let traditionalScore = candidate.traditional_score || candidate.score || 0;
            
            // Try to get scores from unified assessment if available
            if (candidate.unified_assessment) {
                semanticScore = candidate.unified_assessment.semantic_score || semanticScore;
                traditionalScore = candidate.unified_assessment.traditional_score || traditionalScore;
            }
            
            console.log('📊 Modal header scores (final):', { semanticScore, traditionalScore });
            
            // Replace the score circle with dual score display
            const assessmentScoreFormatted = this.formatAssessmentScore(candidate);
            const scoreClass = this.getScoreColorClass(semanticScore);
            
            matchScore.innerHTML = `
                <div class="score-badge ${scoreClass}">${assessmentScoreFormatted}</div>
                <div class="score-info">
                    <div class="score-breakdown-header">
                        <div class="primary-score-info">
                            <span class="score-label">Semantic Enhanced Score</span>
                            <span class="score-description">Final ranking score with AI analysis</span>
                        </div>
                        ${Math.abs(semanticScore - traditionalScore) > 0.1 ? `
                        <div class="secondary-score-info">
                            <span class="enhancement-indicator">
                                ${semanticScore > traditionalScore ? '+' : ''}${(semanticScore - traditionalScore).toFixed(1)} pts enhancement
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            console.error('❌ Match score element not found in modal');
        }
        
        // Check if this is a PDS candidate (legacy or new comprehensive system)
        console.log('Candidate data:', candidate); // Debug log
        console.log('Processing type:', candidate.processing_type); // Debug log
        console.log('PDS data exists:', !!candidate.pds_data); // Debug log
        
        const isPDS = candidate.processing_type === 'pds' || 
                     candidate.processing_type === 'comprehensive_pds_extraction' ||
                     candidate.processing_type === 'pds_extraction_fallback' ||
                     (candidate.pds_data && Object.keys(candidate.pds_data).length > 0);
        const pdsSection = document.querySelector('#candidateDetailsModal .pds-sections');
        
        console.log('Is PDS candidate:', isPDS); // Debug log
        
        // Hide/show sections based on candidate type
        if (isPDS) {
            pdsSection.style.display = 'block';
            this.populateUnifiedAssessment(candidate);
            this.populatePDSData(candidate);
            
            // Hide legacy resume sections for PDS candidates
            this.hideLegacySections();
        } else {
            pdsSection.style.display = 'none';
            this.populateUnifiedAssessment(candidate);
            
            // Show legacy resume sections for regular candidates
            this.showLegacySections();
            
            // Populate legacy sections
            this.populateLegacySections(candidate);
        }
        
        // Set up action buttons (common for both types)
        this.setupActionButtons(candidate);
    },

    // Hide legacy resume sections for PDS candidates
    hideLegacySections() {
        const legacySections = [
            '.skills-section',
            '.education-section', 
            '.experience-section',
            '.certifications-section',
            '.scoring-section',
            '.matched-skills-section',
            '.missing-skills-section'
        ];
        
        legacySections.forEach(selector => {
            const section = document.querySelector(`#candidateDetailsModal ${selector}`);
            if (section) {
                section.style.display = 'none';
            }
        });
    },

    // Show legacy resume sections for regular candidates
    showLegacySections() {
        const legacySections = [
            '.skills-section',
            '.education-section', 
            '.experience-section',
            '.certifications-section',
            '.scoring-section',
            '.matched-skills-section',
            '.missing-skills-section'
        ];
        
        legacySections.forEach(selector => {
            const section = document.querySelector(`#candidateDetailsModal ${selector}`);
            if (section) {
                section.style.display = 'block';
            }
        });
    },

    // Populate legacy sections for regular candidates
    populateLegacySections(candidate) {
        const skillsContainer = document.querySelector('#candidateDetailsModal .skills-container');
        if (candidate.skills && candidate.skills.length > 0) {
            skillsContainer.innerHTML = candidate.skills.map(skill => 
                `<span class="skill-badge">${DOMUtils.escapeHtml(skill)}</span>`
            ).join('');
        } else {
            skillsContainer.innerHTML = '<p>No skills information available</p>';
        }
        
        // Education (for non-PDS candidates or additional education info)
        const educationContainer = document.querySelector('#candidateDetailsModal .education-container');
        if (candidate.education && candidate.education.length > 0) {
            educationContainer.innerHTML = candidate.education.map(edu => `
                <div class="education-item">
                    <h6>${DOMUtils.escapeHtml(edu.degree || 'Unknown Degree')}</h6>
                    <p class="text-muted">${DOMUtils.escapeHtml(edu.year || 'Year not specified')}</p>
                    <p>${DOMUtils.escapeHtml(edu.details || '')}</p>
                </div>
            `).join('');
        } else {
            educationContainer.innerHTML = '<p>No education information available</p>';
        }
        
        // Matched skills
        const matchedSkillsContainer = document.querySelector('#candidateDetailsModal .matched-skills-container');
        if (candidate.matched_skills && candidate.matched_skills.length > 0) {
            matchedSkillsContainer.innerHTML = candidate.matched_skills.map(skill => 
                `<span class="skill-badge bg-success">${DOMUtils.escapeHtml(skill)}</span>`
            ).join('');
        } else {
            matchedSkillsContainer.innerHTML = '<p>No matched skills</p>';
        }
        
        // Missing skills
        const missingSkillsContainer = document.querySelector('#candidateDetailsModal .missing-skills-container');
        if (candidate.missing_skills && candidate.missing_skills.length > 0) {
            missingSkillsContainer.innerHTML = candidate.missing_skills.map(skill => 
                `<span class="skill-badge bg-danger">${DOMUtils.escapeHtml(skill)}</span>`
            ).join('');
        } else {
            missingSkillsContainer.innerHTML = '<p>No missing skills</p>';
        }
    },

    // Set up modal action buttons (common for both PDS and regular candidates)
    setupActionButtons(candidate) {
        const candidateId = candidate.id;
        document.getElementById('removeCandidate').dataset.candidateId = candidateId;
        document.getElementById('shortlistCandidate').dataset.candidateId = candidateId;
        document.getElementById('rejectCandidate').dataset.candidateId = candidateId;
    },

    // NEW: Populate unified assessment display
    populateUnifiedAssessment(candidate) {
        console.log('🎯 Populating unified assessment for candidate:', candidate);
        console.log('🚀 ELABORATE DESIGN VERSION - Loading enhanced assessment');
        
        const assessmentContainer = document.querySelector('#candidateDetailsModal .assessment-results-container');
        if (!assessmentContainer) {
            console.warn('Assessment results container not found in modal');
            return;
        }

        // Get scores from candidate data with proper fallbacks
        let traditionalScore = candidate.traditional_score || candidate.score || 0;
        let semanticScore = candidate.semantic_score || candidate.assessment_score || candidate.score || 0;
        
        // Try to get scores from unified assessment if available
        if (candidate.unified_assessment) {
            semanticScore = candidate.unified_assessment.semantic_score || semanticScore;
            traditionalScore = candidate.unified_assessment.traditional_score || traditionalScore;
        }
        
        console.log('🎯 Unified Assessment using scores:', { traditionalScore, semanticScore });
        
        const breakdown = candidate.assessment_breakdown || candidate.unified_assessment?.criteria || {};
        const potentialScore = candidate.potential_score || (candidate.unified_assessment ? candidate.unified_assessment.potential_score : 0) || 0;

        console.log('🔧 About to render ELABORATE design with breakdown:', breakdown);

        try {
            // Create unified assessment display with elaborate design
            const htmlContent = `
                <div class="unified-assessment-display">
                    <div class="assessment-header">
                        <p class="text-muted mb-4">Comprehensive evaluation using official criteria and AI enhancement</p>
                    </div>

                    <div class="score-comparison-section mb-4">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="score-method-card traditional-card h-100">
                                    <div class="card-header d-flex align-items-center">
                                        <div class="method-icon me-3">
                                            <i class="fas fa-clipboard-list"></i>
                                        </div>
                                        <div class="method-info flex-grow-1">
                                            <h5 class="mb-1">Traditional Assessment</h5>
                                            <span class="method-description">Rule-based evaluation</span>
                                        </div>
                                        <div class="score-display">
                                            <span class="score-value">${traditionalScore.toFixed(1)}</span>
                                            <span class="score-max">/100</span>
                                        </div>
                                    </div>
                                    <div class="card-body">
                                        <div class="progress mb-2" style="height: 8px;">
                                            <div class="progress-bar bg-info" style="width: ${traditionalScore}%"></div>
                                        </div>
                                        <small class="text-muted">Official university criteria assessment</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="score-method-card semantic-card h-100">
                                    <div class="card-header d-flex align-items-center">
                                        <div class="method-icon me-3">
                                            <i class="fas fa-brain"></i>
                                        </div>
                                        <div class="method-info flex-grow-1">
                                            <h5 class="mb-1">Semantic Enhanced</h5>
                                            <span class="method-description">AI-powered relevance analysis</span>
                                        </div>
                                        <div class="score-display primary">
                                            <span class="score-value">${semanticScore.toFixed(1)}</span>
                                            <span class="score-max">/100</span>
                                        </div>
                                    </div>
                                    <div class="card-body">
                                        <div class="progress mb-2" style="height: 8px;">
                                            <div class="progress-bar bg-success" style="width: ${semanticScore}%"></div>
                                        </div>
                                        <small class="text-muted">Enhanced with contextual understanding</small>
                                        ${semanticScore > traditionalScore ? '<div class="mt-2"><span class="badge bg-success"><i class="fas fa-arrow-up me-1"></i>Enhanced</span></div>' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="criteria-breakdown-section mb-4">
                        <div class="section-header mb-3">
                            <h5 class="mb-0"><i class="fas fa-list-ul me-2"></i>Assessment Criteria Breakdown</h5>
                            <small class="text-muted">Detailed scoring across evaluation categories</small>
                        </div>
                        <div class="criteria-grid">
                            ${this.renderCriteriaBreakdown(breakdown, traditionalScore, semanticScore, candidate.id)}
                        </div>
                    </div>

                    <div class="assessment-insights mb-4">
                        ${this.renderAssessmentInsights(traditionalScore, semanticScore, breakdown)}
                    </div>

                    <div class="manual-adjustment-section">
                        <div class="potential-score-control">
                            <div class="potential-header mb-3">
                                <h6 class="mb-1"><i class="fas fa-sliders-h me-2"></i>Manual Potential Score</h6>
                                <p class="text-muted mb-0">Administrative adjustment (0-15 points)</p>
                            </div>
                            <div class="potential-input-group">
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fas fa-plus-circle"></i></span>
                                    <input type="number" 
                                           id="potentialScore" 
                                           class="form-control" 
                                           min="0" 
                                           max="15" 
                                           step="0.1" 
                                           value="${potentialScore.toFixed(1)}"
                                           placeholder="0.0">
                                    <button class="btn btn-primary update-potential-btn" 
                                            onclick="CandidatesModule.updatePotentialScore('${candidate.id}')">
                                        <i class="fas fa-save me-1"></i>Update
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('🎨 Generated elaborate HTML content, length:', htmlContent.length);
            assessmentContainer.innerHTML = htmlContent;
            console.log('✅ Elaborate assessment design applied successfully');
            
            // Load existing overrides and update display
            this.loadExistingOverrides(candidate.id);
            
            // FORCE REMOVE any remaining semantic analysis section
            const semanticSection = document.querySelector('#candidateDetailsModal .semantic-analysis-section');
            if (semanticSection) {
                console.log('🗑️ Removing leftover semantic analysis section');
                semanticSection.remove();
            }
            
        } catch (error) {
            console.error('❌ Error rendering elaborate assessment design:', error);
            // Fallback to simple design
            assessmentContainer.innerHTML = `
                <div class="alert alert-warning">
                    <h5>Assessment Results</h5>
                    <p>Traditional Score: ${traditionalScore.toFixed(1)}/100</p>
                    <p>Semantic Score: ${semanticScore.toFixed(1)}/100</p>
                    <p>Error loading detailed view. Please check console for details.</p>
                </div>
            `;
        }
    },

    // Render individual criteria breakdown with manual override capabilities
    renderCriteriaBreakdown(breakdown, traditionalScore, semanticScore, candidateId) {
        console.log('🔍 Breakdown data received:', breakdown);
        
        const criteria = [
            { key: 'education_score', altKeys: ['education', 'educational_background'], label: 'Education', max: 40, icon: 'graduation-cap' },
            { key: 'experience_score', altKeys: ['experience', 'work_experience'], label: 'Experience', max: 20, icon: 'briefcase' },
            { key: 'training_score', altKeys: ['training', 'learning_development'], label: 'Training', max: 10, icon: 'certificate' },
            { key: 'eligibility_score', altKeys: ['eligibility', 'civil_service'], label: 'Eligibility', max: 10, icon: 'award' },
            { key: 'accomplishments_score', altKeys: ['accomplishments', 'achievements'], label: 'Accomplishments', max: 5, icon: 'trophy' },
            { key: 'potential_score', altKeys: ['potential', 'performance'], label: 'Potential', max: 15, icon: 'star' }
        ];

        return criteria.map(criterion => {
            // Try multiple possible field names for the score
            let score = breakdown[criterion.key] || 0;
            if (score === 0 && criterion.altKeys) {
                for (const altKey of criterion.altKeys) {
                    if (breakdown[altKey] !== undefined && breakdown[altKey] !== 0) {
                        score = breakdown[altKey];
                        break;
                    }
                }
            }
            
            console.log(`📊 ${criterion.label}: ${score} (from ${criterion.key} or alternatives)`);
            
            const percentage = (score / criterion.max) * 100;
            const isEnhanced = semanticScore > traditionalScore && criterion.key !== 'potential_score';
            const achievementLevel = this.getCriteriaAchievementLevel(percentage);
            
            // Skip potential score as it already has its own editing interface
            if (criterion.key === 'potential_score') {
                return `
                    <div class="criteria-item card h-100">
                        <div class="card-header criteria-header bg-light">
                            <div class="d-flex align-items-center">
                                <div class="criteria-icon me-3">
                                    <div class="icon-circle ${achievementLevel.colorClass}">
                                        <i class="fas fa-${criterion.icon}"></i>
                                    </div>
                                </div>
                                <div class="criteria-info flex-grow-1">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h6 class="criteria-label mb-1">${criterion.label}</h6>
                                            <small class="text-muted">${achievementLevel.label}</small>
                                        </div>
                                        <div class="text-end">
                                            <span class="criteria-score badge ${achievementLevel.colorClass}">${score.toFixed(1)}/${criterion.max}</span>
                                            <div class="mt-1"><span class="badge bg-info small"><i class="fas fa-cog me-1"></i>Manual</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-body py-2">
                            <div class="criteria-progress mb-2">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <small class="text-muted">Score Achievement</small>
                                    <small class="fw-bold">${score.toFixed(1)} / ${criterion.max} pts</small>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar ${achievementLevel.progressClass}" 
                                         style="width: ${percentage}%"
                                         role="progressbar" 
                                         aria-valuenow="${percentage}" 
                                         aria-valuemin="0" 
                                         aria-valuemax="100"></div>
                                </div>
                            </div>
                            <div class="criteria-details">
                                <small class="text-muted">Controlled via manual adjustment section below</small>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Convert score key to criterion name for API
            const criterionName = criterion.key.replace('_score', '');
            
            return `
                <div class="criteria-item card h-100" data-criterion="${criterionName}">
                    <div class="card-header criteria-header bg-light">
                        <div class="d-flex align-items-center">
                            <div class="criteria-icon me-3">
                                <div class="icon-circle ${achievementLevel.colorClass}">
                                    <i class="fas fa-${criterion.icon}"></i>
                                </div>
                            </div>
                            <div class="criteria-info flex-grow-1">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="criteria-label mb-1">${criterion.label}</h6>
                                        <small class="text-muted criterion-status" id="status-${criterionName}">System calculated</small>
                                    </div>
                                    <div class="text-end">
                                        <div class="score-display-container">
                                            <span class="criteria-score badge ${achievementLevel.colorClass}" id="score-${criterionName}">${score.toFixed(1)}/${criterion.max}</span>
                                            <button class="btn btn-sm btn-outline-primary ms-2 edit-score-btn" 
                                                    onclick="CandidatesModule.editCriterionScore('${candidateId}', '${criterionName}', ${score}, ${criterion.max})"
                                                    title="Edit ${criterion.label} score">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </div>
                                        ${isEnhanced ? '<div class="mt-1"><span class="badge bg-success small"><i class="fas fa-arrow-up me-1"></i>Enhanced</span></div>' : ''}
                                        <div class="mt-1 override-indicator" id="override-${criterionName}" style="display: none;">
                                            <span class="badge bg-warning small"><i class="fas fa-user-edit me-1"></i>Manual Override</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-body py-2">
                        <div class="criteria-progress mb-2">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small class="text-muted">Score Achievement</small>
                                <small class="fw-bold">${score.toFixed(1)} / ${criterion.max} pts</small>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar ${achievementLevel.progressClass}" 
                                     style="width: ${percentage}%"
                                     role="progressbar" 
                                     aria-valuenow="${percentage}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100"></div>
                            </div>
                        </div>
                        <div class="criteria-details">
                            <small class="text-muted">${this.getCriteriaDescription(criterion.key)}</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Get achievement level based on percentage
    getCriteriaAchievementLevel(percentage) {
        if (percentage >= 80) {
            return {
                label: 'Excellent',
                colorClass: 'bg-success',
                progressClass: 'bg-success'
            };
        } else if (percentage >= 60) {
            return {
                label: 'Good',
                colorClass: 'bg-primary',
                progressClass: 'bg-primary'
            };
        } else if (percentage >= 40) {
            return {
                label: 'Fair',
                colorClass: 'bg-warning',
                progressClass: 'bg-warning'
            };
        } else {
            return {
                label: 'Needs Improvement',
                colorClass: 'bg-danger',
                progressClass: 'bg-danger'
            };
        }
    },

    // Get criteria description
    getCriteriaDescription(key) {
        const descriptions = {
            'education_score': 'Academic qualifications and degree relevance',
            'experience_score': 'Professional work experience and role relevance',
            'training_score': 'Professional development and certifications',
            'eligibility_score': 'Meeting minimum position requirements',
            'accomplishments_score': 'Notable achievements and recognitions',
            'potential_score': 'Administrative adjustment for special considerations'
        };
        return descriptions[key] || 'Assessment criteria details';
    },

    // Render assessment insights
    renderAssessmentInsights(traditionalScore, semanticScore, breakdown) {
        const improvement = semanticScore - traditionalScore;
        const improvementPercentage = traditionalScore > 0 ? (improvement / traditionalScore) * 100 : 0;

        // Create detailed computation breakdown
        const computationDetails = `
            <div class="computation-breakdown">
                <h6><i class="fas fa-calculator me-2"></i>Score Computation Details</h6>
                <div class="computation-steps">
                    <div class="computation-step">
                        <div class="step-header">
                            <span class="step-number">1</span>
                            <strong>Traditional Assessment</strong>
                        </div>
                        <div class="step-details">
                            <p>Keywords and rule-based matching against official criteria:</p>
                            <ul>
                                <li><strong>Education (40 pts max):</strong> Degree matching, specialization relevance</li>
                                <li><strong>Experience (20 pts max):</strong> Years and position relevance</li>
                                <li><strong>Training (10 pts max):</strong> Professional development courses</li>
                                <li><strong>Eligibility (10 pts max):</strong> Civil service and certifications</li>
                                <li><strong>Accomplishments (5 pts max):</strong> Awards and recognitions</li>
                                <li><strong>Potential (15 pts max):</strong> Manual administrative adjustment</li>
                            </ul>
                            <div class="score-result">Traditional Total: <strong>${traditionalScore.toFixed(1)} points</strong></div>
                        </div>
                    </div>
                    
                    <div class="computation-step">
                        <div class="step-header">
                            <span class="step-number">2</span>
                            <strong>Semantic Enhancement</strong>
                        </div>
                        <div class="step-details">
                            <p>AI semantic analysis using sentence-transformers model:</p>
                            <ul>
                                <li>Calculates semantic similarity between candidate background and job requirements</li>
                                <li>Identifies relevant experience beyond keyword matching</li>
                                <li>Applies up to 20% boost per category based on relevance</li>
                                <li>Considers context and implied qualifications</li>
                            </ul>
                            <div class="score-result">Enhanced Total: <strong>${semanticScore.toFixed(1)} points</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (Math.abs(improvement) < 0.1) {
            return `
                <div class="insights-card">
                    <h6><i class="fas fa-info-circle me-2"></i>Assessment Insights</h6>
                    <p class="text-muted">This candidate's traditional assessment score was confirmed by semantic analysis with no significant enhancement needed.</p>
                    ${computationDetails}
                </div>
            `;
        }

        const insightClass = improvement > 0 ? 'positive' : 'negative';
        const insightIcon = improvement > 0 ? 'arrow-up' : 'arrow-down';
        const insightText = improvement > 0 ? 'enhanced by' : 'adjusted by';

        return `
            <div class="insights-card ${insightClass}">
                <h6><i class="fas fa-lightbulb me-2"></i>Assessment Insights</h6>
                <div class="improvement-summary">
                    <i class="fas fa-${insightIcon} me-2"></i>
                    Score ${insightText} <strong>${Math.abs(improvement).toFixed(1)} points</strong> 
                    (${Math.abs(improvementPercentage).toFixed(1)}%) through semantic analysis
                </div>
                <p class="text-muted mt-2">
                    ${improvement > 0 
                        ? 'Semantic analysis identified strong job relevance in the candidate\'s background that traditional keyword matching missed.' 
                        : 'Semantic analysis suggests some keyword matches may be less relevant in the specific job context.'}
                </p>
                ${computationDetails}
            </div>
        `;
    },

    // Get color class for criteria progress bars
    getCriteriaColorClass(percentage) {
        if (percentage >= 90) return 'bg-success';
        if (percentage >= 70) return 'bg-info';
        if (percentage >= 50) return 'bg-warning';
        return 'bg-danger';
    },

    // Populate PDS-specific data sections
    populatePDSData(candidate) {
        console.log('Starting PDS data population for candidate:', candidate);
        const pdsData = candidate.pds_data || {};
        console.log('PDS Data:', pdsData);
        
        // Personal Information
        this.populatePersonalInfo(pdsData);
        
        // Educational Background (new PDS section)
        this.populateEducationalBackground(candidate, pdsData);
        
        // Government IDs
        const govIdsContainer = document.querySelector('#candidateDetailsModal .government-ids-container');
        let govIds = candidate.government_ids || {};
        
        // If government_ids is empty, try to extract from PDS data
        if (Object.keys(govIds).length === 0 && pdsData.personal_info) {
            const personalInfo = pdsData.personal_info;
            govIds = {
                gsis_id: personalInfo.gsis_id,
                pagibig_id: personalInfo.pagibig_id,
                philhealth_no: personalInfo.philhealth_no,
                sss_no: personalInfo.sss_no,
                tin_no: personalInfo.tin_no
            };
        }
        
        const validGovIds = Object.entries(govIds)
            .filter(([key, value]) => value && value.trim() !== '' && value.toLowerCase() !== 'n/a');
            
        if (validGovIds.length > 0) {
            govIdsContainer.innerHTML = validGovIds.map(([key, value]) => `
                <div class="id-item">
                    <strong>${this.formatIDLabel(key)}:</strong> ${DOMUtils.escapeHtml(value)}
                </div>
            `).join('');
        } else {
            govIdsContainer.innerHTML = '<p>No government ID information available</p>';
        }
        
        // Civil Service Eligibility
        const eligibilityContainer = document.querySelector('#candidateDetailsModal .eligibility-container');
        const eligibility = candidate.eligibility || [];
        if (eligibility.length > 0) {
            const validEligibility = eligibility.filter(elig => 
                elig.eligibility && 
                elig.eligibility.trim() !== '' && 
                !elig.eligibility.includes('WORK EXPERIENCE') &&
                !elig.eligibility.includes('Continue on separate')
            );
            
            if (validEligibility.length > 0) {
                eligibilityContainer.innerHTML = validEligibility.map(elig => `
                    <div class="eligibility-item">
                        <h6>${DOMUtils.escapeHtml(elig.eligibility)}</h6>
                        <p class="text-muted">
                            ${elig.rating ? `Rating: ${elig.rating}` : ''} 
                            ${elig.date_exam ? `| Date: ${elig.date_exam}` : ''} 
                            ${elig.place_exam ? `| Place: ${elig.place_exam}` : ''}
                        </p>
                        ${elig.license_no ? `<p>License: ${DOMUtils.escapeHtml(elig.license_no)}</p>` : ''}
                        ${elig.validity ? `<p>Validity: ${DOMUtils.escapeHtml(elig.validity)}</p>` : ''}
                    </div>
                `).join('');
            } else {
                eligibilityContainer.innerHTML = '<p>No civil service eligibility information available</p>';
            }
        } else {
            eligibilityContainer.innerHTML = '<p>No civil service eligibility information available</p>';
        }
        
        // Work Experience (PDS)
        const workExpContainer = document.querySelector('#candidateDetailsModal .work-experience-container');
        const workExperience = candidate.work_experience || candidate.experience || [];
        if (workExperience.length > 0) {
            const validWorkExp = workExperience.filter(work => 
                work.position && 
                work.position.trim() !== '' && 
                work.position !== 'To' &&
                work.company && 
                work.company.trim() !== ''
            );
            
            if (validWorkExp.length > 0) {
                workExpContainer.innerHTML = validWorkExp.map(work => `
                    <div class="work-experience-item">
                        <h6>${DOMUtils.escapeHtml(work.position)}</h6>
                        <div class="company">${DOMUtils.escapeHtml(work.company)}</div>
                        <div class="date-range">
                            ${work.date_from ? new Date(work.date_from).toLocaleDateString() : 'N/A'} - 
                            ${work.date_to ? new Date(work.date_to).toLocaleDateString() : 'Present'}
                        </div>
                        ${work.status ? `<div class="description">${DOMUtils.escapeHtml(work.status)}</div>` : ''}
                        ${work.salary ? `<div class="text-muted">Salary: ${DOMUtils.escapeHtml(work.salary)}</div>` : ''}
                        ${work.govt_service ? `<div class="text-muted">Government Service: ${work.govt_service}</div>` : ''}
                    </div>
                `).join('');
            } else {
                workExpContainer.innerHTML = '<p>No work experience information available</p>';
            }
        } else {
            workExpContainer.innerHTML = '<p>No work experience information available</p>';
        }
        
        // Training and Development
        const trainingContainer = document.querySelector('#candidateDetailsModal .training-container');
        const training = candidate.training || [];
        if (training.length > 0) {
            const validTraining = training.filter(train => 
                train.title && 
                train.title.trim() !== '' && 
                train.title !== 'From'
            );
            
            if (validTraining.length > 0) {
                trainingContainer.innerHTML = validTraining.map(train => `
                    <div class="training-item">
                        <h6>${DOMUtils.escapeHtml(train.title)}</h6>
                        <p class="text-muted">
                            ${train.date_from || train.type ? 
                                `${train.type || train.date_from || ''} ${train.conductor ? `to ${train.conductor}` : ''}` : 
                                'Dates not specified'
                            }
                            ${train.hours ? `| ${train.hours} hours` : ''}
                        </p>
                    </div>
                `).join('');
            } else {
                trainingContainer.innerHTML = '<p>No training information available</p>';
            }
        } else {
            trainingContainer.innerHTML = '<p>No training information available</p>';
        }
        
        // Volunteer Work
        const volunteerContainer = document.querySelector('#candidateDetailsModal .volunteer-container');
        const volunteerWork = candidate.voluntary_work || candidate.volunteer_work || [];
        console.log('Volunteer work data:', volunteerWork); // Debug log
        
        if (volunteerWork.length > 0) {
            const validVolunteerWork = volunteerWork.filter(vol => 
                vol.organization && 
                vol.organization.trim() !== '' &&
                vol.organization !== 'From'
            );
            
            if (validVolunteerWork.length > 0) {
                volunteerContainer.innerHTML = validVolunteerWork.map(vol => `
                    <div class="volunteer-item">
                        <h6>${DOMUtils.escapeHtml(vol.organization)}</h6>
                        <p class="text-muted">
                            ${vol.date_from || vol.position ? 
                                `${vol.position || vol.date_from || ''}` : 
                                'Dates not specified'
                            }
                            ${vol.hours ? `| ${vol.hours} hours` : ''}
                        </p>
                    </div>
                `).join('');
            } else {
                volunteerContainer.innerHTML = '<p>No volunteer work information available</p>';
            }
        } else {
            volunteerContainer.innerHTML = '<p>No volunteer work information available</p>';
        }
        
        // Personal References
        const referencesContainer = document.querySelector('#candidateDetailsModal .references-container');
        const references = candidate.personal_references || (pdsData.other_info && pdsData.other_info.references) || [];
        if (references.length > 0) {
            const validReferences = references.filter(ref => 
                ref.name && 
                ref.name.trim() !== '' &&
                !ref.name.includes('42.') &&
                !ref.name.includes('declare under oath')
            );
            
            if (validReferences.length > 0) {
                referencesContainer.innerHTML = validReferences.map(ref => `
                    <div class="reference-item">
                        <h6>${DOMUtils.escapeHtml(ref.name)}</h6>
                        <p class="text-muted">
                            ${ref.address || 'N/A'} 
                            ${ref.telephone_no || ref.tel_no ? `| ${ref.telephone_no || ref.tel_no}` : ''}
                        </p>
                    </div>
                `).join('');
            } else {
                referencesContainer.innerHTML = '<p>No personal references available</p>';
            }
        } else {
            referencesContainer.innerHTML = '<p>No personal references available</p>';
        }
        
        // Assessment Results - Now handled by populateUnifiedAssessment, so skip this
        // this.populateAssessmentResults(candidate);
    },

    // Populate Educational Background section for PDS candidates
    populateEducationalBackground(candidate, pdsData) {
        const educationContainer = document.querySelector('#candidateDetailsModal .educational-background-container');
        const education = candidate.education || pdsData.educational_background || [];
        
        if (education.length > 0) {
            // Enhanced filtering to properly handle Graduate Studies
            const validEducation = education.filter(edu => 
                edu.school && 
                edu.school.trim() !== '' &&
                edu.school !== 'From' &&
                edu.school !== 'N/a' &&
                edu.school !== 'N/A'
            ).map(edu => {
                // Special handling for Graduate Studies
                if (edu.level && edu.level.toLowerCase().includes('graduate')) {
                    return {
                        ...edu,
                        level: 'Graduate Studies',
                        school: edu.school === 'GRADUATE STUDIES' ? (edu.degree_course || 'Graduate Program') : edu.school,
                        isGraduateStudies: true
                    };
                }
                return edu;
            });
            
            if (validEducation.length > 0) {
                educationContainer.innerHTML = validEducation.map(edu => {
                    // Enhanced display for Graduate Studies
                    if (edu.isGraduateStudies) {
                        const degreeInfo = edu.degree_course || edu.degree || '';
                        const degreeType = edu.degree_type || '';
                        
                        let degreeDisplay = degreeInfo;
                        if (degreeType === 'masters') {
                            degreeDisplay = `🎓 ${degreeInfo} (Master's Degree)`;
                        } else if (degreeType === 'doctorate') {
                            degreeDisplay = `🎓 ${degreeInfo} (Doctorate)`;
                        } else if (degreeInfo) {
                            degreeDisplay = `🎓 ${degreeInfo}`;
                        }
                        
                        return `
                            <div class="education-item graduate-studies">
                                <h6 class="text-primary">
                                    <i class="fas fa-graduation-cap me-2"></i>
                                    ${DOMUtils.escapeHtml(edu.level)}
                                    ${degreeType === 'masters' ? '<span class="badge bg-success ms-2">Master\'s</span>' : ''}
                                    ${degreeType === 'doctorate' ? '<span class="badge bg-purple ms-2">Doctorate</span>' : ''}
                                </h6>
                                <div class="school fw-semibold">${DOMUtils.escapeHtml(edu.school)}</div>
                                ${degreeDisplay ? `<div class="degree text-success">${DOMUtils.escapeHtml(degreeDisplay)}</div>` : ''}
                                <div class="date-range text-muted">
                                    <i class="fas fa-calendar me-1"></i>
                                    ${edu.period_from ? edu.period_from : 'N/A'} - 
                                    ${edu.period_to ? edu.period_to : (edu.year_graduated || 'N/A')}
                                </div>
                                ${edu.honors ? `<div class="honors mt-1"><i class="fas fa-award text-warning me-1"></i> ${DOMUtils.escapeHtml(edu.honors)}</div>` : ''}
                                ${edu.highest_level_units ? `<div class="text-muted small"><i class="fas fa-book me-1"></i>Units: ${DOMUtils.escapeHtml(edu.highest_level_units)}</div>` : ''}
                            </div>
                        `;
                    } else {
                        // Regular education entry
                        return `
                            <div class="education-item">
                                <h6>${DOMUtils.escapeHtml(edu.level || 'Unknown Level')}</h6>
                                <div class="school">${DOMUtils.escapeHtml(edu.school)}</div>
                                <div class="degree">${DOMUtils.escapeHtml(edu.degree_course || edu.degree || '')}</div>
                                <div class="date-range text-muted">
                                    ${edu.period_from ? edu.period_from : 'N/A'} - 
                                    ${edu.period_to ? edu.period_to : (edu.year_graduated || 'N/A')}
                                </div>
                                ${edu.honors ? `<div class="honors"><i class="fas fa-award text-warning"></i> ${DOMUtils.escapeHtml(edu.honors)}</div>` : ''}
                                ${edu.highest_level_units ? `<div class="text-muted">Units: ${DOMUtils.escapeHtml(edu.highest_level_units)}</div>` : ''}
                            </div>
                        `;
                    }
                }).join('');
            } else {
                educationContainer.innerHTML = '<p>No educational background information available</p>';
            }
        } else {
            educationContainer.innerHTML = '<p>No educational background information available</p>';
        }
    },

    // Populate Assessment Results section for PDS candidates
    populateAssessmentResults(candidate) {
        const assessmentContainer = document.querySelector('#candidateDetailsModal .assessment-results-container');
        
        // Show loading state
        assessmentContainer.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading assessment...</span>
                </div>
                <p class="mt-2">Calculating assessment results...</p>
            </div>
        `;
        
        // Fetch assessment data from API
        this.fetchAssessmentData(candidate.id).then(assessmentData => {
            if (assessmentData) {
                this.renderAssessmentResults(candidate, assessmentData);
                
                // Unified assessment now handles all assessment display
                // Removed: populateSemanticAnalysis and populateAssessmentComparison
                // as they're integrated into the unified assessment design
            } else {
                this.renderNoAssessmentData();
            }
        }).catch(error => {
            console.error('Error fetching assessment data:', error);
            this.renderAssessmentError();
        });
    },



    // NEW: Render hybrid scoring results
    renderHybridScoringResults(hybridData) {
        const hybridContainer = document.querySelector('#candidateDetailsModal .hybrid-scoring-container');
        
        const universityScores = hybridData.university_assessment || {};
        const semanticScores = hybridData.semantic_analysis || {};
        const enhancedScores = hybridData.enhanced_assessment || {};
        
        hybridContainer.innerHTML = `
            <div class="hybrid-scoring-display">
                <div class="scoring-methods-comparison">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="scoring-method-card university-method">
                                <div class="method-header">
                                    <div class="method-icon">
                                        <i class="fas fa-university"></i>
                                    </div>
                                    <div class="method-info">
                                        <h5>University Assessment</h5>
                                        <p class="text-muted">Official LSPU Criteria</p>
                                    </div>
                                    <div class="method-score">
                                        <span class="score-value">${universityScores.total_score || 0}</span>
                                        <span class="score-label">/100</span>
                                    </div>
                                </div>
                                <div class="method-breakdown">
                                    ${this.renderUniversityBreakdown(universityScores)}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="scoring-method-card semantic-method">
                                <div class="method-header">
                                    <div class="method-icon">
                                        <i class="fas fa-brain"></i>
                                    </div>
                                    <div class="method-info">
                                        <h5>Semantic Analysis</h5>
                                        <p class="text-muted">AI-Powered Relevance</p>
                                    </div>
                                    <div class="method-score">
                                        <span class="score-value">${semanticScores.overall_score || 0}</span>
                                        <span class="score-label">%</span>
                                    </div>
                                </div>
                                <div class="method-breakdown">
                                    ${this.renderSemanticBreakdown(semanticScores)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="hybrid-results-summary">
                    <div class="hybrid-score-card">
                        <div class="hybrid-header">
                            <h6><i class="fas fa-balance-scale"></i> Hybrid Assessment Result</h6>
                        </div>
                        <div class="hybrid-scores">
                            <div class="hybrid-score-item">
                                <span class="label">University Compliance:</span>
                                <span class="value">${universityScores.total_score || 0}/100</span>
                                <div class="score-bar">
                                    <div class="score-fill university" style="width: ${universityScores.total_score || 0}%"></div>
                                </div>
                            </div>
                            <div class="hybrid-score-item">
                                <span class="label">Semantic Relevance:</span>
                                <span class="value">${semanticScores.overall_score || 0}%</span>
                                <div class="score-bar">
                                    <div class="score-fill semantic" style="width: ${semanticScores.overall_score || 0}%"></div>
                                </div>
                            </div>
                            <div class="hybrid-score-item total">
                                <span class="label">Enhanced Assessment:</span>
                                <span class="value">${enhancedScores.recommended_score || 0}</span>
                                <div class="score-bar">
                                    <div class="score-fill hybrid" style="width: ${(enhancedScores.recommended_score || 0)}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // NEW: Render university scoring breakdown
    renderUniversityBreakdown(universityScores) {
        const detailed = universityScores.detailed_scores || {};
        return `
            <div class="university-breakdown">
                <div class="breakdown-item">
                    <span class="item-label">Education (40%):</span>
                    <span class="item-score">${detailed.education || 0}/40</span>
                </div>
                <div class="breakdown-item">
                    <span class="item-label">Experience (20%):</span>
                    <span class="item-score">${detailed.experience || 0}/20</span>
                </div>
                <div class="breakdown-item">
                    <span class="item-label">Training (10%):</span>
                    <span class="item-score">${detailed.training || 0}/10</span>
                </div>
                <div class="breakdown-item">
                    <span class="item-label">Eligibility (10%):</span>
                    <span class="item-score">${detailed.eligibility || 0}/10</span>
                </div>
                <div class="breakdown-item">
                    <span class="item-label">Performance (5%):</span>
                    <span class="item-score">${detailed.performance || 0}/5</span>
                </div>
                <div class="breakdown-item">
                    <span class="item-label">Potential (15%):</span>
                    <span class="item-score">${detailed.potential || 0}/15</span>
                </div>
            </div>
        `;
    },

    // NEW: Render semantic analysis breakdown
    renderSemanticBreakdown(semanticScores) {
        return `
            <div class="semantic-breakdown">
                <div class="breakdown-item">
                    <span class="item-label">Education Relevance:</span>
                    <span class="item-score">${(semanticScores.education_relevance || 0).toFixed(1)}%</span>
                </div>
                <div class="breakdown-item">
                    <span class="item-label">Experience Match:</span>
                    <span class="item-score">${(semanticScores.experience_relevance || 0).toFixed(1)}%</span>
                </div>
                <div class="breakdown-item">
                    <span class="item-label">Training Relevance:</span>
                    <span class="item-score">${(semanticScores.training_relevance || 0).toFixed(1)}%</span>
                </div>
                <div class="breakdown-item total">
                    <span class="item-label">Overall Relevance:</span>
                    <span class="item-score">${(semanticScores.overall_score || 0).toFixed(1)}%</span>
                </div>
            </div>
        `;
    },

    // Updated: Populate Semantic Analysis section using unified assessment
    populateSemanticAnalysis(candidate) {
        const semanticContainer = document.querySelector('#candidateDetailsModal .semantic-analysis-container');
        
        if (!semanticContainer) {
            console.warn('Semantic analysis container not found');
            return;
        }

        // Get scores from candidate data with proper fallbacks
        let traditionalScore = candidate.traditional_score || candidate.score || 0;
        let semanticScore = candidate.semantic_score || candidate.assessment_score || candidate.score || 0;
        
        // Try to get scores from unified assessment if available
        if (candidate.unified_assessment) {
            semanticScore = candidate.unified_assessment.semantic_score || semanticScore;
            traditionalScore = candidate.unified_assessment.traditional_score || traditionalScore;
        }
        
        console.log('🔍 Semantic Analysis using scores:', { traditionalScore, semanticScore });
        
        const enhancement = semanticScore - traditionalScore;
        const enhancementPercentage = traditionalScore > 0 ? (enhancement / traditionalScore * 100) : 0;

        semanticContainer.innerHTML = `
            <div class="semantic-analysis-display">
                <div class="semantic-overview">
                    <div class="enhancement-summary text-center">
                        <h6>AI Enhancement Impact</h6>
                        <div class="enhancement-score">
                            <span class="enhancement-value ${enhancement > 0 ? 'positive' : enhancement < 0 ? 'negative' : 'neutral'}">
                                ${enhancement > 0 ? '+' : ''}${enhancement.toFixed(1)} points
                            </span>
                            <div class="enhancement-percentage">
                                (${enhancementPercentage > 0 ? '+' : ''}${enhancementPercentage.toFixed(1)}% change)
                            </div>
                        </div>
                        <p class="text-muted mt-2">
                            ${enhancement > 0 
                                ? 'Semantic analysis identified additional relevant qualifications beyond keyword matching.'
                                : enhancement < 0 
                                ? 'Semantic analysis refined the assessment by filtering less relevant matches.'
                                : 'Semantic analysis confirmed the traditional assessment accuracy.'}
                        </p>
                    </div>
                </div>
                
                <div class="semantic-methodology">
                    <h6><i class="fas fa-cogs me-2"></i>Analysis Methodology</h6>
                    <div class="methodology-steps">
                        <div class="step">
                            <div class="step-icon"><i class="fas fa-search"></i></div>
                            <div class="step-content">
                                <strong>Content Analysis:</strong> AI extracts semantic meaning from candidate's background
                            </div>
                        </div>
                        <div class="step">
                            <div class="step-icon"><i class="fas fa-link"></i></div>
                            <div class="step-content">
                                <strong>Relevance Matching:</strong> Compares candidate profile to job requirements using sentence-transformers
                            </div>
                        </div>
                        <div class="step">
                            <div class="step-icon"><i class="fas fa-chart-line"></i></div>
                            <div class="step-content">
                                <strong>Score Enhancement:</strong> Applies up to 20% boost per category based on semantic relevance
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="score-comparison">
                    <h6><i class="fas fa-balance-scale me-2"></i>Score Comparison</h6>
                    <div class="comparison-bars">
                        <div class="score-bar traditional">
                            <div class="bar-label">Traditional Assessment</div>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${(traditionalScore / 100) * 100}%"></div>
                                <span class="bar-value">${traditionalScore.toFixed(1)}</span>
                            </div>
                        </div>
                        <div class="score-bar semantic">
                            <div class="bar-label">Semantic Enhanced</div>
                            <div class="bar-container">
                                <div class="bar-fill enhanced" style="width: ${(semanticScore / 100) * 100}%"></div>
                                <span class="bar-value">${semanticScore.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Updated: Render semantic analysis results from unified assessment
    renderSemanticAnalysisResults(assessmentData) {
        const semanticContainer = document.querySelector('#candidateDetailsModal .semantic-analysis-container');
        
        // Extract semantic enhancement data from unified assessment
        const semanticData = assessmentData.semantic_enhancement || {};
        const criteria = assessmentData.criteria || {};
        
        // Calculate overall enhancement percentage
        const traditionalTotal = assessmentData.traditional_score || 0;
        const semanticTotal = assessmentData.semantic_score || traditionalTotal;
        const overallEnhancement = traditionalTotal > 0 ? ((semanticTotal - traditionalTotal) / traditionalTotal * 100) : 0;
        
        // Extract individual category enhancements
        const educationEnhancement = criteria.education ? 
            ((criteria.education.semantic_score - criteria.education.traditional_score) / Math.max(criteria.education.traditional_score, 1) * 100) : 0;
        const experienceEnhancement = criteria.experience ? 
            ((criteria.experience.semantic_score - criteria.experience.traditional_score) / Math.max(criteria.experience.traditional_score, 1) * 100) : 0;
        const trainingEnhancement = criteria.training ? 
            ((criteria.training.semantic_score - criteria.training.traditional_score) / Math.max(criteria.training.traditional_score, 1) * 100) : 0;
        
        semanticContainer.innerHTML = `
            <div class="semantic-analysis-display">
                <div class="semantic-overview">
                    <div class="relevance-score-display">
                        <div class="relevance-circle">
                            <div class="circle-chart" data-percentage="${Math.max(0, overallEnhancement)}">
                                <span class="percentage">${overallEnhancement > 0 ? '+' : ''}${overallEnhancement.toFixed(1)}%</span>
                                <span class="label">Semantic Enhancement</span>
                            </div>
                        </div>
                        <div class="enhancement-summary">
                            <h6>AI Enhancement Impact</h6>
                            <p class="text-muted">
                                ${overallEnhancement > 0 
                                    ? `Semantic analysis improved the candidate's score by ${overallEnhancement.toFixed(1)}%, identifying relevant background that traditional keyword matching missed.`
                                    : 'Semantic analysis confirmed the traditional assessment accuracy with minimal additional insights.'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="semantic-breakdown-detailed">
                    <h6>Category-wise Enhancement</h6>
                    <div class="relevance-categories">
                        ${criteria.education ? `
                        <div class="relevance-category">
                            <div class="category-header">
                                <span class="category-name">Education</span>
                                <span class="category-score">
                                    ${criteria.education.traditional_score.toFixed(1)} → ${criteria.education.semantic_score.toFixed(1)}
                                    ${educationEnhancement > 0 ? `<span class="enhancement-badge">+${educationEnhancement.toFixed(1)}%</span>` : ''}
                                </span>
                            </div>
                            <div class="category-bar">
                                <div class="bar-fill traditional" style="width: ${(criteria.education.traditional_score/40)*100}%"></div>
                                <div class="bar-fill semantic" style="width: ${(criteria.education.semantic_score/40)*100}%"></div>
                            </div>
                            <div class="category-insights">
                                <p class="insight">
                                    ${educationEnhancement > 0 
                                        ? 'AI identified additional educational relevance beyond keyword matching'
                                        : 'Traditional assessment accurately captured educational qualifications'}
                                </p>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${criteria.experience ? `
                        <div class="relevance-category">
                            <div class="category-header">
                                <span class="category-name">Experience</span>
                                <span class="category-score">
                                    ${criteria.experience.traditional_score.toFixed(1)} → ${criteria.experience.semantic_score.toFixed(1)}
                                    ${experienceEnhancement > 0 ? `<span class="enhancement-badge">+${experienceEnhancement.toFixed(1)}%</span>` : ''}
                                </span>
                            </div>
                            <div class="category-bar">
                                <div class="bar-fill traditional" style="width: ${(criteria.experience.traditional_score/20)*100}%"></div>
                                <div class="bar-fill semantic" style="width: ${(criteria.experience.semantic_score/20)*100}%"></div>
                            </div>
                            <div class="category-insights">
                                <p class="insight">
                                    ${experienceEnhancement > 0 
                                        ? 'AI discovered relevant experience connections not captured by keywords'
                                        : 'Traditional assessment accurately evaluated work experience'}
                                </p>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${criteria.training ? `
                        <div class="relevance-category">
                            <div class="category-header">
                                <span class="category-name">Training</span>
                                <span class="category-score">
                                    ${criteria.training.traditional_score.toFixed(1)} → ${criteria.training.semantic_score.toFixed(1)}
                                    ${trainingEnhancement > 0 ? `<span class="enhancement-badge">+${trainingEnhancement.toFixed(1)}%</span>` : ''}
                                </span>
                            </div>
                            <div class="category-bar">
                                <div class="bar-fill traditional" style="width: ${(criteria.training.traditional_score/10)*100}%"></div>
                                <div class="bar-fill semantic" style="width: ${(criteria.training.semantic_score/10)*100}%"></div>
                            </div>
                            <div class="category-insights">
                                <p class="insight">
                                    ${trainingEnhancement > 0 
                                        ? 'AI identified training relevance beyond direct keyword matches'
                                        : 'Traditional assessment accurately captured training qualifications'}
                                </p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="ai-insights">
                    <h6><i class="fas fa-lightbulb"></i> Semantic Analysis Insights</h6>
                    <div class="insights-list">
                        <div class="insight-item">
                            <strong>Traditional vs AI Assessment:</strong> 
                            The traditional assessment scored this candidate at ${traditionalTotal.toFixed(1)} points, while AI enhancement 
                            ${semanticTotal > traditionalTotal 
                                ? `increased it to ${semanticTotal.toFixed(1)} points by identifying additional relevant qualifications.`
                                : `confirmed the accuracy at ${semanticTotal.toFixed(1)} points with minimal adjustments.`}
                        </div>
                        ${overallEnhancement > 5 ? `
                        <div class="insight-item">
                            <strong>Significant Enhancement:</strong> The AI identified substantial relevant background that traditional 
                            keyword-based assessment missed, suggesting this candidate may be more qualified than initially apparent.
                        </div>
                        ` : ''}
                        ${overallEnhancement < -2 ? `
                        <div class="insight-item">
                            <strong>Assessment Refinement:</strong> The AI analysis suggests some initially matched keywords may be 
                            less relevant in context, resulting in a more accurate assessment.
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Initialize circle chart animation
        this.animateCircleChart();
    },

    // NEW: Populate Assessment Comparison section
    async populateAssessmentComparison(candidate) {
        const comparisonContainer = document.querySelector('#candidateDetailsModal .assessment-comparison-container');
        
        if (!comparisonContainer) {
            console.warn('Assessment comparison container not found');
            return;
        }
        
        // Show loading state
        comparisonContainer.innerHTML = `
            <div class="text-center p-3">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading comparison data...</span>
                </div>
                <p class="mt-2 mb-0">Comparing assessment methods...</p>
            </div>
        `;
        
        try {
            // Use the dedicated assessment comparison endpoint
            const response = await fetch(`/api/candidates/${candidate.id}/assessment/comparison`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.renderAssessmentComparisonResults(result.data);
                } else {
                    this.renderAssessmentComparisonError('Assessment comparison data not available');
                }
            } else {
                this.renderAssessmentComparisonError('Network error loading comparison');
            }
        } catch (error) {
            console.error('Error fetching assessment comparison:', error);
            this.renderAssessmentComparisonError('Error loading comparison data');
        }
    },

    // NEW: Render assessment comparison results
    renderAssessmentComparisonResults(comparisonData) {
        const comparisonContainer = document.querySelector('#candidateDetailsModal .assessment-comparison-container');
        
        const traditional = comparisonData.traditional_assessment || {};
        const enhanced = comparisonData.enhanced_assessment || {};
        const differences = comparisonData.differences || {};
        
        comparisonContainer.innerHTML = `
            <div class="assessment-comparison-display">
                <div class="comparison-methods">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="method-comparison-card traditional">
                                <div class="card-header">
                                    <h6><i class="fas fa-file-alt"></i> Traditional Assessment</h6>
                                    <span class="method-badge traditional">Basic</span>
                                </div>
                                <div class="card-body">
                                    <div class="score-display">
                                        <span class="score-value">${traditional.total_score || 0}</span>
                                        <span class="score-label">/100</span>
                                    </div>
                                    <div class="method-details">
                                        <p class="text-muted">Standard university criteria evaluation</p>
                                        <div class="score-breakdown">
                                            ${this.renderTraditionalBreakdown(traditional)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="method-comparison-card enhanced">
                                <div class="card-header">
                                    <h6><i class="fas fa-brain"></i> Enhanced Assessment</h6>
                                    <span class="method-badge enhanced">AI-Powered</span>
                                </div>
                                <div class="card-body">
                                    <div class="score-display">
                                        <span class="score-value">${enhanced.total_score || 0}</span>
                                        <span class="score-label">/100</span>
                                    </div>
                                    <div class="method-details">
                                        <p class="text-muted">University criteria + semantic analysis</p>
                                        <div class="score-breakdown">
                                            ${this.renderEnhancedBreakdown(enhanced)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="comparison-insights">
                    <div class="insights-header">
                        <h6><i class="fas fa-chart-line"></i> Assessment Comparison Insights</h6>
                    </div>
                    <div class="insights-content">
                        <div class="difference-indicator">
                            <span class="difference-label">Score Difference:</span>
                            <span class="difference-value ${differences.improvement > 0 ? 'positive' : differences.improvement < 0 ? 'negative' : 'neutral'}">
                                ${differences.improvement > 0 ? '+' : ''}${differences.improvement || 0} points
                            </span>
                        </div>
                        <div class="improvement-areas">
                            ${differences.improvements && differences.improvements.length > 0 ? `
                                <div class="improvements">
                                    <h6>Improvements Identified:</h6>
                                    <ul>
                                        ${differences.improvements.map(imp => `<li>${imp}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                        <div class="method-advantages">
                            ${differences.method_advantages && differences.method_advantages.length > 0 ? `
                                <div class="advantages">
                                    <h6>Enhanced Assessment Advantages:</h6>
                                    <ul>
                                        ${differences.method_advantages.map(adv => `
                                            <li><i class="fas fa-check text-success"></i> ${adv}</li>
                                        `).join('')}
                                    </ul>
                                </div>
                            ` : `
                                <div class="ai-advantages">
                                    <div class="advantage-item">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Contextual understanding of job requirements</span>
                                    </div>
                                    <div class="advantage-item">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Semantic analysis of qualifications relevance</span>
                                    </div>
                                    <div class="advantage-item">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Comprehensive skills and experience matching</span>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // NEW: Render traditional assessment breakdown
    renderTraditionalBreakdown(traditional) {
        return `
            <div class="traditional-breakdown">
                <div class="breakdown-item">
                    <span>Education:</span>
                    <span>${traditional.education || 0}/40</span>
                </div>
                <div class="breakdown-item">
                    <span>Experience:</span>
                    <span>${traditional.experience || 0}/20</span>
                </div>
                <div class="breakdown-item">
                    <span>Training:</span>
                    <span>${traditional.training || 0}/10</span>
                </div>
                <div class="breakdown-item">
                    <span>Eligibility:</span>
                    <span>${traditional.eligibility || 0}/10</span>
                </div>
            </div>
        `;
    },

    // NEW: Render enhanced assessment breakdown
    renderEnhancedBreakdown(enhanced) {
        return `
            <div class="enhanced-breakdown">
                <div class="breakdown-item">
                    <span>University Score:</span>
                    <span>${enhanced.university_score || 0}/85</span>
                </div>
                <div class="breakdown-item">
                    <span>Semantic Enhancement:</span>
                    <span>${enhanced.semantic_bonus || 0}</span>
                </div>
                <div class="breakdown-item">
                    <span>AI Improvement:</span>
                    <span>${enhanced.ai_enhancement || 0}%</span>
                </div>
                <div class="breakdown-item">
                    <span>Education Relevance:</span>
                    <span>${enhanced.education_relevance || 0}%</span>
                </div>
                <div class="breakdown-item">
                    <span>Experience Relevance:</span>
                    <span>${enhanced.experience_relevance || 0}%</span>
                </div>
                <div class="breakdown-item">
                    <span>Training Relevance:</span>
                    <span>${enhanced.training_relevance || 0}%</span>
                </div>
            </div>
        `;
    },

    // NEW: Helper method to get job ID for candidate
    getJobIdForCandidate(candidate) {
        console.log('🔍 getJobIdForCandidate called with candidate:', candidate);
        
        // Try multiple possible job ID fields
        const possibleJobIds = [
            candidate.job_id,
            candidate.position_id,
            candidate.lspu_job_id,
            candidate.target_job_id,
            candidate.job_posting_id
        ];
        
        console.log('🎯 Possible job IDs found:', possibleJobIds);
        
        // Find first valid job ID
        for (const jobId of possibleJobIds) {
            if (jobId && jobId !== null && jobId !== undefined && jobId !== 0) {
                console.log('✅ Using job ID:', jobId);
                return jobId;
            }
        }
        
        // If no direct job ID, try to get from context or URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlJobId = urlParams.get('jobId') || urlParams.get('job_id');
        if (urlJobId) {
            console.log('🌐 Using job ID from URL:', urlJobId);
            return urlJobId;
        }
        
        // Try to get from currently selected job in upload module
        if (window.uploadModuleInstance && window.uploadModuleInstance.selectedJobId) {
            console.log('📤 Using job ID from upload module:', window.uploadModuleInstance.selectedJobId);
            return window.uploadModuleInstance.selectedJobId;
        }
        
        // Last resort: try to get from candidate's associated job data
        if (candidate.job_data && candidate.job_data.id) {
            console.log('📋 Using job ID from job_data:', candidate.job_data.id);
            return candidate.job_data.id;
        }
        
        console.warn('❌ No job ID found for candidate. Available fields:', Object.keys(candidate));
        return null;
    },

    // NEW: Animate circle chart
    animateCircleChart() {
        const circleChart = document.querySelector('.circle-chart');
        if (circleChart) {
            const percentage = circleChart.dataset.percentage;
            const circumference = 2 * Math.PI * 45; // radius = 45
            const strokeDashoffset = circumference - (percentage / 100) * circumference;
            
            // Add SVG circle if not exists
            if (!circleChart.querySelector('svg')) {
                circleChart.innerHTML = `
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#e0e0e0" stroke-width="8"/>
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#007bff" stroke-width="8"
                                stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
                                stroke-linecap="round" transform="rotate(-90 60 60)" 
                                style="transition: stroke-dashoffset 1s ease-in-out"/>
                    </svg>
                    <div class="chart-content">
                        <span class="percentage">${percentage}%</span>
                        <span class="label">Overall Relevance</span>
                    </div>
                `;
            }
        }
    },

    // NEW: Error rendering methods
    renderHybridScoringError(message) {
        const hybridContainer = document.querySelector('#candidateDetailsModal .hybrid-scoring-container');
        hybridContainer.innerHTML = `
            <div class="text-center p-3">
                <p class="text-muted">${message}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    },

    renderSemanticAnalysisError(message) {
        const semanticContainer = document.querySelector('#candidateDetailsModal .semantic-analysis-container');
        semanticContainer.innerHTML = `
            <div class="text-center p-3">
                <p class="text-muted">${message}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    },

    renderAssessmentComparisonError(message) {
        const comparisonContainer = document.querySelector('#candidateDetailsModal .assessment-comparison-container');
        comparisonContainer.innerHTML = `
            <div class="text-center p-3">
                <p class="text-muted">${message}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    },

    async fetchAssessmentData(candidateId) {
        try {
            const response = await fetch(`/api/candidates/${candidateId}/assessment`);
            if (response.ok) {
                const result = await response.json();
                return result.success ? result.assessment : null;
            }
            return null;
        } catch (error) {
            console.error('Error fetching assessment data:', error);
            return null;
        }
    },

    renderAssessmentResults(candidate, assessmentData) {
        const assessmentContainer = document.querySelector('#candidateDetailsModal .assessment-results-container');
        
        // Extract scores from assessment data - handle both old and new structures
        const detailedScores = assessmentData.university_assessment?.detailed_scores || {};
        const breakdown = {
            education: detailedScores.education || assessmentData.education_score || 0,
            experience: detailedScores.experience || assessmentData.experience_score || 0,
            training: detailedScores.training || assessmentData.training_score || 0,
            eligibility: detailedScores.eligibility || assessmentData.eligibility_score || 0,
            accomplishments: detailedScores.performance || assessmentData.accomplishments_score || 0,
            potential: assessmentData.potential_score || 0
        };
        
        const automatedTotal = assessmentData.automated_total || 0;
        const overallTotal = assessmentData.overall_total || 0;
        const percentageScore = (overallTotal / 100) * 100;
        
        assessmentContainer.innerHTML = `
            <div class="assessment-overview">
                <div class="assessment-scores-row">
                    <div class="score-section">
                        <div class="score-circle-large ${this.getScoreColorClass(automatedTotal)}">
                            <span class="score-value">${automatedTotal}</span>
                            <span class="score-label">Automated</span>
                        </div>
                        <p class="score-description">85 points maximum</p>
                    </div>
                    <div class="score-section">
                        <div class="score-circle-large ${this.getScoreColorClass(overallTotal)}">
                            <span class="score-value">${overallTotal}</span>
                            <span class="score-label">Overall</span>
                        </div>
                        <p class="score-description">100 points total</p>
                    </div>
                </div>
            </div>
            
            <div class="assessment-breakdown">
                <div class="criteria-header">
                    <h6>University Assessment Criteria</h6>
                    <small class="text-muted">Based on LSPU Standards</small>
                </div>
                
                <div class="criteria-list">
                    <div class="criteria-item">
                        <span class="criteria-label">I. Potential (15%) - Manual Entry</span>
                        <div class="criteria-controls">
                            <div class="potential-input-group">
                                <input type="number" 
                                       id="potentialScore" 
                                       class="form-control form-control-sm potential-input" 
                                       value="${breakdown.potential}" 
                                       min="0" 
                                       max="15" 
                                       step="0.1"
                                       data-candidate-id="${candidate.id}">
                                <span class="input-label">/ 15</span>
                                <button class="btn btn-sm btn-primary update-potential-btn" 
                                        onclick="CandidatesModule.updatePotentialScore(${candidate.id})">
                                    Update
                                </button>
                            </div>
                            <small class="text-muted">Interview (10%) + Aptitude Test (5%)</small>
                        </div>
                    </div>
                    
                    <div class="criteria-item automated">
                        <span class="criteria-label">II. Education (40%)</span>
                        <div class="criteria-bar">
                            <div class="criteria-fill education" style="width: ${(breakdown.education/40)*100}%"></div>
                        </div>
                        <span class="criteria-score">${breakdown.education}/40</span>
                    </div>
                    
                    <div class="criteria-item automated">
                        <span class="criteria-label">III. Experience (20%)</span>
                        <div class="criteria-bar">
                            <div class="criteria-fill experience" style="width: ${(breakdown.experience/20)*100}%"></div>
                        </div>
                        <span class="criteria-score">${breakdown.experience}/20</span>
                    </div>
                    
                    <div class="criteria-item automated">
                        <span class="criteria-label">IV. Training (10%)</span>
                        <div class="criteria-bar">
                            <div class="criteria-fill training" style="width: ${(breakdown.training/10)*100}%"></div>
                        </div>
                        <span class="criteria-score">${breakdown.training}/10</span>
                    </div>
                    
                    <div class="criteria-item automated">
                        <span class="criteria-label">V. Eligibility (10%)</span>
                        <div class="criteria-bar">
                            <div class="criteria-fill eligibility" style="width: ${(breakdown.eligibility/10)*100}%"></div>
                        </div>
                        <span class="criteria-score">${breakdown.eligibility}/10</span>
                    </div>
                    
                    <div class="criteria-item automated">
                        <span class="criteria-label">VI. Outstanding Accomplishments (5%)</span>
                        <div class="criteria-bar">
                            <div class="criteria-fill accomplishments" style="width: ${(breakdown.accomplishments/5)*100}%"></div>
                        </div>
                        <span class="criteria-score">${breakdown.accomplishments}/5</span>
                    </div>
                </div>
                
                <div class="assessment-summary">
                    <div class="summary-row">
                        <span class="summary-label">Automated Score (85%):</span>
                        <span class="summary-value">${automatedTotal}/85 points</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Manual Score (15%):</span>
                        <span class="summary-value">${breakdown.potential}/15 points</span>
                    </div>
                    <div class="summary-row total">
                        <span class="summary-label">Total Score (100%):</span>
                        <span class="summary-value">${overallTotal}/100 points</span>
                    </div>
                    <div class="summary-row percentage">
                        <span class="summary-label">Percentage:</span>
                        <span class="summary-value">${percentageScore.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderNoAssessmentData() {
        const assessmentContainer = document.querySelector('#candidateDetailsModal .assessment-results-container');
        assessmentContainer.innerHTML = `
            <div class="text-center p-4">
                <p class="text-muted">No assessment data available for this candidate.</p>
                <p class="small">Assessment requires PDS data.</p>
            </div>
        `;
    },

    renderAssessmentError() {
        const assessmentContainer = document.querySelector('#candidateDetailsModal .assessment-results-container');
        assessmentContainer.innerHTML = `
            <div class="text-center p-4">
                <p class="text-danger">Error loading assessment data.</p>
                <button class="btn btn-sm btn-secondary" onclick="location.reload()">Refresh Page</button>
            </div>
        `;
    },
    // Update potential score via AJAX
    async updatePotentialScore(candidateId) {
        const input = document.getElementById('potentialScore');
        const updateBtn = document.querySelector('.update-potential-btn');
        const newScore = parseFloat(input.value) || 0;
        
        if (newScore < 0 || newScore > 15) {
            this.showNotification('Potential score must be between 0 and 15', 'error');
            input.focus();
            return;
        }
        
        // Show loading state
        const originalBtnText = updateBtn.textContent;
        updateBtn.disabled = true;
        updateBtn.textContent = 'Updating...';
        
        try {
            // Use the correct potential score update API endpoint
            const response = await fetch('/api/update_potential_score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    candidate_id: candidateId,
                    potential_score: newScore
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    // Show success message with enhanced assessment info
                    this.showNotification('✅ Potential score updated and enhanced assessment recalculated!', 'success');
                    
                    console.log('🔄 Enhanced assessment results:', result);
                    
                    // Update assessment scores in real-time if enhanced scores are available
                    if (result.updated_scores) {
                        console.log('� New Scores:', {
                            traditional: result.updated_scores.traditional_score,
                            semantic: result.updated_scores.semantic_score,
                            overall: result.updated_scores.overall_score
                        });
                        
                        // Update the modal assessment display immediately
                        this.updateModalScoresDisplay(candidateId, result.updated_scores);
                    }
                    
                    // Update the potential score display
                    this.updatePotentialScoreDisplay(candidateId, newScore);
                    
                    // Reload candidates to refresh application section scores
                    await this.loadCandidates();
                    
                    // If assessment modal is open, refresh it
                    const assessmentModal = document.getElementById('assessmentModal');
                    if (assessmentModal && assessmentModal.style.display !== 'none') {
                        // Get current candidate info from modal
                        const candidateNameElement = assessmentModal.querySelector('.candidate-name');
                        if (candidateNameElement) {
                            // Refresh the assessment modal with updated scores
                            await this.showAssessment(candidateId, candidateId); // Assuming job_id matches for current context
                        }
                    }
                    
                } else {
                    throw new Error(result.error || 'Failed to update potential score');
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error updating potential score:', error);
            this.showNotification(`Failed to update potential score: ${error.message}`, 'error');
        } finally {
            // Restore button state
            updateBtn.disabled = false;
            updateBtn.textContent = originalBtnText;
        }
    },

    /**
     * Update modal scores display in real-time
     */
    updateModalScoresDisplay(candidateId, updatedScores) {
        try {
            // Update traditional score displays
            const traditionalElements = document.querySelectorAll('[data-score-type="traditional"]');
            traditionalElements.forEach(el => {
                if (el.textContent.includes('%') || el.textContent.includes('Score')) {
                    el.textContent = `${updatedScores.traditional_score.toFixed(1)}`;
                }
            });

            // Update semantic score displays
            const semanticElements = document.querySelectorAll('[data-score-type="semantic"]');
            semanticElements.forEach(el => {
                if (el.textContent.includes('%') || el.textContent.includes('Score')) {
                    el.textContent = `${updatedScores.semantic_score.toFixed(1)}`;
                }
            });

            // Update overall score displays
            const overallElements = document.querySelectorAll('[data-score-type="overall"]');
            overallElements.forEach(el => {
                if (el.textContent.includes('%') || el.textContent.includes('Score')) {
                    el.textContent = `${updatedScores.overall_score.toFixed(1)}`;
                }
            });

            console.log('✅ Modal scores display updated in real-time');
        } catch (error) {
            console.error('Error updating modal scores display:', error);
        }
    },

    /**
     * Update potential score display in real-time
     */
    updatePotentialScoreDisplay(candidateId, newScore) {
        try {
            // Update the input field to reflect the saved value
            const potentialInput = document.getElementById('potentialScore');
            if (potentialInput) {
                potentialInput.value = newScore.toFixed(1);
            }

            // Update any potential score displays in the UI
            const potentialElements = document.querySelectorAll(`[data-candidate-id="${candidateId}"] .potential-score`);
            potentialElements.forEach(el => {
                el.textContent = newScore.toFixed(1);
            });

            console.log('✅ Potential score display updated');
        } catch (error) {
            console.error('Error updating potential score display:', error);
        }
    },
    
    // Update assessment display with new potential score
    updateAssessmentDisplay(candidateId, newPotentialScore) {
        console.log(`🔄 Updating assessment display for candidate ${candidateId} with potential score ${newPotentialScore}`);
        
        // Refresh the assessment data directly from the API
        this.fetchAssessmentData(candidateId).then(assessmentData => {
            console.log('📊 Fetched assessment data:', assessmentData);
            
            if (assessmentData) {
                // Update the assessment breakdown
                const candidate = { id: candidateId };
                this.renderAssessmentResults(candidate, assessmentData);
                
                // Update the top score circle with new overall score
                const overallTotal = assessmentData.overall_total || 0;
                console.log(`🎯 Updating overall score to: ${overallTotal}`);
                
                const scoreCircle = document.querySelector('#candidateDetailsModal .score-circle');
                const scoreValue = scoreCircle.querySelector('.score-value');
                if (scoreValue) {
                    scoreValue.textContent = `${overallTotal}`;
                    scoreCircle.className = `score-circle ${this.getScoreColorClass(overallTotal)}`;
                }
                
                // Update the candidate's score in the main table
                this.updateCandidateRowScore(candidateId, overallTotal);
                
                // Update the hybrid scoring display if it exists
                this.updateHybridScoringDisplay(candidateId, assessmentData);
                
                // Update the assessment comparison display if it exists  
                this.updateAssessmentComparisonDisplay(candidateId);
            } else {
                console.error('❌ No assessment data received');
            }
        }).catch(error => {
            console.error('💥 Error updating assessment display:', error);
        });
    },
    
    // Update candidate row score in the main table
    updateCandidateRowScore(candidateId, newAssessmentScore) {
        // Find the candidate row in the table
        const candidateRow = document.querySelector(`tr[data-candidate-id="${candidateId}"]`);
        if (candidateRow) {
            // Update the score column
            const scoreColumn = candidateRow.querySelector('.score-column');
            if (scoreColumn) {
                const scoreClass = this.getScoreColorClass(newAssessmentScore);
                scoreColumn.innerHTML = `
                    <div class="score-compact">
                        <span class="score-badge ${scoreClass}">${newAssessmentScore}/100</span>
                        <div class="score-bar-mini">
                            <div class="score-fill ${scoreClass}" style="width: ${newAssessmentScore}%"></div>
                        </div>
                    </div>
                `;
            }
        }
        
        // Also update the cached candidate data if it exists
        if (this.candidatesData) {
            // Find the candidate in the grouped data structure
            Object.values(this.candidatesData).forEach(jobData => {
                if (jobData.candidates) {
                    const candidate = jobData.candidates.find(c => c.id == candidateId);
                    if (candidate) {
                        candidate.assessment_score = newAssessmentScore;
                        candidate.score = newAssessmentScore;
                    }
                }
            });
        }
    },
    
    // Update hybrid scoring display with new assessment data
    async updateHybridScoringDisplay(candidateId, assessmentData) {
        console.log(`🔄 Updating hybrid scoring display for candidate ${candidateId}`);
        
        const hybridContainer = document.querySelector('#candidateDetailsModal .hybrid-scoring-container');
        
        if (!hybridContainer) {
            console.log('⚠️ Hybrid scoring container not found - section not currently visible');
            return;
        }
        
        try {
            // Get the job ID for this candidate to fetch hybrid data
            const jobId = this.getJobIdForCandidate({ id: candidateId });
            console.log(`🔍 Found job ID: ${jobId}`);
            
            if (jobId) {
                // Fetch fresh hybrid assessment data using the existing endpoint
                console.log(`📡 Fetching hybrid data from /api/candidates/${candidateId}/assessment/${jobId}`);
                const response = await fetch(`/api/candidates/${candidateId}/assessment/${jobId}`);
                if (response.ok) {
                    const result = await response.json();
                    console.log('📊 Received hybrid assessment data:', result);
                    
                    if (result.success && result.assessment) {
                        // Re-render the hybrid scoring with updated data
                        console.log('🎨 Re-rendering hybrid scoring results');
                        this.renderHybridScoringResults(result.assessment);
                        
                        // Highlight the updated sections briefly
                        this.highlightUpdatedElements();
                    } else {
                        console.error('❌ Invalid hybrid assessment response:', result);
                    }
                } else {
                    console.error('❌ Failed to fetch hybrid assessment data:', response.status, response.statusText);
                }
            } else {
                console.error('❌ No job ID found for candidate');
            }
        } catch (error) {
            console.error('💥 Error updating hybrid scoring display:', error);
        }
    },
    
    // Highlight updated elements to show user what changed
    highlightUpdatedElements() {
        // Highlight the potential score in university assessment
        const potentialElements = document.querySelectorAll('.university-breakdown .breakdown-item:last-child');
        potentialElements.forEach(element => {
            element.style.transition = 'background-color 0.3s ease';
            element.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                element.style.backgroundColor = '';
            }, 2000);
        });
        
        // Highlight the overall university score
        const universityScoreElements = document.querySelectorAll('.university-method .score-value');
        universityScoreElements.forEach(element => {
            element.style.transition = 'color 0.3s ease';
            element.style.color = '#28a745';
            setTimeout(() => {
                element.style.color = '';
            }, 2000);
        });
        
        // Highlight the enhanced assessment total
        const enhancedScoreElements = document.querySelectorAll('.hybrid-score-item.total .value');
        enhancedScoreElements.forEach(element => {
            element.style.transition = 'color 0.3s ease';
            element.style.color = '#007bff';
            setTimeout(() => {
                element.style.color = '';
            }, 2000);
        });
    },
    
    // Update assessment comparison display with new assessment data
    async updateAssessmentComparisonDisplay(candidateId) {
        const comparisonContainer = document.querySelector('#candidateDetailsModal .assessment-comparison-container');
        
        if (!comparisonContainer) {
            // Assessment comparison section not currently visible
            return;
        }
        
        try {
            // Fetch fresh assessment comparison data using the existing endpoint
            const response = await fetch(`/api/candidates/${candidateId}/assessment/comparison`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // Re-render the assessment comparison with updated data
                    this.renderAssessmentComparisonResults(result.data);
                }
            }
        } catch (error) {
            console.error('Error updating assessment comparison display:', error);
        }
    },
    
    // Show notification message
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    },

    // Populate personal information section
    populatePersonalInfo(pdsData) {
        console.log('🔍 Populating personal info with PDS data:', pdsData);
        const personalInfo = pdsData.personal_info || {};
        console.log('📋 Personal info extracted:', personalInfo);
        
        // Enhanced debugging: log all available keys
        console.log('🔑 Available personal info keys:', Object.keys(personalInfo));
        console.log('👤 Individual fields:');
        console.log('  - first_name:', personalInfo.first_name);
        console.log('  - middle_name:', personalInfo.middle_name);
        console.log('  - surname:', personalInfo.surname);
        console.log('  - name_extension:', personalInfo.name_extension);
        console.log('  - full_name:', personalInfo.full_name);
        console.log('  - mobile_no:', personalInfo.mobile_no);
        console.log('  - telephone_no:', personalInfo.telephone_no);
        console.log('  - email:', personalInfo.email);
        
        // Full Name - Enhanced logic with multiple fallbacks
        let fullName = '';
        
        // Method 1: Use existing full_name field if available
        if (personalInfo.full_name && 
            personalInfo.full_name.trim() !== '' && 
            personalInfo.full_name.toLowerCase() !== 'n/a' &&
            !personalInfo.full_name.includes('N/a')) {
            fullName = personalInfo.full_name.replace(/\s+N\/a$/i, '').trim();
        }
        
        // Method 2: Construct from name parts if full_name is not good
        if (!fullName || fullName === '') {
            const nameParts = [
                personalInfo.first_name,
                personalInfo.middle_name,
                personalInfo.surname,
                personalInfo.name_extension
            ].filter(part => part && 
                      part.trim() !== '' && 
                      part.toLowerCase() !== 'n/a' &&
                      part.toLowerCase() !== 'none');
            
            if (nameParts.length > 0) {
                fullName = nameParts.join(' ');
            }
        }
        
        // Method 3: Try alternative field names
        if (!fullName || fullName === '') {
            const altNameFields = ['name', 'candidate_name', 'applicant_name'];
            for (const field of altNameFields) {
                if (personalInfo[field] && 
                    personalInfo[field].trim() !== '' && 
                    personalInfo[field].toLowerCase() !== 'n/a') {
                    fullName = personalInfo[field];
                    break;
                }
            }
        }
        
        console.log('✅ Final full name:', fullName);
        
        // Enhanced safe element access with better logging
        const setTextContent = (id, value, label = id) => {
            const element = document.getElementById(id);
            if (element) {
                const displayValue = (value && value.toString().trim() !== '' && 
                                   value.toString().toLowerCase() !== 'n/a' && 
                                   value.toString().toLowerCase() !== 'none') ? value.toString() : 'N/A';
                element.textContent = displayValue;
                console.log(`📝 Set ${label}:`, displayValue);
            } else {
                console.warn(`❌ Element with ID '${id}' not found`);
            }
        };
        
        // Set all personal information fields
        setTextContent('fullName', fullName, 'Full Name');
        setTextContent('dateOfBirth', personalInfo.date_of_birth, 'Date of Birth');
        setTextContent('placeOfBirth', personalInfo.place_of_birth, 'Place of Birth');
        setTextContent('gender', personalInfo.sex, 'Gender');
        setTextContent('civilStatus', personalInfo.civil_status, 'Civil Status');
        setTextContent('citizenship', personalInfo.citizenship, 'Citizenship');
        
        // Physical Information
        setTextContent('height', personalInfo.height ? `${personalInfo.height} m` : null, 'Height');
        setTextContent('weight', personalInfo.weight ? `${personalInfo.weight} kg` : null, 'Weight');
        setTextContent('bloodType', personalInfo.blood_type, 'Blood Type');
        
        // Contact Information - Enhanced with multiple fallbacks
        let mobileNo = personalInfo.mobile_no || personalInfo.phone || personalInfo.mobile;
        let telephoneNo = personalInfo.telephone_no || personalInfo.tel_no || personalInfo.telephone;
        let email = personalInfo.email || personalInfo.email_address;
        
        console.log('📞 Contact info processing:');
        console.log('  - mobile options:', {
            mobile_no: personalInfo.mobile_no,
            phone: personalInfo.phone,
            mobile: personalInfo.mobile,
            final: mobileNo
        });
        
        //setTextContent('mobileNo', mobileNo, 'Mobile Number');
        //setTextContent('telephoneNo', telephoneNo, 'Telephone Number');
        //setTextContent('emailAddress', email, 'Email Address');
        
        // Addresses - Enhanced handling
        let residentialAddr = '';
        let permanentAddr = '';
        
        if (personalInfo.residential_address) {
            if (typeof personalInfo.residential_address === 'string') {
                residentialAddr = personalInfo.residential_address;
            } else if (personalInfo.residential_address.full_address) {
                residentialAddr = personalInfo.residential_address.full_address;
            } else {
                // Try to construct from parts
                const addrParts = [
                    personalInfo.residential_address.house_block_lot_no,
                    personalInfo.residential_address.street,
                    personalInfo.residential_address.subdivision_village,
                    personalInfo.residential_address.barangay,
                    personalInfo.residential_address.city_municipality,
                    personalInfo.residential_address.province,
                    personalInfo.residential_address.zip_code
                ].filter(part => part && part.trim() !== '');
                
                if (addrParts.length > 0) {
                    residentialAddr = addrParts.join(', ');
                }
            }
        }
        
        if (personalInfo.permanent_address) {
            if (typeof personalInfo.permanent_address === 'string') {
                permanentAddr = personalInfo.permanent_address;
            } else if (personalInfo.permanent_address.full_address) {
                permanentAddr = personalInfo.permanent_address.full_address;
            } else {
                // Try to construct from parts
                const addrParts = [
                    personalInfo.permanent_address.house_block_lot_no,
                    personalInfo.permanent_address.street,
                    personalInfo.permanent_address.subdivision_village,
                    personalInfo.permanent_address.barangay,
                    personalInfo.permanent_address.city_municipality,
                    personalInfo.permanent_address.province,
                    personalInfo.permanent_address.zip_code
                ].filter(part => part && part.trim() !== '');
                
                if (addrParts.length > 0) {
                    permanentAddr = addrParts.join(', ');
                }
            }
        }
        
        setTextContent('residentialAddress', residentialAddr, 'Residential Address');
        setTextContent('permanentAddress', permanentAddr, 'Permanent Address');
        
        console.log('✅ Personal information population completed');
    },

    // Format ID labels for display
    formatIDLabel(key) {
        const labels = {
            'gsis_id': 'GSIS ID',
            'pagibig_id': 'Pag-IBIG ID',
            'philhealth_no': 'PhilHealth No.',
            'sss_no': 'SSS No.',
            'tin_no': 'TIN No.'
        };
        return labels[key] || key.replace('_', ' ').toUpperCase();
    },

    // Setup modal action buttons
    setupModalActions() {
        const removeBtn = document.getElementById('removeCandidate');
        const shortlistBtn = document.getElementById('shortlistCandidate');
        const rejectBtn = document.getElementById('rejectCandidate');
        
        if (removeBtn) {
            removeBtn.addEventListener('click', async () => {
                const candidateId = removeBtn.dataset.candidateId;
                const confirmed = await confirmRemove('this candidate');
                if (confirmed) {
                    await this.removeCandidate(candidateId);
                    this.modal.hide();
                }
            });
        }
        
        if (shortlistBtn) {
            shortlistBtn.addEventListener('click', async () => {
                const candidateId = shortlistBtn.dataset.candidateId;
                await this.updateCandidateStatus(candidateId, 'shortlisted');
                this.modal.hide();
            });
        }
        
        if (rejectBtn) {
            rejectBtn.addEventListener('click', async () => {
                const candidateId = rejectBtn.dataset.candidateId;
                await this.updateCandidateStatus(candidateId, 'rejected');
                this.modal.hide();
            });
        }
    },

    // Remove candidate
    async removeCandidate(candidateId, showToast = true) {
        try {
            const result = await APIService.candidates.delete(candidateId);
            
            if (result.success) {
                if (showToast) {
                    ToastUtils.showSuccess('Candidate removed successfully');
                    await this.loadCandidates();
                }
                return true;
            } else {
                if (showToast) {
                    ToastUtils.showError('Failed to remove candidate');
                }
                return false;
            }
        } catch (error) {
            console.error('Error removing candidate:', error);
            if (showToast) {
                ToastUtils.showError('Error removing candidate');
            }
            return false;
        }
    },

    // Update candidate status
    async updateCandidateStatus(candidateId, status, showToast = true) {
        try {
            const result = await APIService.candidates.updateStatus(candidateId, status);
            
            if (result.success) {
                if (showToast) {
                    ToastUtils.showSuccess(`Candidate ${status} successfully`);
                    await this.loadCandidates();
                }
                return true;
            } else {
                if (showToast) {
                    ToastUtils.showError('Failed to update candidate status');
                }
                return false;
            }
        } catch (error) {
            console.error('Error updating candidate status:', error);
            if (showToast) {
                ToastUtils.showError('Error updating candidate status');
            }
            return false;
        }
    },

    // Handle remove candidate with confirmation
    async handleRemoveCandidate(candidateId) {
        const confirmed = await confirmRemove('this candidate');
        if (confirmed) {
            await this.removeCandidate(candidateId);
        }
    },

    // Get processing type label with appropriate styling
    getProcessingTypeLabel(processingType, ocrConfidence = null) {
        const typeConfig = {
            'resume': {
                label: 'Resume',
                icon: 'fas fa-file-alt',
                class: 'processing-type-resume'
            },
            'pds': {
                label: 'PDS Excel',
                icon: 'fas fa-file-excel',
                class: 'processing-type-pds'
            },
            'pds_digital': {
                label: 'PDS Excel',
                icon: 'fas fa-file-excel',
                class: 'processing-type-pds'
            },
            'excel_pds_enhanced': {
                label: 'PDS Excel',
                icon: 'fas fa-file-excel',
                class: 'processing-type-pds'
            },
            'excel_pds_fallback': {
                label: 'PDS Excel',
                icon: 'fas fa-file-excel',
                class: 'processing-type-pds'
            },
            'excel_pds_basic': {
                label: 'PDS Excel',
                icon: 'fas fa-file-excel',
                class: 'processing-type-pds'
            },
            'pds_text': {
                label: 'PDS Text',
                icon: 'fas fa-file-text',
                class: 'processing-type-pds-text'
            },
            'pds_only': {
                label: 'PDS Only',
                icon: 'fas fa-id-card',
                class: 'processing-type-pds-only'
            },
            'ocr_scanned': {
                label: 'OCR Scanned',
                icon: 'fas fa-scanner',
                class: 'processing-type-ocr'
            }
        };

        // Default to PDS Excel for any unknown types since that's the system default now
        const config = typeConfig[processingType] || {
            label: 'PDS Excel',
            icon: 'fas fa-file-excel',
            class: 'processing-type-pds'
        };

        // Add OCR confidence if available
        let confidenceDisplay = '';
        if (processingType === 'ocr_scanned' && ocrConfidence !== null && ocrConfidence !== undefined) {
            const confidenceClass = this.getConfidenceColorClass(ocrConfidence);
            confidenceDisplay = ` <span class="ocr-confidence-badge ${confidenceClass}" title="OCR Confidence: ${ocrConfidence}%">${Math.round(ocrConfidence)}%</span>`;
        }

        return `<span class="processing-type-badge ${config.class}" title="Processed using ${config.label}">
                    <i class="${config.icon}"></i> ${config.label}${confidenceDisplay}
                </span>`;
    },

    // Get score color class
    getScoreColorClass(score) {
        if (score >= 80) return 'score-excellent';
        if (score >= 60) return 'score-good';
        if (score >= 40) return 'score-fair';
        return 'score-poor';
    },

    // PDS-specific formatting methods for Phase 2 frontend modernization
    
    // Format government IDs for display
    formatGovernmentIds(candidate) {
        let govIds = candidate.government_ids || {};
        
        // If government_ids is empty, try to extract from PDS data
        if (Object.keys(govIds).length === 0 && candidate.pds_data && candidate.pds_data.personal_info) {
            const personalInfo = candidate.pds_data.personal_info;
            govIds = {
                gsis_id: personalInfo.gsis_id,
                pagibig_id: personalInfo.pagibig_id,
                philhealth_no: personalInfo.philhealth_no,
                sss_no: personalInfo.sss_no,
                tin_no: personalInfo.tin_no
            };
        }
        
        const ids = [];
        
        // Priority order for display - Updated to match actual PDS field names
        const idTypes = [
            { key: 'tin_no', label: 'TIN', icon: 'fa-id-card' },
            { key: 'sss_no', label: 'SSS', icon: 'fa-shield-alt' },
            { key: 'philhealth_no', label: 'PhilHealth', icon: 'fa-heartbeat' },
            { key: 'pagibig_id', label: 'Pag-IBIG', icon: 'fa-home' },
            { key: 'gsis_id', label: 'GSIS', icon: 'fa-university' }
        ];
        
        idTypes.forEach(idType => {
            const value = govIds[idType.key];
            if (value && 
                value.toString().trim() !== '' && 
                value.toString().toLowerCase() !== 'n/a' &&
                value.toString().toLowerCase() !== 'none' &&
                value.toString() !== 'null') {
                ids.push(`<span class="gov-id-item" title="${idType.label}: ${value}">
                    <i class="fas ${idType.icon}"></i> ${idType.label}
                </span>`);
            }
        });
        
        if (ids.length === 0) {
            return '<span class="text-muted"><i class="fas fa-id-card-alt"></i> Not provided</span>';
        }
        
        // Show max 2 IDs, with count if more
        const displayed = ids.slice(0, 2);
        const additional = ids.length > 2 ? `<span class="ids-count">+${ids.length - 2}</span>` : '';
        
        return displayed.join(' ') + additional;
    },
    
    // Get highest education level
    getHighestEducationLevel(candidate) {
        const education = candidate.education || [];
        if (!Array.isArray(education) || education.length === 0) {
            return '<span class="text-muted">Not specified</span>';
        }
        
        // Education level priority (highest to lowest) - Enhanced for Graduate Studies
        const levelPriority = {
            'doctorate': 6,
            'doctoral': 6,
            'phd': 6,
            'ph.d': 6,
            'doctor': 6,
            'masters': 5,
            'master': 5,
            'm.a.': 5,
            'm.s.': 5,
            'graduate': 4, // Base graduate level
            'college': 3,
            'bachelor': 3,
            'undergraduate': 3,
            'vocational': 2,
            'technical': 2,
            'trade': 2,
            'secondary': 1,
            'high school': 1,
            'elementary': 0
        };
        
        let highest = null;
        let highestPriority = -1;
        
        education.forEach(edu => {
            const level = (edu.level || '').toLowerCase();
            const degree = (edu.degree || edu.degree_course || edu.course || '').toLowerCase();
            const degreeType = (edu.degree_type || '').toLowerCase();
            const school = edu.school || edu.institution || '';
            
            let priority = -1;
            let displayLevel = level;
            
            // Special handling for Graduate Studies
            if (level.includes('graduate')) {
                if (degreeType === 'doctorate' || degreeType === 'doctoral') {
                    priority = 6;
                    displayLevel = 'Doctorate';
                } else if (degreeType === 'masters' || degreeType === 'master') {
                    priority = 5;
                    displayLevel = "Master's Degree";
                } else {
                    // Check degree text for additional clues
                    if (degree.includes('doctorate') || degree.includes('doctoral') || degree.includes('ph.d') || degree.includes('phd')) {
                        priority = 6;
                        displayLevel = 'Doctorate';
                    } else if (degree.includes('master') || degree.includes('masters') || degree.includes('m.a.') || degree.includes('m.s.')) {
                        priority = 5;
                        displayLevel = "Master's Degree";
                    } else {
                        priority = 4;
                        displayLevel = 'Graduate Studies';
                    }
                }
            } else {
                // Check standard level priority
                priority = levelPriority[level] || -1;
                
                if (priority === -1) {
                    // Check degree content for keywords
                    for (const [keyword, prio] of Object.entries(levelPriority)) {
                        if (degree.includes(keyword) && prio > priority) {
                            priority = prio;
                            if (keyword === 'masters' || keyword === 'master') {
                                displayLevel = "Master's Degree";
                            } else if (keyword === 'doctorate' || keyword === 'doctoral' || keyword === 'phd') {
                                displayLevel = 'Doctorate';
                            }
                        }
                    }
                }
            }
            
            if (priority > highestPriority) {
                highest = { ...edu, displayLevel };
                highestPriority = priority;
            }
        });
        
        if (highest) {
            const level = highest.displayLevel || highest.level || 'Unknown';
            const school = highest.school || highest.institution || '';
            const displayText = level.charAt(0).toUpperCase() + level.slice(1);
            
            // Special icons and colors for different levels
            let icon = 'fas fa-graduation-cap';
            let colorClass = '';
            
            if (level.toLowerCase().includes('doctorate') || level.toLowerCase().includes('phd')) {
                icon = 'fas fa-user-graduate';
                colorClass = 'text-purple';
            } else if (level.toLowerCase().includes('master')) {
                icon = 'fas fa-graduation-cap';
                colorClass = 'text-success';
            } else if (level.toLowerCase().includes('graduate')) {
                icon = 'fas fa-graduation-cap';
                colorClass = 'text-info';
            }
            
            return `<span class="education-level ${colorClass}" title="${displayText} - ${school}">
                <i class="${icon}"></i> ${displayText}
            </span>`;
        }
        
        return '<span class="text-muted">Not classified</span>';
    },
    
    // Format civil service eligibility
    formatCivilServiceEligibility(candidate) {
        const eligibility = candidate.eligibility || [];
        if (!Array.isArray(eligibility) || eligibility.length === 0) {
            return '<span class="text-muted"><i class="fas fa-certificate"></i> None</span>';
        }
        
        // Filter out invalid entries and find the best eligibility
        const validEligibility = eligibility.filter(elig => 
            elig.eligibility && 
            elig.eligibility.trim() !== '' && 
            !elig.eligibility.includes('WORK EXPERIENCE') &&
            !elig.eligibility.includes('Continue on separate') &&
            !elig.eligibility.includes('28.') &&
            !elig.eligibility.includes('From') &&
            !elig.eligibility.includes('To')
        );
        
        if (validEligibility.length === 0) {
            return '<span class="text-muted"><i class="fas fa-certificate"></i> None</span>';
        }
        
        // Find the best eligibility (with rating or most recent)
        let best = null;
        let bestRating = 0;
        
        validEligibility.forEach(elig => {
            const rating = parseFloat(elig.rating || 0);
            const examName = elig.eligibility || '';
            
            if (examName && rating > bestRating) {
                best = elig;
                bestRating = rating;
            } else if (examName && !best) {
                best = elig; // Take first valid entry if no ratings found
            }
        });
        
        if (best) {
            const examType = best.eligibility || 'Civil Service';
            const rating = best.rating || '';
            
            let badgeClass = 'badge bg-secondary';
            if (rating && parseFloat(rating) >= 80) {
                badgeClass = 'badge bg-success';
            } else if (rating && parseFloat(rating) >= 70) {
                badgeClass = 'badge bg-warning';
            }
            
            const ratingText = rating ? ` (${rating}%)` : '';
            const title = `${examType}${ratingText}${best.date_exam ? ` - ${best.date_exam}` : ''}`;
            
            // Show count if multiple eligibilities
            const countText = validEligibility.length > 1 ? ` +${validEligibility.length - 1}` : '';
            
            return `<span class="${badgeClass}" title="${title}">
                <i class="fas fa-certificate"></i> ${FormatUtils.truncateText(examType, 12)}${ratingText}${countText}
            </span>`;
        }
        
        // Fallback: show count of eligibilities
        return `<span class="badge bg-info" title="${validEligibility.length} eligibility entries">
            <i class="fas fa-certificate"></i> ${validEligibility.length} entries
        </span>`;
    },
    
    // Format assessment score with breakdown
    formatAssessmentScore(candidate) {
        let traditionalScore = candidate.traditional_score || candidate.score || 0;
        let semanticScore = candidate.semantic_score || candidate.assessment_score || candidate.score || 0;
        
        // Try to get scores from unified assessment if available
        if (candidate.unified_assessment) {
            semanticScore = candidate.unified_assessment.semantic_score || semanticScore;
            traditionalScore = candidate.unified_assessment.traditional_score || traditionalScore;
        }
        
        console.log('🎯 FormatAssessmentScore using:', { traditionalScore, semanticScore });
        
        // Show both scores with semantic as primary
        return `
            <div class="dual-score-display">
                <div class="primary-score">
                    <strong>${semanticScore.toFixed(1)}</strong>
                    <small class="score-label">Semantic</small>
                </div>
                <div class="secondary-score">
                    <span>${traditionalScore.toFixed(1)}</span>
                    <small class="score-label">Traditional</small>
                </div>
            </div>
        `;
    },

    // Get confidence color class for OCR confidence scores
    getConfidenceColorClass(confidence) {
        if (confidence >= 85) return 'confidence-high';
        if (confidence >= 70) return 'confidence-medium';
        if (confidence >= 50) return 'confidence-low';
        return 'confidence-very-low';
    },

    // Force reload candidates data (useful for manual refresh)
    async forceReload() {
        console.log('🔄 Force reloading candidates data...');
        this.hasLoadedInitially = false;
        this.candidatesData = null;
        await this.loadCandidates();
    },

    // ===== MANUAL OVERRIDE FUNCTIONALITY =====

    // Edit criterion score with inline editing interface
    async editCriterionScore(candidateId, criterion, currentScore, maxScore) {
        console.log(`🖊️ Editing ${criterion} score for candidate ${candidateId}`);
        
        // Get the criterion element
        const criterionElement = document.querySelector(`[data-criterion="${criterion}"]`);
        if (!criterionElement) {
            console.error(`Criterion element not found: ${criterion}`);
            return;
        }

        // Get current overrides to see if this criterion is already overridden
        let existingOverride = null;
        try {
            const overridesResponse = await fetch(`/api/candidates/${candidateId}/overrides`);
            if (overridesResponse.ok) {
                const data = await overridesResponse.json();
                const overrides = data.overrides || {};
                existingOverride = overrides[criterion] || null;
                console.log(`🔍 Checking existing override for ${criterion}:`, existingOverride);
            }
        } catch (error) {
            console.warn('Could not fetch existing overrides:', error);
        }

        const scoreDisplayContainer = criterionElement.querySelector('.score-display-container');
        
        // Create inline editing interface
        const editingInterface = `
            <div class="inline-edit-container" id="edit-${criterion}">
                <div class="input-group input-group-sm mb-2">
                    <span class="input-group-text"><i class="fas fa-edit"></i></span>
                    <input type="number" 
                           class="form-control" 
                           id="edit-score-${criterion}"
                           min="0" 
                           max="${maxScore}" 
                           step="0.1" 
                           value="${existingOverride ? existingOverride.override_score : currentScore}"
                           placeholder="Score">
                    <span class="input-group-text">/${maxScore}</span>
                </div>
                <textarea class="form-control form-control-sm mb-2" 
                          id="edit-reason-${criterion}"
                          placeholder="Reason for manual override (required)"
                          rows="2">${existingOverride ? existingOverride.reason : ''}</textarea>
                <div class="btn-group w-100" role="group">
                    <button class="btn btn-success btn-sm" 
                            onclick="CandidatesModule.saveCriterionOverride('${candidateId}', '${criterion}', ${currentScore}, ${maxScore})">
                        <i class="fas fa-save me-1"></i>Save
                    </button>
                    <button class="btn btn-secondary btn-sm" 
                            onclick="CandidatesModule.cancelCriterionEdit('${candidateId}', '${criterion}', ${currentScore}, ${maxScore})">
                        <i class="fas fa-times me-1"></i>Cancel
                    </button>
                    ${existingOverride ? `
                    <button class="btn btn-warning btn-sm" 
                            onclick="CandidatesModule.resetCriterionScore('${candidateId}', '${criterion}', ${currentScore}, ${maxScore})"
                            title="Reset to system calculation">
                        <i class="fas fa-undo me-1"></i>Reset
                    </button>
                    ` : '<!-- No existing override, reset button hidden -->'}
                </div>
            </div>
        `;

        console.log(`🔍 Edit interface for ${criterion}: existingOverride =`, existingOverride);
        console.log(`🔍 Reset button will be ${existingOverride ? 'SHOWN' : 'HIDDEN'}`);

        // Replace the score display with editing interface
        scoreDisplayContainer.innerHTML = editingInterface;
        
        // Focus on the score input
        const scoreInput = document.getElementById(`edit-score-${criterion}`);
        scoreInput.focus();
        scoreInput.select();
    },

    // Cancel criterion editing and restore original display
    cancelCriterionEdit(candidateId, criterion, currentScore, maxScore) {
        console.log(`❌ Canceling edit for ${criterion}`);
        this.restoreCriterionDisplay(candidateId, criterion, currentScore, maxScore, false);
    },

    // Save criterion override
    async saveCriterionOverride(candidateId, criterion, originalScore, maxScore) {
        console.log(`💾 Saving ${criterion} override for candidate ${candidateId}`);
        
        const scoreInput = document.getElementById(`edit-score-${criterion}`);
        const reasonInput = document.getElementById(`edit-reason-${criterion}`);
        
        const newScore = parseFloat(scoreInput.value) || 0;
        const reason = reasonInput.value.trim();
        
        // Validation
        if (newScore < 0 || newScore > maxScore) {
            this.showNotification(`Score must be between 0 and ${maxScore}`, 'error');
            scoreInput.focus();
            return;
        }
        
        if (!reason) {
            this.showNotification('Please provide a reason for the manual override', 'error');
            reasonInput.focus();
            return;
        }

        // Show loading state
        const saveBtn = document.querySelector(`#edit-${criterion} .btn-success`);
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Saving...';

        try {
            const response = await fetch(`/api/candidates/${candidateId}/override/${criterion}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    original_score: originalScore,
                    override_score: newScore,
                    reason: reason
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Override saved successfully:', result);
                
                this.showNotification(`✅ ${criterion.charAt(0).toUpperCase() + criterion.slice(1)} score updated successfully!`, 'success');
                
                // Update the display with new score and override indicator
                this.restoreCriterionDisplay(candidateId, criterion, newScore, maxScore, true, reason);
                
                // Trigger real-time score recalculation
                await this.recalculateAssessmentScores(candidateId);
                
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error saving override:', error);
            this.showNotification(`Failed to save override: ${error.message}`, 'error');
            
            // Restore button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    },

    // Reset criterion score to system calculation
    async resetCriterionScore(candidateId, criterion, originalScore, maxScore) {
        console.log(`🔄 Resetting ${criterion} score for candidate ${candidateId}`);
        console.log(`🔍 Reset parameters: candidateId=${candidateId}, criterion=${criterion}, originalScore=${originalScore}, maxScore=${maxScore}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to reset the ${criterion} score back to system calculation?`)) {
            console.log('❌ Reset cancelled by user');
            return;
        }

        console.log('🚀 Proceeding with reset...');

        try {
            const url = `/api/candidates/${candidateId}/override/${criterion}`;
            console.log(`🌐 Making DELETE request to: ${url}`);
            
            const response = await fetch(url, {
                method: 'DELETE'
            });

            console.log(`📡 Response status: ${response.status}`);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Override reset successfully:', result);
                
                this.showNotification(`✅ ${criterion.charAt(0).toUpperCase() + criterion.slice(1)} score reset to system calculation!`, 'success');
                
                // **COMPREHENSIVE UI REFRESH** with forced reload
                console.log('🔄 Starting comprehensive UI refresh after reset...');
                
                // Add a small delay to ensure database transaction is committed
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Force a complete reload of assessment data (same as modal reopen)
                const jobId = this.getCurrentJobId();
                console.log(`🔄 Force reloading assessment data for candidate ${candidateId}, job ${jobId}`);
                
                try {
                    const freshAssessmentResponse = await fetch(`/api/candidates/${candidateId}/assessment/${jobId}?_t=${Date.now()}`);
                    if (freshAssessmentResponse.ok) {
                        const freshData = await freshAssessmentResponse.json();
                        console.log('📊 Fresh assessment data after reset:', freshData);
                        
                        // Apply the fresh data to comprehensive refresh
                        await this.updateAllAssessmentDisplays(candidateId, freshData);
                        
                        // Also refresh candidates list
                        await this.loadCandidates();
                        
                        console.log('✅ Forced comprehensive refresh completed with fresh data');
                    } else {
                        console.warn('Failed to get fresh assessment data, falling back to normal refresh');
                        await this.recalculateAssessmentScores(candidateId);
                    }
                } catch (error) {
                    console.error('Error in forced refresh, falling back:', error);
                    await this.recalculateAssessmentScores(candidateId);
                }
                
                // Then close any editing interface - the comprehensive refresh will show the updated score
                setTimeout(() => {
                    console.log('🔄 Cleaning up editing interface...');
                    const criterionElement = document.querySelector(`[data-criterion="${criterion}"]`);
                    if (criterionElement) {
                        const editContainer = criterionElement.querySelector(`#edit-${criterion}`);
                        if (editContainer) {
                            // Use the system score from the API response if available
                            const systemScore = result.system_score || originalScore;
                            console.log(`📊 Restoring display with system score: ${systemScore}`);
                            this.restoreCriterionDisplay(candidateId, criterion, systemScore, maxScore, false);
                            console.log(`✅ Restored display for ${criterion} with system score: ${systemScore}`);
                        } else {
                            console.log('ℹ️ No edit container found to clean up');
                        }
                    } else {
                        console.log('⚠️ Criterion element not found');
                    }
                }, 100);
                
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Reset failed:', errorData);
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('💥 Error resetting override:', error);
            this.showNotification(`Failed to reset override: ${error.message}`, 'error');
        }
    },

    // Restore criterion display with updated score and override status
    restoreCriterionDisplay(candidateId, criterion, score, maxScore, isOverride = false, reason = '') {
        const criterionElement = document.querySelector(`[data-criterion="${criterion}"]`);
        if (!criterionElement) return;

        const scoreDisplayContainer = criterionElement.querySelector('.score-display-container');
        const statusElement = criterionElement.querySelector(`#status-${criterion}`);
        const overrideIndicator = criterionElement.querySelector(`#override-${criterion}`);
        
        // Calculate achievement level for the new score
        const percentage = (score / maxScore) * 100;
        const achievementLevel = this.getCriteriaAchievementLevel(percentage);
        
        // Restore score display
        scoreDisplayContainer.innerHTML = `
            <span class="criteria-score badge ${achievementLevel.colorClass}" id="score-${criterion}">${score.toFixed(1)}/${maxScore}</span>
            <button class="btn btn-sm btn-outline-primary ms-2 edit-score-btn" 
                    onclick="CandidatesModule.editCriterionScore('${candidateId}', '${criterion}', ${score}, ${maxScore})"
                    title="Edit ${criterion.charAt(0).toUpperCase() + criterion.slice(1)} score">
                <i class="fas fa-edit"></i>
            </button>
        `;
        
        // Update status and override indicator
        if (isOverride) {
            statusElement.textContent = 'Manual override';
            statusElement.className = 'text-warning fw-bold';
            overrideIndicator.style.display = 'block';
            overrideIndicator.title = `Override reason: ${reason}`;
        } else {
            statusElement.textContent = 'System calculated';
            statusElement.className = 'text-muted';
            overrideIndicator.style.display = 'none';
        }
        
        // Update progress bar
        const progressBar = criterionElement.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.className = `progress-bar ${achievementLevel.progressClass}`;
        }
    },

    // Recalculate assessment scores after override changes
    async recalculateAssessmentScores(candidateId) {
        console.log(`🔄 Recalculating assessment scores for candidate ${candidateId}`);
        
        try {
            // Get current job ID from the modal or use a default approach
            const jobId = this.getCurrentJobId();
            
            const response = await fetch(`/api/candidates/${candidateId}/assessment/${jobId}`);
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Updated assessment data:', data);
                
                // Extract scores from the nested structure
                const assessment = data.assessment;
                const enhancedAssessment = assessment.enhanced_assessment;
                const universityAssessment = assessment.university_assessment;
                
                // Update modal scores display (for elements with data-score-type attributes)
                this.updateModalScoresDisplay(candidateId, {
                    traditional_score: enhancedAssessment.traditional_score || universityAssessment.total_score || 0,
                    semantic_score: enhancedAssessment.semantic_score || 0,
                    overall_score: enhancedAssessment.semantic_score || 0 // Use semantic as primary
                });
                
                // **NEW: Comprehensive UI refresh like potential score updates**
                await this.updateAllAssessmentDisplays(candidateId, data);
                
                // Refresh candidates list to show updated scores in applications section
                await this.loadCandidates();
                
            } else {
                console.warn('Could not recalculate assessment scores');
            }
        } catch (error) {
            console.error('Error recalculating scores:', error);
        }
    },

    // **NEW: Comprehensive UI update method following potential score update pattern**
    async updateAllAssessmentDisplays(candidateId, assessmentData) {
        try {
            console.log('🔄 Updating all assessment displays for comprehensive refresh');
            
            const assessment = assessmentData.assessment;
            const enhancedAssessment = assessment.enhanced_assessment;
            const universityAssessment = assessment.university_assessment;
            
            // Extract detailed scores from university assessment
            const detailedScores = universityAssessment?.detailed_scores || {};
            const breakdown = {
                education: detailedScores.education || 0,
                experience: detailedScores.experience || 0,
                training: detailedScores.training || 0,
                eligibility: detailedScores.eligibility || 0,
                accomplishments: detailedScores.performance || 0,
                potential: assessmentData.assessment.potential_score || 0
            };
            
            const automatedTotal = universityAssessment?.automated_total || 0;
            const overallTotal = universityAssessment?.total_score || 0;
            
            // 1. Update Traditional Assessment scores above progress bars
            this.updateCriteriaScores(breakdown);
            
            // 2. Update Traditional Assessment overview circles  
            this.updateAssessmentOverviewScores(automatedTotal, overallTotal);
            
            // 3. Update Traditional Assessment summary section
            this.updateAssessmentSummaryScores(automatedTotal, breakdown.potential, overallTotal);
            
            // 4. Update Enhanced Assessment scores if available
            if (enhancedAssessment) {
                this.updateEnhancedAssessmentScores(enhancedAssessment);
            }
            
            console.log('✅ All assessment displays updated successfully');
            
        } catch (error) {
            console.error('Error updating all assessment displays:', error);
        }
    },

    // **NEW: Update criteria scores above progress bars**
    updateCriteriaScores(breakdown) {
        try {
            // Update each criteria score display
            const criteriaScores = document.querySelectorAll('.criteria-score');
            criteriaScores.forEach(element => {
                const text = element.textContent;
                if (text.includes('/40')) {
                    element.textContent = `${breakdown.education}/40`;
                } else if (text.includes('/20')) {
                    element.textContent = `${breakdown.experience}/20`;
                } else if (text.includes('/10')) {
                    if (element.closest('.criteria-item').textContent.includes('Training')) {
                        element.textContent = `${breakdown.training}/10`;
                    } else if (element.closest('.criteria-item').textContent.includes('Eligibility')) {
                        element.textContent = `${breakdown.eligibility}/10`;
                    }
                } else if (text.includes('/5')) {
                    element.textContent = `${breakdown.accomplishments}/5`;
                }
            });
            
            // Update progress bar widths
            const progressBars = document.querySelectorAll('.criteria-fill');
            progressBars.forEach(bar => {
                if (bar.classList.contains('education')) {
                    bar.style.width = `${(breakdown.education/40)*100}%`;
                } else if (bar.classList.contains('experience')) {
                    bar.style.width = `${(breakdown.experience/20)*100}%`;
                } else if (bar.classList.contains('training')) {
                    bar.style.width = `${(breakdown.training/10)*100}%`;
                } else if (bar.classList.contains('eligibility')) {
                    bar.style.width = `${(breakdown.eligibility/10)*100}%`;
                } else if (bar.classList.contains('accomplishments')) {
                    bar.style.width = `${(breakdown.accomplishments/5)*100}%`;
                }
            });
            
            console.log('✅ Criteria scores and progress bars updated');
        } catch (error) {
            console.error('Error updating criteria scores:', error);
        }
    },

    // **NEW: Update assessment overview circle scores**
    updateAssessmentOverviewScores(automatedTotal, overallTotal) {
        try {
            const scoreCircles = document.querySelectorAll('.assessment-overview .score-circle-large .score-value');
            scoreCircles.forEach((element, index) => {
                if (index === 0) { // First circle - Automated score
                    element.textContent = automatedTotal;
                } else if (index === 1) { // Second circle - Overall score  
                    element.textContent = overallTotal;
                }
            });
            
            console.log('✅ Assessment overview scores updated');
        } catch (error) {
            console.error('Error updating assessment overview scores:', error);
        }
    },

    // **NEW: Update assessment summary section**
    updateAssessmentSummaryScores(automatedTotal, potentialScore, overallTotal) {
        try {
            const summaryValues = document.querySelectorAll('.assessment-summary .summary-value');
            const percentageScore = (overallTotal / 100) * 100;
            
            summaryValues.forEach(element => {
                const text = element.textContent;
                if (text.includes('/85 points')) {
                    element.textContent = `${automatedTotal}/85 points`;
                } else if (text.includes('/15 points')) {
                    element.textContent = `${potentialScore}/15 points`;
                } else if (text.includes('/100 points')) {
                    element.textContent = `${overallTotal}/100 points`;
                } else if (text.includes('%')) {
                    element.textContent = `${percentageScore.toFixed(1)}%`;
                }
            });
            
            console.log('✅ Assessment summary scores updated');
        } catch (error) {
            console.error('Error updating assessment summary scores:', error);
        }
    },

    // **NEW: Update Enhanced Assessment scores**
    updateEnhancedAssessmentScores(enhancedAssessment) {
        try {
            // Update Enhanced Assessment total score in comparison section
            const enhancedScoreElements = document.querySelectorAll('.enhanced .score-value');
            enhancedScoreElements.forEach(element => {
                if (element.closest('.enhanced')) {
                    element.textContent = enhancedAssessment.total_score || 0;
                }
            });
            
            console.log('✅ Enhanced Assessment scores updated');
        } catch (error) {
            console.error('Error updating Enhanced Assessment scores:', error);
        }
    },

    // Get current job ID (helper method)
    getCurrentJobId() {
        // Try to get from modal data or use a fallback
        const modal = document.getElementById('candidateDetailsModal');
        if (modal && modal.dataset.jobId) {
            return modal.dataset.jobId;
        }
        
        // Fallback: try to get from URL or use default
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('job_id') || '3'; // Default to job ID 3 for now
    },

    // Load existing overrides and update UI indicators
    async loadExistingOverrides(candidateId) {
        console.log(`📋 Loading existing overrides for candidate ${candidateId}`);
        
        try {
            const response = await fetch(`/api/candidates/${candidateId}/overrides`);
            if (response.ok) {
                const data = await response.json();
                console.log('📋 Existing overrides loaded:', data);
                
                // Extract actual overrides from the response
                const overrides = data.overrides || {};
                const validCriteria = ['education', 'experience', 'training', 'eligibility', 'accomplishments'];
                
                // Update UI for each override (only valid criteria)
                Object.keys(overrides).forEach(criterion => {
                    if (validCriteria.includes(criterion)) {
                        const override = overrides[criterion];
                        if (override.override_score !== undefined) {
                            this.updateOverrideUI(criterion, override.override_score, override.reason, true);
                        }
                    }
                });
                
                // Recalculate scores to show updated totals
                await this.recalculateAssessmentScores(candidateId);
                
            } else {
                console.log('No existing overrides found or error loading overrides');
            }
        } catch (error) {
            console.warn('Error loading existing overrides:', error);
        }
    },

    // Update UI to show override status
    updateOverrideUI(criterion, score, reason, isOverride) {
        const criterionElement = document.querySelector(`[data-criterion="${criterion}"]`);
        if (!criterionElement) {
            console.warn(`Criterion element not found: ${criterion}`);
            return;
        }

        const statusElement = criterionElement.querySelector(`#status-${criterion}`);
        const overrideIndicator = criterionElement.querySelector(`#override-${criterion}`);
        const scoreElement = criterionElement.querySelector(`#score-${criterion}`);
        
        if (isOverride) {
            // Update status
            if (statusElement) {
                statusElement.textContent = 'Manual override';
                statusElement.className = 'text-warning fw-bold';
            }
            
            // Show override indicator
            if (overrideIndicator) {
                overrideIndicator.style.display = 'block';
                overrideIndicator.title = `Override reason: ${reason}`;
            }
            
            // Update score display if needed
            if (scoreElement && score !== undefined) {
                const currentScore = scoreElement.textContent.split('/')[0];
                const maxScore = scoreElement.textContent.split('/')[1];
                scoreElement.textContent = `${parseFloat(score).toFixed(1)}/${maxScore}`;
                
                // Calculate percentage and get achievement level
                const percentage = (score / parseFloat(maxScore)) * 100;
                const achievementLevel = this.getCriteriaAchievementLevel(percentage);
                scoreElement.className = `criteria-score badge ${achievementLevel.colorClass}`;
                
                // Update progress bar
                const progressBar = criterionElement.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${percentage}%`;
                    progressBar.className = `progress-bar ${achievementLevel.progressClass}`;
                }
            }
        }
    }
};

// Make globally available
window.CandidatesModule = CandidatesModule;

// Enhanced backward compatibility - ensure proper loading
window.loadCandidatesSection = function() {
    console.log('📞 Global loadCandidatesSection called');
    
    if (typeof CandidatesModule !== 'undefined') {
        // Ensure module is initialized
        if (!CandidatesModule.candidatesContent) {
            console.log('🔄 Initializing CandidatesModule first...');
            CandidatesModule.init();
        }
        
        // Load candidates data
        return CandidatesModule.loadCandidates();
    } else {
        console.error('❌ CandidatesModule not available');
    }
};
