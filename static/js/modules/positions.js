// University Positions Module (Maps to Jobs Module with updated terminology)
const PositionsModule = {
    // Map methods to existing JobsModule
    init() {
        return JobsModule.init();
    },

    // Position-specific helper functions with university terminology
    async loadPositionTypes() {
        return JobsModule.loadJobCategories();
    },

    async showAddPositionModal() {
        // Update modal title for positions terminology
        const modalTitle = document.getElementById('jobModalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Add New Position';
        }
        return JobsModule.showAddJobModal();
    },

    async editPosition(positionId) {
        return JobsModule.editJob(positionId);
    },

    async deletePosition(positionId) {
        return JobsModule.deleteJob(positionId);
    },

    async loadPositions() {
        return JobsModule.loadJobs();
    },

    async savePosition() {
        return JobsModule.saveJob();
    },

    // Position selection functions for upload section
    clearPositionSelection() {
        // Clear any selected position data
        const selectedPositionDetails = document.getElementById('selectedPositionDetails');
        const selectedPositionInfo = document.getElementById('selectedPositionInfo');
        
        if (selectedPositionDetails) {
            selectedPositionDetails.style.display = 'none';
        }
        
        if (selectedPositionInfo) {
            selectedPositionInfo.style.display = 'none';
        }

        // Clear any stored position data
        if (typeof UploadModule !== 'undefined' && UploadModule.clearJobSelection) {
            UploadModule.clearJobSelection();
        }
    },

    // University position type creation
    async savePositionType() {
        const nameInput = document.getElementById('positionTypeName');
        const descInput = document.getElementById('positionTypeDescription');

        if (!nameInput || !nameInput.value.trim()) {
            ToastUtils.showError('Position type name is required');
            return;
        }

        try {
            const payload = {
                name: nameInput.value.trim(),
                description: descInput ? descInput.value.trim() : ''
            };

            console.log('Creating new position type:', payload);

            const result = await APIService.jobCategories.create(payload);
            
            if (result.success) {
                ToastUtils.showSuccess('Position type created successfully');
                BootstrapInit.hideModal('positionTypeModal');

                // Refresh position types in all relevant UI elements
                await this.loadPositionTypes();
                await this.loadPositions();

                // Refresh upload section if it exists
                if (typeof loadJobCategoriesForUpload === 'function') {
                    await loadJobCategoriesForUpload();
                }
            } else {
                throw new Error(result.error || 'Failed to create position type');
            }
        } catch (error) {
            console.error('Error creating position type:', error);
            
            let errorMessage = 'Failed to create position type';
            if (error.message.includes('already exists')) {
                errorMessage = 'A position type with this name already exists.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            ToastUtils.showError(errorMessage);
        }
    },

    // Setup position type management
    setupPositionTypeManagement() {
        const addPositionBtn = document.getElementById('addPositionBtn');
        const savePositionTypeBtn = document.getElementById('savePositionTypeBtn');

        if (addPositionBtn) {
            addPositionBtn.addEventListener('click', () => {
                const form = document.getElementById('positionTypeForm');
                if (form) {
                    form.reset();
                }
                BootstrapInit.showModal('positionTypeModal');
            });
        }

        if (savePositionTypeBtn) {
            savePositionTypeBtn.addEventListener('click', async () => {
                await this.savePositionType();
            });
        }
    }
};

// Make globally available
window.PositionsModule = PositionsModule;

// Setup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    PositionsModule.setupPositionTypeManagement();
});