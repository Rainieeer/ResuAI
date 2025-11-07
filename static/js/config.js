// Application Configuration
const CONFIG = {
    // API Endpoints
    API: {
        BASE_URL: '', // Empty string for relative URLs
        UPLOAD: '/api/upload',
        UPLOAD_ENHANCED: '/api/upload-pds-enhanced', // New enhanced PDS upload
        START_ANALYSIS: '/api/start-analysis', // New analysis endpoint
        JOBS: '/api/job-postings', // Changed from legacy /api/jobs to LSPU system
        CANDIDATES: '/api/candidates', // Phase 2: Updated to use LSPU-only candidates endpoint
        CANDIDATES_LEGACY: '/api/candidates-legacy', // Legacy endpoint no longer used
        ANALYTICS: '/api/analytics',
        SETTINGS: '/api/settings'
    },
    
    // File upload settings
    UPLOAD: {
        MAX_FILE_SIZE: 16 * 1024 * 1024, // 16MB
        ALLOWED_TYPES: [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
            'text/plain',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ],
        ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.txt', '.xlsx', '.xls']
    },
    
    // UI Settings
    UI: {
        TOAST_DURATION: 5000,
        ANIMATION_DURATION: 300
    }
};

// Make config globally available
window.CONFIG = CONFIG;
