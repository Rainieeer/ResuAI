// API Service for handling all HTTP requests
const APIService = {
    // Generic fetch wrapper with error handling
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        // Remove Content-Type for FormData
        if (options.body instanceof FormData) {
            delete defaultOptions.headers['Content-Type'];
        }

        try {
            const response = await fetch(url, defaultOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API request failed for ${url}:`, error);
            throw error;
        }
    },

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    // POST request
    async post(endpoint, data) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return this.request(endpoint, {
            method: 'POST',
            body
        });
    },

    // PUT request
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Upload files
    async uploadFiles(files, jobId) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files[]', file);
        });
        formData.append('jobId', jobId);

        return this.post(CONFIG.API.UPLOAD, formData);
    },

    // Upload Personal Data Sheets
    async uploadPDS(files, jobId) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files[]', file);
        });
        formData.append('jobId', jobId);

        return this.post('/api/upload-pds', formData);
    },

    // Job-related API calls
    jobs: {
        async getAll() {
            return APIService.get(CONFIG.API.JOBS);
        },

        async getById(id) {
            return APIService.get(`${CONFIG.API.JOBS}/${id}`);
        },

        async create(jobData) {
            return APIService.post(CONFIG.API.JOBS, jobData);
        },

        async update(id, jobData) {
            return APIService.put(`${CONFIG.API.JOBS}/${id}`, jobData);
        },

        async delete(id) {
            return APIService.delete(`${CONFIG.API.JOBS}/${id}`);
        }
    },

    // Job categories API calls
    jobCategories: {
        async getAll() {
            return APIService.get('/api/job-categories');
        },

        async create(categoryData) {
            return APIService.post('/api/job-categories', categoryData);
        }
    },

    // Candidates API calls
    candidates: {
        async getAll() {
            // Use LSPU-only candidates endpoint
            return await APIService.get(CONFIG.API.CANDIDATES);
        },

        async getById(id) {
            return APIService.get(`${CONFIG.API.CANDIDATES}/${id}`);
        },

        async updateStatus(id, status) {
            return APIService.put(`${CONFIG.API.CANDIDATES}/${id}`, { status });
        },

        async delete(id) {
            return APIService.delete(`${CONFIG.API.CANDIDATES}/${id}`);
        },

        // Hybrid Assessment API calls
        async getHybridAssessment(candidateId, jobId) {
            return APIService.get(`/api/candidates/${candidateId}/assessment/${jobId}`);
        },

        async getAssessmentComparison(candidateId) {
            return APIService.get(`/api/candidates/${candidateId}/assessment/comparison`);
        },

        async getSemanticAnalysis(candidateId, jobId) {
            return APIService.get(`/api/candidates/${candidateId}/semantic-analysis/${jobId}`);
        },

        async bulkAssess(jobId, candidateIds = []) {
            return APIService.post(`/api/job-postings/${jobId}/bulk-assess`, {
                candidate_ids: candidateIds
            });
        }
    },

    // Analytics API calls
    analytics: {
        async getData(days = 30) {
            return APIService.get(`${CONFIG.API.ANALYTICS}?days=${days}`);
        }
    }
};

// Make available globally
window.APIService = APIService;
