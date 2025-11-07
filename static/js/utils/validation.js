// Validation Utilities
const ValidationUtils = {
    // Validate file type
    isValidFileType(file) {
        if (!file || !file.name) return false;
        
        const allowedTypes = CONFIG.UPLOAD.ALLOWED_TYPES;
        const allowedExtensions = CONFIG.UPLOAD.ALLOWED_EXTENSIONS;
        
        const hasValidType = allowedTypes.includes(file.type);
        const hasValidExtension = allowedExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
        );
        
        return hasValidType || hasValidExtension;
    },

    // Validate file size
    isValidFileSize(file) {
        if (!file || typeof file.size !== 'number') return false;
        return file.size <= CONFIG.UPLOAD.MAX_FILE_SIZE;
    },

    // Validate email format
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate required fields
    validateRequiredFields(data, requiredFields) {
        const errors = [];
        
        requiredFields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
                errors.push(`${field} is required`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Validate file for upload
    validateFile(file) {
        const errors = [];
        
        if (!this.isValidFileType(file)) {
            errors.push(`Invalid file type: ${file.name}. Only PDF, DOCX, TXT, and Excel files (.xlsx, .xls) are allowed.`);
        }
        
        if (!this.isValidFileSize(file)) {
            errors.push(`File too large: ${file.name}. Maximum size is ${FormatUtils.formatFileSize(CONFIG.UPLOAD.MAX_FILE_SIZE)}.`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

// Make available globally
window.ValidationUtils = ValidationUtils;
