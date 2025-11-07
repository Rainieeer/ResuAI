// Settings Module
const SettingsModule = {
    // Initialize settings functionality
    init() {
        this.setupFormHandlers();
        this.setupNotificationHandlers();
        this.setupSecurityHandlers();
        this.loadCurrentSettings();
    },

    // Setup form handlers
    setupFormHandlers() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfileSettings();
            });
        }

        // Reset button
        const resetBtn = profileForm?.querySelector('button[type="button"]');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetProfileForm();
            });
        }
    },

    // Setup notification handlers
    setupNotificationHandlers() {
        const notificationSwitches = document.querySelectorAll('.notification-settings .form-check-input');
        notificationSwitches.forEach(switchEl => {
            switchEl.addEventListener('change', (e) => {
                this.saveNotificationSetting(e.target.id, e.target.checked);
            });
        });
    },

    // Setup security handlers
    setupSecurityHandlers() {
        // Change password
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this.showChangePasswordModal();
            });
        }

        // Manage sessions
        const manageSessionsBtn = document.getElementById('manageSessionsBtn');
        if (manageSessionsBtn) {
            manageSessionsBtn.addEventListener('click', () => {
                this.showSessionsModal();
            });
        }

        // Delete account
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                this.confirmDeleteAccount();
            });
        }

        // Export data
        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportUserData();
            });
        }

        // Clear history
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.confirmClearHistory();
            });
        }
    },

    // Load current settings
    loadCurrentSettings() {
        // Load from storage or API
        const settings = StorageService.app.getSettings();
        if (settings) {
            this.populateSettingsForm(settings);
        }
    },

    // Save profile settings
    async saveProfileSettings() {
        const formData = {
            name: document.getElementById('settingsName')?.value,
            email: document.getElementById('settingsEmail')?.value,
            role: document.getElementById('settingsRole')?.value,
            department: document.getElementById('settingsDepartment')?.value
        };

        try {
            LoadingUtils.show('Saving profile settings...');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Save to storage
            StorageService.app.setUserProfile(formData);
            
            ToastUtils.showSuccess('Profile settings saved successfully');
        } catch (error) {
            console.error('Error saving profile settings:', error);
            ToastUtils.showError('Failed to save profile settings');
        } finally {
            LoadingUtils.hide();
        }
    },

    // Reset profile form
    resetProfileForm() {
        document.getElementById('settingsName').value = 'Mark Johnson';
        document.getElementById('settingsEmail').value = 'mark@company.com';
        document.getElementById('settingsRole').value = 'HR Manager';
        document.getElementById('settingsDepartment').value = 'hr';
        ToastUtils.showInfo('Form reset to default values');
    },

    // Save notification setting
    async saveNotificationSetting(settingId, enabled) {
        try {
            const settings = StorageService.app.getSettings() || {};
            settings.notifications = settings.notifications || {};
            settings.notifications[settingId] = enabled;
            
            StorageService.app.setSettings(settings);
            
            ToastUtils.showSuccess(`Notification setting updated`);
        } catch (error) {
            console.error('Error saving notification setting:', error);
            ToastUtils.showError('Failed to save notification setting');
        }
    },

    // Show change password modal
    showChangePasswordModal() {
        // Placeholder for change password functionality
        ToastUtils.showInfo('Change password functionality coming soon');
    },

    // Show sessions modal
    showSessionsModal() {
        // Placeholder for session management
        ToastUtils.showInfo('Session management coming soon');
    },

    // Confirm delete account
    confirmDeleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (confirm('This will permanently delete all your data. Type "DELETE" to confirm.')) {
                const userInput = prompt('Please type "DELETE" to confirm:');
                if (userInput === 'DELETE') {
                    this.deleteAccount();
                } else {
                    ToastUtils.showInfo('Account deletion cancelled');
                }
            }
        }
    },

    // Delete account
    async deleteAccount() {
        try {
            LoadingUtils.show('Deleting account...');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            ToastUtils.showSuccess('Account deletion initiated. You will be logged out shortly.');
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } catch (error) {
            console.error('Error deleting account:', error);
            ToastUtils.showError('Failed to delete account');
        } finally {
            LoadingUtils.hide();
        }
    },

    // Export user data
    async exportUserData() {
        try {
            LoadingUtils.show('Preparing data export...');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Create mock export data
            const exportData = {
                profile: {
                    name: document.getElementById('settingsName')?.value,
                    email: document.getElementById('settingsEmail')?.value,
                    role: document.getElementById('settingsRole')?.value
                },
                settings: StorageService.app.getSettings(),
                exportDate: new Date().toISOString(),
                version: '2.1.0'
            };
            
            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resumeai-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ToastUtils.showSuccess('Data export completed successfully');
        } catch (error) {
            console.error('Error exporting data:', error);
            ToastUtils.showError('Failed to export data');
        } finally {
            LoadingUtils.hide();
        }
    },

    // Confirm clear history
    confirmClearHistory() {
        if (confirm('Are you sure you want to clear your upload history? This will not delete candidate data.')) {
            this.clearUploadHistory();
        }
    },

    // Clear upload history
    async clearUploadHistory() {
        try {
            LoadingUtils.show('Clearing upload history...');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Clear from storage
            StorageService.app.clearUploadHistory();
            
            ToastUtils.showSuccess('Upload history cleared successfully');
        } catch (error) {
            console.error('Error clearing history:', error);
            ToastUtils.showError('Failed to clear upload history');
        } finally {
            LoadingUtils.hide();
        }
    },

    // Populate settings form
    populateSettingsForm(settings) {
        if (settings.profile) {
            const profile = settings.profile;
            if (profile.name) document.getElementById('settingsName').value = profile.name;
            if (profile.email) document.getElementById('settingsEmail').value = profile.email;
            if (profile.role) document.getElementById('settingsRole').value = profile.role;
            if (profile.department) document.getElementById('settingsDepartment').value = profile.department;
        }

        if (settings.notifications) {
            Object.entries(settings.notifications).forEach(([key, value]) => {
                const element = document.getElementById(key);
                if (element && element.type === 'checkbox') {
                    element.checked = value;
                }
            });
        }

        if (settings.preferences) {
            const prefs = settings.preferences;
            if (prefs.defaultViewMode) document.getElementById('defaultViewMode').value = prefs.defaultViewMode;
            if (prefs.resultsPerPage) document.getElementById('resultsPerPage').value = prefs.resultsPerPage;
            if (prefs.autoRefresh) document.getElementById('autoRefresh').value = prefs.autoRefresh;
            if (prefs.advancedFilters !== undefined) {
                document.getElementById('advancedFilters').checked = prefs.advancedFilters;
            }
        }
    }
};

// Make globally available
window.SettingsModule = SettingsModule;

// Storage service extensions for settings
if (window.StorageService && window.StorageService.app) {
    Object.assign(window.StorageService.app, {
        getSettings() {
            return StorageService.getItem('settings') || {};
        },
        
        setSettings(settings) {
            return StorageService.setItem('settings', settings);
        },
        
        getUserProfile() {
            return StorageService.getItem('userProfile') || {};
        },
        
        setUserProfile(profile) {
            return StorageService.setItem('userProfile', profile);
        },
        
        clearUploadHistory() {
            return StorageService.removeItem('uploadHistory');
        }
    });
}
