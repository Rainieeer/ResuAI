/**
 * PDS Candidates Module - Handle display and management of PDS candidates
 * Separate from regular candidates to provide PDS-specific functionality
 */

class PDSCandidatesModule {
    constructor() {
        this.candidates = [];
        this.filteredCandidates = [];
        this.currentSort = { field: 'score', direction: 'desc' };
        this.currentFilter = { status: 'all', eligibility: 'all', education: 'all' };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCandidates();
    }

    bindEvents() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshPdsCandidates');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadCandidates());
        }

        // Export button
        const exportBtn = document.getElementById('exportPdsCandidates');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCandidates());
        }

        // Filter events
        document.addEventListener('change', (e) => {
            if (e.target.matches('#pdsStatusFilter, #pdsEligibilityFilter, #pdsEducationFilter')) {
                this.handleFilterChange();
            }
        });

        // Sort events
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pds-sort-btn')) {
                const field = e.target.dataset.sort;
                this.handleSort(field);
            }
        });

        // Candidate actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.view-pds-candidate')) {
                const candidateId = e.target.dataset.candidateId;
                this.viewCandidate(candidateId);
            } else if (e.target.matches('.update-pds-status')) {
                const candidateId = e.target.dataset.candidateId;
                const status = e.target.dataset.status;
                this.updateCandidateStatus(candidateId, status);
            }
        });
    }

    async loadCandidates() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/pds-candidates');
            const data = await response.json();
            
            if (data.success) {
                this.candidates = this.flattenCandidatesByJob(data.candidates_by_job);
                this.applyFiltersAndSort();
                this.renderCandidates();
                this.updateSummaryStats();
            } else {
                console.error('Failed to load PDS candidates:', data.error);
                ToastModule.show('error', 'Failed to load PDS candidates');
            }
        } catch (error) {
            console.error('Error loading PDS candidates:', error);
            ToastModule.show('error', 'Error loading PDS candidates');
        } finally {
            this.showLoading(false);
        }
    }

    flattenCandidatesByJob(candidatesByJob) {
        const flattened = [];
        
        Object.values(candidatesByJob).forEach(jobData => {
            const jobInfo = jobData.job_info;
            jobData.candidates.forEach(candidate => {
                flattened.push({
                    ...candidate,
                    job_title: jobInfo.title,
                    job_department: jobInfo.department,
                    job_category: jobInfo.category
                });
            });
        });
        
        return flattened;
    }

    applyFiltersAndSort() {
        // Apply filters
        this.filteredCandidates = this.candidates.filter(candidate => {
            // Status filter
            if (this.currentFilter.status !== 'all' && candidate.status !== this.currentFilter.status) {
                return false;
            }
            
            // Eligibility filter
            if (this.currentFilter.eligibility !== 'all') {
                const isEligible = candidate.civil_service_eligible;
                if (this.currentFilter.eligibility === 'eligible' && !isEligible) return false;
                if (this.currentFilter.eligibility === 'not_eligible' && isEligible) return false;
            }
            
            // Education filter
            if (this.currentFilter.education !== 'all' && 
                (!candidate.highest_education || !candidate.highest_education.toLowerCase().includes(this.currentFilter.education))) {
                return false;
            }
            
            return true;
        });

        // Apply sort
        this.filteredCandidates.sort((a, b) => {
            const field = this.currentSort.field;
            const direction = this.currentSort.direction === 'asc' ? 1 : -1;
            
            let aVal = a[field];
            let bVal = b[field];
            
            // Handle different data types
            if (typeof aVal === 'string') {
                return aVal.localeCompare(bVal) * direction;
            } else if (typeof aVal === 'number') {
                return (aVal - bVal) * direction;
            } else if (aVal instanceof Date) {
                return (aVal - bVal) * direction;
            }
            
            return 0;
        });
    }

    renderCandidates() {
        const container = document.getElementById('pdsCandidatesList');
        if (!container) return;

        if (this.filteredCandidates.length === 0) {
            container.innerHTML = `
                <div class="no-candidates">
                    <div class="no-candidates-icon">
                        <i class="fas fa-file-medical"></i>
                    </div>
                    <h4>No PDS candidates found</h4>
                    <p>Upload PDS files to see candidates here</p>
                    <button class="btn btn-success" onclick="NavigationModule.showSection('upload-pds')">
                        <i class="fas fa-file-medical me-2"></i>Upload PDS
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="candidates-table-container">
                <table class="table table-hover pds-candidates-table">
                    <thead>
                        <tr>
                            <th>
                                <button class="pds-sort-btn ${this.getSortClass('name')}" data-sort="name">
                                    Name <i class="fas fa-sort"></i>
                                </button>
                            </th>
                            <th>
                                <button class="pds-sort-btn ${this.getSortClass('score')}" data-sort="score">
                                    Score <i class="fas fa-sort"></i>
                                </button>
                            </th>
                            <th>Education</th>
                            <th>Experience</th>
                            <th>CS Eligible</th>
                            <th>Job Position</th>
                            <th>
                                <button class="pds-sort-btn ${this.getSortClass('upload_timestamp')}" data-sort="upload_timestamp">
                                    Uploaded <i class="fas fa-sort"></i>
                                </button>
                            </th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredCandidates.map(candidate => this.renderCandidateRow(candidate)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderCandidateRow(candidate) {
        return `
            <tr class="candidate-row" data-candidate-id="${candidate.id}">
                <td>
                    <div class="candidate-name-cell">
                        <strong>${candidate.name}</strong>
                        <small class="text-muted d-block">${candidate.email || 'No email'}</small>
                    </div>
                </td>
                <td>
                    <div class="score-cell">
                        <span class="score-badge ${this.getScoreClass(candidate.score)}">${candidate.score}%</span>
                    </div>
                </td>
                <td>
                    <span class="education-level">${candidate.highest_education || 'Not specified'}</span>
                </td>
                <td>
                    <span class="experience-years">${candidate.years_of_experience || 0} years</span>
                </td>
                <td>
                    <span class="eligibility-status">
                        ${candidate.civil_service_eligible ? 
                            '<i class="fas fa-check-circle text-success"></i> Yes' : 
                            '<i class="fas fa-times-circle text-muted"></i> No'
                        }
                    </span>
                </td>
                <td>
                    <div class="job-info">
                        <strong>${candidate.job_title}</strong>
                        <small class="text-muted d-block">${candidate.job_department}</small>
                    </div>
                </td>
                <td>
                    <span class="upload-date">${this.formatDate(candidate.upload_timestamp)}</span>
                </td>
                <td>
                    <span class="status-badge status-${candidate.status}">${this.formatStatus(candidate.status)}</span>
                </td>
                <td>
                    <div class="candidate-actions">
                        <button class="btn btn-sm btn-outline-primary view-pds-candidate" 
                                data-candidate-id="${candidate.id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                    data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><button class="dropdown-item update-pds-status" 
                                           data-candidate-id="${candidate.id}" data-status="shortlisted">
                                    <i class="fas fa-star text-warning me-2"></i>Shortlist
                                </button></li>
                                <li><button class="dropdown-item update-pds-status" 
                                           data-candidate-id="${candidate.id}" data-status="rejected">
                                    <i class="fas fa-times text-danger me-2"></i>Reject
                                </button></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><button class="dropdown-item update-pds-status" 
                                           data-candidate-id="${candidate.id}" data-status="new">
                                    <i class="fas fa-undo text-info me-2"></i>Reset Status
                                </button></li>
                            </ul>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    updateSummaryStats() {
        // Update totals
        const totalElement = document.getElementById('totalPdsCandidates');
        const processedElement = document.getElementById('processedPdsCandidates');
        const eligibleElement = document.getElementById('eligiblePdsCandidates');
        const avgScoreElement = document.getElementById('avgPdsScore');

        if (totalElement) totalElement.textContent = this.candidates.length;
        
        const processed = this.candidates.filter(c => c.status !== 'new').length;
        if (processedElement) processedElement.textContent = processed;
        
        const eligible = this.candidates.filter(c => c.civil_service_eligible).length;
        if (eligibleElement) eligibleElement.textContent = eligible;
        
        const scores = this.candidates.map(c => c.score).filter(s => s > 0);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        if (avgScoreElement) avgScoreElement.textContent = `${avgScore}%`;
    }

    handleFilterChange() {
        const statusFilter = document.getElementById('pdsStatusFilter');
        const eligibilityFilter = document.getElementById('pdsEligibilityFilter');
        const educationFilter = document.getElementById('pdsEducationFilter');

        this.currentFilter = {
            status: statusFilter?.value || 'all',
            eligibility: eligibilityFilter?.value || 'all',
            education: educationFilter?.value || 'all'
        };

        this.applyFiltersAndSort();
        this.renderCandidates();
    }

    handleSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'desc';
        }

        this.applyFiltersAndSort();
        this.renderCandidates();
    }

    async viewCandidate(candidateId) {
        try {
            const response = await fetch(`/api/pds-candidates/${candidateId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showCandidateModal(data.candidate);
            } else {
                ToastModule.show('error', 'Failed to load candidate details');
            }
        } catch (error) {
            console.error('Error loading candidate:', error);
            ToastModule.show('error', 'Error loading candidate details');
        }
    }

    async updateCandidateStatus(candidateId, status) {
        try {
            const response = await fetch(`/api/pds-candidates/${candidateId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            
            const data = await response.json();
            
            if (data.success) {
                ToastModule.show('success', 'Candidate status updated');
                this.loadCandidates(); // Refresh the list
            } else {
                ToastModule.show('error', 'Failed to update candidate status');
            }
        } catch (error) {
            console.error('Error updating candidate:', error);
            ToastModule.show('error', 'Error updating candidate status');
        }
    }

    showCandidateModal(candidate) {
        // Implementation for showing detailed candidate modal
        // This would open a modal with comprehensive PDS information
        console.log('Show PDS candidate modal for:', candidate);
        
        // For now, just show a simple alert with key info
        const info = `
PDS Candidate: ${candidate.name}
Score: ${candidate.score}%
Education: ${candidate.highest_education || 'Not specified'}
Experience: ${candidate.years_of_experience || 0} years
Civil Service Eligible: ${candidate.civil_service_eligible ? 'Yes' : 'No'}
        `;
        
        alert(info);
    }

    async exportCandidates() {
        try {
            // Create CSV content
            const headers = ['Name', 'Email', 'Score', 'Education', 'Experience', 'CS Eligible', 'Job Title', 'Status', 'Upload Date'];
            const csvContent = [
                headers.join(','),
                ...this.filteredCandidates.map(candidate => [
                    `"${candidate.name}"`,
                    `"${candidate.email || ''}"`,
                    candidate.score,
                    `"${candidate.highest_education || ''}"`,
                    candidate.years_of_experience || 0,
                    candidate.civil_service_eligible ? 'Yes' : 'No',
                    `"${candidate.job_title}"`,
                    candidate.status,
                    this.formatDate(candidate.upload_timestamp)
                ].join(','))
            ].join('\n');

            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pds-candidates-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            ToastModule.show('success', 'PDS candidates exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            ToastModule.show('error', 'Failed to export candidates');
        }
    }

    showLoading(show) {
        const container = document.getElementById('pdsCandidatesList');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading PDS candidates...</p>
                </div>
            `;
        }
    }

    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 60) return 'average';
        return 'poor';
    }

    getSortClass(field) {
        if (this.currentSort.field !== field) return '';
        return this.currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc';
    }

    formatStatus(status) {
        const statusMap = {
            'new': 'New',
            'shortlisted': 'Shortlisted',
            'rejected': 'Rejected',
            'interviewed': 'Interviewed',
            'hired': 'Hired'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
}

// Make PDSCandidatesModule globally available
window.PDSCandidatesModule = PDSCandidatesModule;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pdsCandidatesModule = new PDSCandidatesModule();
});

// Make globally available
window.PDSCandidatesModule = PDSCandidatesModule;