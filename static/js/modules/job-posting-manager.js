/**
 * LSPU Job Posting Management Module
 * Handles creation, editing, and management of university job postings
 */

class JobPostingManager {
    constructor() {
        this.currentJobPostings = [];
        this.positionTypes = [];
        this.currentEditingJobId = null;
        
        this.init();
    }
    
    async init() {
        console.log('🏛️ Initializing LSPU Job Posting Manager...');
        
        await this.loadPositionTypes();
        
        this.setupEventListeners();
        
        const deadlineInput = document.getElementById('applicationDeadline');
        if (deadlineInput) {
            const today = new Date().toISOString().split('T')[0];
            deadlineInput.min = today;
            
            // Set default to 30 days from today
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 30);
            deadlineInput.value = defaultDate.toISOString().split('T')[0];
        }
        
        console.log('✅ Job Posting Manager initialized');
    }
    
    setupEventListeners() {
        // Form validation
        const form = document.getElementById('jobPostingForm');
        if (form) {
            form.addEventListener('input', this.validateForm.bind(this));
        }
        
        // Auto-update job reference number
        const positionTitle = document.getElementById('positionTitle');
        if (positionTitle) {
            positionTitle.addEventListener('input', this.generateJobReference.bind(this));
        }
    }
    
    async loadPositionTypes() {
        try {
            const response = await fetch('/api/position-types');
            const data = await response.json();
            
            if (data.success) {
                this.positionTypes = data.position_types;
            }
        } catch (error) {
            console.error('Error loading position types:', error);
        }
    }
    
    async loadJobPostings() {
        try {
            const response = await fetch('/api/job-postings');
            const data = await response.json();
            
            if (data.success) {
                this.currentJobPostings = data.postings;
                this.renderJobPostingsList();
            }
        } catch (error) {
            console.error('Error loading job postings:', error);
            this.showError('Failed to load job postings');
        }
    }
    
    renderJobPostingsList() {
        const container = document.getElementById('jobPostingsList');
        if (!container) return;
        
        if (this.currentJobPostings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-briefcase fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No university positions found</h5>
                    <p class="text-muted">Create your first position to get started.</p>
                    <button class="btn btn-primary" onclick="showCreateJobModal()">
                        <i class="fas fa-plus me-1"></i>Create Position
                    </button>
                </div>
            `;
            return;
        }
        
        const listHtml = this.currentJobPostings.map(posting => {
            const statusClass = `status-${posting.status}`;
            const statusText = posting.status.charAt(0).toUpperCase() + posting.status.slice(1);
            const deadline = posting.deadline ? new Date(posting.deadline).toLocaleDateString() : 'Not set';
            
            return `
                <div class="position-card card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-briefcase text-primary me-2"></i>
                            <div>
                                <h6 class="mb-0">${posting.title}</h6>
                                <small class="text-muted">${posting.reference_number || 'No reference'}</small>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="position-status ${statusClass}">${statusText}</span>
                            <div class="dropdown">
                                <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" 
                                        data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="viewJobPosting(${posting.id})">
                                        <i class="fas fa-eye me-2"></i>View Details
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="editJobPosting(${posting.id})">
                                        <i class="fas fa-edit me-2"></i>Edit
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="generateJobPosting(${posting.id})">
                                        <i class="fas fa-file-download me-2"></i>Generate Posting
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteJobPosting(${posting.id})">
                                        <i class="fas fa-trash me-2"></i>Delete
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <div class="mb-2">
                                    <strong>Quantity:</strong> ${posting.quantity} position(s)
                                </div>
                                <div class="mb-2">
                                    <strong>Deadline:</strong> ${deadline}
                                </div>
                            </div>
                            <div class="col-md-4 text-md-end">
                                <small class="text-muted">
                                    Created: ${posting.created_at ? new Date(posting.created_at).toLocaleDateString() : 'Unknown'}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = listHtml;
    }
    
    updatePositionCategory() {
        // Try multiple possible IDs for the position type select
        const positionTypeSelect = document.getElementById('positionType') || 
                                  document.getElementById('jobPostingPositionType') ||
                                  document.querySelector('[name="positionType"]') ||
                                  document.querySelector('[name="jobPostingPositionType"]');
        
        if (!positionTypeSelect) {
            console.warn('Position type select element not found');
            return;
        }
        
        const selectedValue = positionTypeSelect.value;
        
        // Update position category based on selection
        const categoryMap = {
            '1': 'TEACHING | PART-TIME',
            '2': 'TEACHING | REGULAR',
            '3': 'NON-TEACHING | PLANTILLA',
            '4': 'NON-TEACHING | JOB ORDER'
        };
        
        // This would be used internally, not displayed to user
        console.log('Position category:', categoryMap[selectedValue] || 'Not selected');
    }
    
    generateJobReference() {
        const titleInput = document.getElementById('positionTitle');
        const referenceInput = document.getElementById('jobReferenceNumber');
        
        if (!titleInput || !referenceInput || referenceInput.value) {
            return; // Don't override existing reference
        }
        
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 900) + 100; // 3-digit number
        const reference = `${year}-LSPU-JOBS-${randomNum}`;
        
        referenceInput.value = reference;
    }
    
    validateForm() {
        const form = document.getElementById('jobPostingForm');
        if (!form) return false;
        
        const requiredFields = [
            'position_type_id', 'position_title', 'quantity_needed', 
            'application_deadline', 'education_requirements'
        ];
        
        let isValid = true;
        
        requiredFields.forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && !field.value.trim()) {
                isValid = false;
                field.classList.add('is-invalid');
            } else if (field) {
                field.classList.remove('is-invalid');
            }
        });
        
        return isValid;
    }
    
    async saveJobPosting(isDraft = false) {
        if (!this.validateForm()) {
            this.showError('Please fill in all required fields');
            return false;
        }
        
        const formData = this.getFormData();
        formData.status = isDraft ? 'draft' : 'published';
        
        try {
            const url = this.currentEditingJobId 
                ? `/api/job-postings/${this.currentEditingJobId}`
                : '/api/job-postings';
            
            const method = this.currentEditingJobId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(isDraft ? 'Position saved as draft' : 'Position published successfully');
                this.closeJobModal();
                await this.loadJobPostings();
                return true;
            } else {
                this.showError(data.error || 'Failed to save position');
                return false;
            }
        } catch (error) {
            console.error('Error saving job posting:', error);
            this.showError('Failed to save position');
            return false;
        }
    }
    
    getFormData() {
        const form = document.getElementById('jobPostingForm');
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Convert numeric fields - handle empty strings properly and convert valid values to numbers
        if (data.quantity_needed && data.quantity_needed.trim() !== '') {
            const parsed = parseInt(data.quantity_needed);
            data.quantity_needed = isNaN(parsed) ? null : parsed;
        } else {
            data.quantity_needed = null;
        }
        
        if (data.salary_grade && data.salary_grade.trim() !== '') {
            const parsed = parseInt(data.salary_grade);
            data.salary_grade = isNaN(parsed) ? null : parsed;
        } else {
            data.salary_grade = null;
        }
        
        if (data.salary_amount && data.salary_amount.trim() !== '') {
            const parsed = parseFloat(data.salary_amount);
            data.salary_amount = isNaN(parsed) ? null : parsed;
        } else {
            data.salary_amount = null;
        }
        
        if (data.position_type_id && data.position_type_id.trim() !== '') {
            const parsed = parseInt(data.position_type_id);
            data.position_type_id = isNaN(parsed) ? null : parsed;
        } else {
            data.position_type_id = null;
        }
        
        return data;
    }
    
    async togglePreview() {
        const previewSection = document.getElementById('previewSection');
        const previewContainer = document.getElementById('jobPostingPreview');
        
        if (previewSection.classList.contains('d-none')) {
            // Show preview
            if (this.validateForm()) {
                const formData = this.getFormData();
                
                // Generate preview HTML
                const previewHtml = this.generatePreviewHtml(formData);
                previewContainer.innerHTML = previewHtml;
                
                previewSection.classList.remove('d-none');
            } else {
                this.showError('Please fill in required fields to generate preview');
            }
        } else {
            // Hide preview
            previewSection.classList.add('d-none');
        }
    }
    
    generatePreviewHtml(data) {
        const positionType = this.positionTypes.find(pt => pt.id == data.position_type_id)?.name || 'Unknown';
        const deadline = data.application_deadline ? new Date(data.application_deadline).toLocaleDateString() : 'Not set';
        
        return `
            <div class="preview-card border rounded p-3">
                <div class="text-center mb-3">
                    <div class="d-inline-block bg-primary text-white px-3 py-2 rounded">
                        <strong>WE ARE HIRING</strong>
                    </div>
                    <div class="mt-2">
                        <span class="badge bg-primary">${positionType.toUpperCase()}</span>
                    </div>
                    <div class="text-primary mt-1">LSPU</div>
                    <h5 class="text-primary mt-2">${data.position_title || 'Position Title'}</h5>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        ${data.employment_period ? `<p><strong>Period:</strong> ${data.employment_period}</p>` : ''}
                        ${data.department_office ? `<p><strong>Department:</strong> ${data.department_office}</p>` : ''}
                        ${data.plantilla_item_no ? `<p><strong>Plantilla Item No:</strong> ${data.plantilla_item_no}</p>` : ''}
                        ${data.salary_grade || data.salary_amount ? `<p><strong>Salary Grade:</strong> ${data.salary_grade || ''} ${data.salary_amount ? '(₱' + data.salary_amount + ')' : ''}</p>` : ''}
                    </div>
                    <div class="col-md-6">
                        ${data.education_requirements ? `<p><strong>Education:</strong> ${data.education_requirements}</p>` : ''}
                        ${data.training_requirements ? `<p><strong>Training:</strong> ${data.training_requirements}</p>` : ''}
                        ${data.experience_requirements ? `<p><strong>Experience:</strong> ${data.experience_requirements}</p>` : ''}
                        ${data.eligibility_requirements ? `<p><strong>Eligibility:</strong> ${data.eligibility_requirements}</p>` : ''}
                    </div>
                </div>
                
                <div class="bg-warning bg-opacity-25 p-3 rounded mt-3">
                    <p><strong>Application Deadline:</strong> ${deadline}</p>
                    <p class="mb-0"><small>Note: This is a preview. The actual job posting will include complete formatting, university branding, and all required elements.</small></p>
                </div>
            </div>
        `;
    }
    
    filterJobPostings() {
        const typeFilter = document.getElementById('positionTypeFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;
        const searchTerm = document.getElementById('jobSearchInput')?.value.toLowerCase();
        
        // This would filter the displayed job postings
        // For now, just reload all postings
        this.renderJobPostingsList();
    }
    
    closeJobModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('jobPostingModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reset form
        document.getElementById('jobPostingForm').reset();
        this.currentEditingJobId = null;
        
        // Hide preview
        const previewSection = document.getElementById('previewSection');
        if (previewSection) {
            previewSection.classList.add('d-none');
        }
    }
    
    populateFormWithJobData(jobData) {
        // Helper function to safely set form field values
        const setFieldValue = (fieldName, value) => {
            const field = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
            if (field && value !== null && value !== undefined) {
                field.value = value;
                // Trigger change event for any dependent scripts
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };
        
        // Clear form first
        document.getElementById('jobPostingForm').reset();
        
        // Populate all form fields with job data
        setFieldValue('jobPostingPositionType', jobData.position_type_id);
        setFieldValue('positionTitle', jobData.position_title);
        setFieldValue('specificRole', jobData.specific_role);
        setFieldValue('quantityNeeded', jobData.quantity_needed);
        setFieldValue('jobReferenceNumber', jobData.job_reference_number);
        setFieldValue('departmentOffice', jobData.department_office);
        setFieldValue('plantillaItemNo', jobData.plantilla_item_no);
        setFieldValue('salaryGrade', jobData.salary_grade);
        setFieldValue('salaryAmount', jobData.salary_amount);
        setFieldValue('employmentPeriod', jobData.employment_period);
        setFieldValue('educationRequirements', jobData.education_requirements);
        setFieldValue('trainingRequirements', jobData.training_requirements);
        setFieldValue('experienceRequirements', jobData.experience_requirements);
        setFieldValue('eligibilityRequirements', jobData.eligibility_requirements);
        setFieldValue('specialRequirements', jobData.special_requirements);
        
        // Handle date field (convert from server format if needed)
        if (jobData.application_deadline) {
            const deadlineField = document.getElementById('applicationDeadline');
            if (deadlineField) {
                // Convert date to YYYY-MM-DD format if needed
                const date = new Date(jobData.application_deadline);
                if (!isNaN(date.getTime())) {
                    deadlineField.value = date.toISOString().split('T')[0];
                }
            }
        }
        
        setFieldValue('applicationInstructions', jobData.application_instructions);
        setFieldValue('requiredDocuments', jobData.required_documents);
        setFieldValue('contactEmail', jobData.contact_email);
        setFieldValue('contactAddress', jobData.contact_address);
        
        // Handle color scheme
        const colorField = document.getElementById('colorScheme');
        if (colorField && jobData.color_scheme) {
            colorField.value = jobData.color_scheme;
        }
        
        setFieldValue('bannerText', jobData.banner_text);
        
        // Set minimum date for deadline to today (for editing)
        const deadlineInput = document.getElementById('applicationDeadline');
        if (deadlineInput) {
            const today = new Date().toISOString().split('T')[0];
            deadlineInput.min = today;
        }
        
        console.log('Form populated with job data for editing:', jobData);
    }
    
    showError(message) {
        console.error('Job Posting Error:', message);
        // You can integrate with your existing notification system
        alert('Error: ' + message);
    }
    
    showSuccess(message) {
        console.log('Job Posting Success:', message);
        // You can integrate with your existing notification system
        alert('Success: ' + message);
    }
}

// Global functions for HTML onclick events
window.jobPostingManager = new JobPostingManager();

window.showCreateJobModal = function() {
    jobPostingManager.currentEditingJobId = null;
    document.getElementById('jobPostingModalLabel').innerHTML = '<i class="fas fa-briefcase me-2"></i>Create University Position';
    
    // Reset form for new job posting
    document.getElementById('jobPostingForm').reset();
    
    // Set minimum date for deadline to today and default date
    const deadlineInput = document.getElementById('applicationDeadline');
    if (deadlineInput) {
        const today = new Date().toISOString().split('T')[0];
        deadlineInput.min = today;
        
        // Set default to 30 days from today
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        deadlineInput.value = defaultDate.toISOString().split('T')[0];
    }
    
    const modal = new bootstrap.Modal(document.getElementById('jobPostingModal'));
    modal.show();
};

window.refreshJobPostings = function() {
    jobPostingManager.loadJobPostings();
};

window.updatePositionCategory = function() {
    jobPostingManager.updatePositionCategory();
};

window.saveJobPostingDraft = function() {
    jobPostingManager.saveJobPosting(true);
};

window.publishJobPosting = function() {
    jobPostingManager.saveJobPosting(false);
};

window.togglePreview = function() {
    jobPostingManager.togglePreview();
};

window.filterJobPostings = function() {
    jobPostingManager.filterJobPostings();
};

window.viewJobPosting = function(jobId) {
    console.log('View job posting:', jobId);
    // Implementation for viewing job posting details
};

window.editJobPosting = async function(jobId) {
    console.log('Edit job posting:', jobId);
    jobPostingManager.currentEditingJobId = jobId;
    
    try {
        // Load job data from server
        const response = await fetch(`/api/job-postings/${jobId}`);
        const data = await response.json();
        
        if (data.success) {
            // Update modal title
            document.getElementById('jobPostingModalLabel').innerHTML = '<i class="fas fa-edit me-2"></i>Edit University Position';
            
            // Populate form with existing data
            jobPostingManager.populateFormWithJobData(data.job_posting);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('jobPostingModal'));
            modal.show();
        } else {
            console.error('Failed to load job posting:', data.error);
            alert('Failed to load job posting data: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading job posting:', error);
        alert('Error loading job posting data. Please try again.');
    }
};

window.generateJobPosting = function(jobId) {
    console.log('Generate job posting:', jobId);
    // Open the generated job posting in a new window
    window.open(`/api/job-postings/${jobId}/render`, '_blank');
};

window.deleteJobPosting = function(jobId) {
    if (confirm('Are you sure you want to delete this job posting?')) {
        console.log('Delete job posting:', jobId);
        // Implementation for deleting job posting
    }
};

window.viewJobApplications = function() {
    console.log('View job applications');
    // Implementation for viewing applications
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load job postings if the section is visible
    const section = document.getElementById('jobPostingManagement');
    if (section && !section.style.display.includes('none')) {
        jobPostingManager.loadJobPostings();
    }
});