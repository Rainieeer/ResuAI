/**
 * Clean Upload Module - Simple and Reliable File Upload
 * Focuses on Excel files (.xlsx, .xls) with straightforward functionality
 */

const UploadModule = {
    // State management
    state: {
        selectedJobId: null,
        uploadedFiles: [],
        sessionId: null,
        isUploading: false,
        isAnalyzing: false,
        isInitialized: false,
        
        // Timer state
        analysisStartTime: null,
        progressTimer: null,
        progressAnimationId: null
    },

    /**
     * Initialize the upload module
     */
    init() {
        console.log('🚀 Initializing Clean Upload Module');
        
        // Prevent duplicate initialization
        if (this.state.isInitialized) {
            console.log('⚠️ Upload module already initialized, skipping...');
            return;
        }
        
        this.setupEventListeners();
        this.loadJobPostings();
        
        // Mark as initialized
        this.state.isInitialized = true;
        console.log('✅ Clean Upload Module initialized successfully');
        
        // Add debugging support for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.uploadDebug = {
                module: this,
                state: this.state,
                reloadJobs: () => this.loadJobPostings(),
                checkElements: () => this.debugCheckElements(),
                getState: () => this.state
            };
            console.log('📋 Upload debug tools available at window.uploadDebug');
        }
    },

    /**
     * Debug helper to check element availability
     */
    debugCheckElements() {
        const elements = {
            positionTypesUpload: document.getElementById('positionTypesUpload'),
            regularUploadZone: document.getElementById('regularUploadZone'),
            bulkUploadZone: document.getElementById('bulkUploadZone'),
            regularFileUpload: document.getElementById('regularFileUpload'),
            bulkFileUpload: document.getElementById('bulkFileUpload'),
            uploadInstructions: document.getElementById('uploadInstructions'),
            selectedPositionInfo: document.getElementById('selectedPositionInfo')
        };
        
        console.log('📍 Element availability check:');
        Object.keys(elements).forEach(key => {
            const element = elements[key];
            console.log(`  ${key}: ${element ? '✅ Found' : '❌ Missing'}`);
        });
        
        return elements;
    },

    /**
     * Setup event listeners for upload zones and file inputs
     */
    setupEventListeners() {
        // Get upload zones
        const regularUploadZone = document.getElementById('regularUploadZone');
        const bulkUploadZone = document.getElementById('bulkUploadZone');
        
        // Get file inputs
        const regularFileInput = document.getElementById('regularFileUpload');
        const bulkFileInput = document.getElementById('bulkFileUpload');

        // Regular upload zone
        if (regularUploadZone) {
            regularUploadZone.addEventListener('click', () => {
                console.log('📁 Regular upload zone clicked');
                this.openFileDialog('regular');
            });

            regularUploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                regularUploadZone.classList.add('drag-over');
            });

            regularUploadZone.addEventListener('dragleave', () => {
                regularUploadZone.classList.remove('drag-over');
            });

            regularUploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                regularUploadZone.classList.remove('drag-over');
                this.handleFileSelection(e.dataTransfer.files, 'regular');
            });
        }

        // Bulk upload zone  
        if (bulkUploadZone) {
            bulkUploadZone.addEventListener('click', () => {
                console.log('📁 Bulk upload zone clicked');
                this.openFileDialog('bulk');
            });

            bulkUploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                bulkUploadZone.classList.add('drag-over');
            });

            bulkUploadZone.addEventListener('dragleave', () => {
                bulkUploadZone.classList.remove('drag-over');
            });

            bulkUploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                bulkUploadZone.classList.remove('drag-over');
                this.handleFileSelection(e.dataTransfer.files, 'bulk');
            });
        }

        // File input change events
        if (regularFileInput) {
            regularFileInput.addEventListener('change', (e) => {
                console.log('📄 Regular file input changed');
                this.handleFileSelection(e.target.files, 'regular');
            });
        }

        if (bulkFileInput) {
            bulkFileInput.addEventListener('change', (e) => {
                console.log('📄 Bulk file input changed');
                this.handleFileSelection(e.target.files, 'bulk');
            });
        }

        // Start analysis button
        const startAnalysisBtn = document.getElementById('startAnalysisBtn');
        if (startAnalysisBtn) {
            startAnalysisBtn.addEventListener('click', () => {
                this.startAnalysis();
            });
        }

        console.log('✅ Event listeners setup complete');
    },

    /**
     * Open file dialog for upload type
     */
    openFileDialog(type) {
        const fileInputId = type === 'regular' ? 'regularFileUpload' : 'bulkFileUpload';
        const fileInput = document.getElementById(fileInputId);
        
        console.log(`📂 Opening file dialog for ${type} (${fileInputId})`);
        
        if (fileInput) {
            console.log('✅ File input found, triggering click');
            fileInput.click();
        } else {
            console.error(`❌ File input not found: ${fileInputId}`);
            this.showError(`File input not available. Please refresh the page.`);
        }
    },

    /**
     * Handle file selection from input or drop
     */
    handleFileSelection(files, type) {
        console.log(`📁 Handling file selection: ${files.length} files for ${type}`);
        
        if (files.length === 0) {
            console.log('📭 No files selected');
            return;
        }

        if (!this.state.selectedJobId) {
            this.showError('Please select a job position first');
            return;
        }

        // Validate and filter files
        const validFiles = Array.from(files).filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showError('No valid files selected. Only Excel files (.xlsx, .xls) are supported.');
            return;
        }

        console.log(`✅ ${validFiles.length} valid files selected`);
        this.uploadFiles(validFiles);
    },

    /**
     * Validate individual file
     */
    validateFile(file) {
        const validExtensions = ['.xlsx', '.xls'];
        const maxSize = 16 * 1024 * 1024; // 16MB
        
        const fileName = file.name.toLowerCase();
        const isValidType = validExtensions.some(ext => fileName.endsWith(ext));
        const isValidSize = file.size <= maxSize;
        
        if (!isValidType) {
            console.warn(`❌ Invalid file type: ${file.name}`);
            return false;
        }
        
        if (!isValidSize) {
            console.warn(`❌ File too large: ${file.name} (${(file.size / (1024*1024)).toFixed(2)}MB)`);
            return false;
        }
        
        console.log(`✅ Valid file: ${file.name}`);
        return true;
    },

    /**
     * Upload files to server
     */
    async uploadFiles(files) {
        if (this.state.isUploading) {
            console.log('Upload already in progress');
            return;
        }

        this.state.isUploading = true;
        console.log('Starting upload of ' + files.length + ' files');
        console.log('Using job ID: ' + this.state.selectedJobId + ' (type: ' + typeof this.state.selectedJobId + ')');

        // Show loading indicator
        this.showLoadingState('upload', 'Uploading files...');

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files[]', file);
            });
            formData.append('jobId', this.state.selectedJobId);
            console.log('FormData jobId: ' + formData.get('jobId'));

            const response = await fetch('/api/upload-files', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('Upload successful:', result);
                this.state.sessionId = result.session_id;
                this.state.uploadedFiles = result.files;
                this.displayUploadedFiles(result.files);
                this.showAnalysisControls();
                this.showMessage('Successfully uploaded ' + result.file_count + ' files', 'success');
                this.hideLoadingState('upload');
            } else {
                console.error('Upload failed:', result.error);
                this.showError(result.error || 'Upload failed');
                this.hideLoadingState('upload');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Upload failed. Please try again.');
            this.hideLoadingState('upload');
        } finally {
            this.state.isUploading = false;
        }
    },

    /**
     * Display uploaded files in enhanced preview container
     */
    displayUploadedFiles(files) {
        const container = document.getElementById('uploadPreviewContainer');
        if (!container) return;

        if (!files || files.length === 0) {
            container.style.display = 'none';
            return;
        }

        // Create enhanced preview with header and clear functionality
        container.innerHTML = `
            <div class="upload-preview-header">
                <div class="preview-title">
                    <i class="fas fa-file-excel text-success me-2"></i>
                    <span>Uploaded Files (${files.length})</span>
                </div>
                <div class="preview-actions">
                    <button class="btn btn-sm btn-outline-secondary" onclick="UploadModule.clearUploadedFiles()" title="Clear all files">
                        <i class="fas fa-trash-alt me-1"></i>Clear All
                    </button>
                </div>
            </div>
            <div class="upload-preview-body">
                ${files.map((file, index) => `
                    <div class="uploaded-file-item" data-file-index="${index}">
                        <div class="file-icon-container">
                            <div class="file-icon excel">
                                <i class="${file.icon || 'fas fa-file-excel'}"></i>
                            </div>
                        </div>
                        <div class="file-info-container">
                            <div class="file-main-info">
                                <div class="file-name" title="${file.name}">${file.name}</div>
                                <div class="file-status">
                                    <span class="status-badge ${file.status === 'ready' ? 'success' : file.status === 'processing' ? 'processing' : 'info'}">
                                        <i class="fas ${file.status === 'ready' ? 'fa-check-circle' : file.status === 'processing' ? 'fa-spinner' : 'fa-clock'}"></i>
                                        ${file.status === 'ready' ? 'Ready' : file.status === 'processing' ? 'Processing' : file.status}
                                    </span>
                                </div>
                            </div>
                            <div class="file-details">
                                <span class="file-type">
                                    <i class="fas fa-tag me-1"></i>${file.description || 'Excel Spreadsheet'}
                                </span>
                                ${file.size ? `
                                    <span class="file-size">
                                        <i class="fas fa-weight me-1"></i>${this.formatFileSize(file.size)}
                                    </span>
                                ` : ''}
                                <span class="upload-time">
                                    <i class="fas fa-clock me-1"></i>${this.formatUploadTime(file.uploaded_at)}
                                </span>
                            </div>
                        </div>
                        <div class="file-actions">
                            <button class="btn btn-sm btn-outline-danger" onclick="UploadModule.removeUploadedFile(${index})" title="Remove this file">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.style.display = 'block';
    },

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Format upload time for display
     */
    formatUploadTime(timestamp) {
        if (!timestamp) return 'Just now';
        
        try {
            const uploadTime = new Date(timestamp);
            const now = new Date();
            const diffMs = now - uploadTime;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            
            return uploadTime.toLocaleDateString();
        } catch (e) {
            return 'Just now';
        }
    },

    /**
     * Clear all uploaded files
     */
    clearUploadedFiles() {
        console.log('🗑️ Clearing all uploaded files');
        
        // Reset state
        this.state.uploadedFiles = [];
        this.state.sessionId = null;
        
        // Hide preview container
        const container = document.getElementById('uploadPreviewContainer');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
        
        // Hide analysis controls
        const analysisControls = document.getElementById('analysisControls');
        if (analysisControls) {
            analysisControls.style.display = 'none';
        }
        
        // Hide analysis results
        const analysisResults = document.getElementById('analysisResults');
        if (analysisResults) {
            analysisResults.style.display = 'none';
        }
        
        // Reset upload state flags
        this.state.isUploading = false;
        this.state.isAnalyzing = false;
        
        this.showMessage('All files cleared successfully', 'info');
    },

    /**
     * Remove a single uploaded file
     */
    removeUploadedFile(index) {
        console.log(`🗑️ Removing file at index: ${index}`);
        
        if (index >= 0 && index < this.state.uploadedFiles.length) {
            const removedFile = this.state.uploadedFiles[index];
            this.state.uploadedFiles.splice(index, 1);
            
            console.log(`✅ Removed file: ${removedFile.name}`);
            
            // Update display
            if (this.state.uploadedFiles.length === 0) {
                this.clearUploadedFiles();
            } else {
                this.displayUploadedFiles(this.state.uploadedFiles);
            }
            
            this.showMessage(`File "${removedFile.name}" removed`, 'info');
        }
    },

    /**
     * Show loading state on analysis button
     */
    showAnalysisLoading() {
        const button = document.getElementById('startAnalysisBtn');
        if (button) {
            button.classList.add('loading');
            button.disabled = true;
        }
    },

    /**
     * Hide loading state on analysis button
     */
    hideAnalysisLoading() {
        const button = document.getElementById('startAnalysisBtn');
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
        }
    },

    /**
     * Show analysis progress bar
     */
    showAnalysisProgress() {
        const progressContainer = document.getElementById('analysisProgress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        // Initialize progress
        this.updateAnalysisProgress(0, 'Initializing...', '0:00');
        
        // Start the timer
        this.startAnalysisTimer();
    },

    /**
     * Hide analysis progress bar
     */
    hideAnalysisProgress() {
        const progressContainer = document.getElementById('analysisProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // Stop timer and animation
        this.stopAnalysisTimer();
    },

    /**
     * Start analysis timer
     */
    startAnalysisTimer() {
        this.state.analysisStartTime = Date.now();
        
        // Update timer display every second
        this.state.progressTimer = setInterval(() => {
            if (this.state.analysisStartTime) {
                const elapsed = Date.now() - this.state.analysisStartTime;
                const timeFormatted = this.formatElapsedTime(elapsed);
                
                // Update time display without changing progress or status
                const progressTime = document.getElementById('progressTime');
                if (progressTime) {
                    progressTime.textContent = timeFormatted;
                }
            }
        }, 1000);
    },

    /**
     * Stop analysis timer
     */
    stopAnalysisTimer() {
        if (this.state.progressTimer) {
            clearInterval(this.state.progressTimer);
            this.state.progressTimer = null;
        }
        
        if (this.state.progressAnimationId) {
            cancelAnimationFrame(this.state.progressAnimationId);
            this.state.progressAnimationId = null;
        }
    },

    /**
     * Format elapsed time as MM:SS
     */
    formatElapsedTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    /**
     * Update analysis progress with smooth animation
     */
    updateAnalysisProgress(targetPercent, status, timeOverride = null) {
        const progressFill = document.getElementById('progressFill');
        const progressStatus = document.getElementById('progressStatus');
        const progressPercent = document.getElementById('progressPercent');
        const progressTime = document.getElementById('progressTime');

        // Update status immediately
        if (progressStatus) {
            progressStatus.textContent = status;
        }
        
        // Update time
        if (progressTime) {
            if (timeOverride) {
                progressTime.textContent = timeOverride;
            } else if (this.state.analysisStartTime) {
                const elapsed = Date.now() - this.state.analysisStartTime;
                progressTime.textContent = this.formatElapsedTime(elapsed);
            }
        }
        
        // Animate progress bar
        if (progressFill && progressPercent) {
            const currentPercent = parseInt(progressFill.style.width) || 0;
            const increment = (targetPercent - currentPercent) / 30; // Smooth animation over 30 frames
            
            let animationPercent = currentPercent;
            
            const animate = () => {
                animationPercent += increment;
                
                if ((increment > 0 && animationPercent >= targetPercent) || 
                    (increment < 0 && animationPercent <= targetPercent)) {
                    animationPercent = targetPercent;
                }
                
                progressFill.style.width = `${animationPercent}%`;
                progressPercent.textContent = `${Math.round(animationPercent)}%`;
                
                // Add pulsing effect when processing
                if (animationPercent < 100 && animationPercent > 0) {
                    progressFill.style.animation = 'progressPulse 2s ease-in-out infinite';
                } else {
                    progressFill.style.animation = 'none';
                }
                
                if (animationPercent !== targetPercent) {
                    this.state.progressAnimationId = requestAnimationFrame(animate);
                }
            };
            
            // Cancel any existing animation
            if (this.state.progressAnimationId) {
                cancelAnimationFrame(this.state.progressAnimationId);
            }
            
            this.state.progressAnimationId = requestAnimationFrame(animate);
        }
    },

    /**
     * Show analysis controls with file count
     */
    showAnalysisControls() {
        const controls = document.getElementById('analysisControls');
        if (controls) {
            controls.style.display = 'block';
            
            // Update file count in analysis section
            const fileCountElement = document.getElementById('analysisFileCount');
            if (fileCountElement) {
                fileCountElement.textContent = this.state.uploadedFiles.length;
            }
        }
    },

    /**
     * Start analysis of uploaded files with enhanced progress tracking
     */
    async startAnalysis() {
        if (!this.state.sessionId) {
            this.showError('No files to analyze');
            return;
        }

        if (this.state.isAnalyzing) {
            console.log('Analysis already in progress');
            return;
        }

        this.state.isAnalyzing = true;
        console.log('🔬 Starting enhanced analysis...');
        
        // Show loading state on button
        this.showAnalysisLoading();
        
        // Show progress bar with timer
        this.showAnalysisProgress();
        
        this.showMessage('Starting AI analysis...', 'info');

        try {
            // Start with initialization
            this.updateAnalysisProgress(5, 'Initializing AI analysis...');
            await this.delay(500);
            
            this.updateAnalysisProgress(10, 'Preparing analysis pipeline...');
            await this.delay(300);
            
            this.updateAnalysisProgress(15, 'Connecting to analysis server...');
            
            const response = await fetch('/api/start-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.state.sessionId
                })
            });

            // Progress through processing stages
            this.updateAnalysisProgress(25, 'Processing uploaded documents...');
            await this.delay(400);
            
            this.updateAnalysisProgress(40, 'Extracting candidate information...');
            await this.delay(500);
            
            this.updateAnalysisProgress(55, 'Running AI assessment algorithms...');
            await this.delay(600);
            
            this.updateAnalysisProgress(70, 'Calculating compatibility scores...');
            await this.delay(400);
            
            this.updateAnalysisProgress(85, 'Ranking candidates...');
            await this.delay(300);
            
            const result = await response.json();
            
            if (result.success) {
                this.updateAnalysisProgress(95, 'Finalizing results...');
                await this.delay(200);
                
                this.updateAnalysisProgress(100, 'Analysis complete!');
                
                // Show final time and completion
                setTimeout(() => {
                    // Get final elapsed time for display
                    const finalElapsedTime = this.state.analysisStartTime ? 
                        this.formatElapsedTime(Date.now() - this.state.analysisStartTime) : '0:00';
                    
                    this.hideAnalysisLoading();
                    this.hideAnalysisProgress();
                    this.showMessage(`Analysis completed in ${finalElapsedTime}: ${result.successful_analyses} candidates processed`, 'success');
                    this.displayAnalysisResults(result.results);
                }, 800);
                
                console.log('✅ Enhanced analysis completed:', result);
            } else {
                throw new Error(result.error || 'Analysis failed');
            }

        } catch (error) {
            console.error('❌ Analysis error:', error);
            this.showError(`Analysis failed: ${error.message}`);
            this.hideAnalysisLoading();
            this.hideAnalysisProgress();
        } finally {
            this.state.isAnalyzing = false;
        }
    },

    /**
     * Display enhanced analysis results
     */
    displayAnalysisResults(results, isDemo = false) {
        const container = document.getElementById('analysisResults');
        if (!container) return;

        // Handle cases where results might be undefined or empty
        const safeResults = results || [];
        const resultCount = safeResults.length;
        
        // Calculate analytics
        const analytics = this.calculateResultsAnalytics(safeResults);

        const html = `
            <div class="analysis-results-container">
                ${isDemo ? `
                <div class="demo-warning">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Demo Preview:</strong> This is a demonstration using sample data. Real analysis results will show actual candidate information.
                    </div>
                </div>
                ` : ''}
                
                <div class="results-header">
                    <div class="completion-indicator">
                        <div class="completion-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="completion-content">
                            <h3>${isDemo ? 'Demo Preview Complete!' : 'Analysis Complete!'}</h3>
                            <p class="completion-subtitle">
                                ${isDemo ? 'Preview of enhanced analysis results interface' : 'AI assessment has been completed for all uploaded files'}
                            </p>
                        </div>
                    </div>
                    <div class="completion-timestamp">
                        <i class="fas fa-clock"></i>
                        <span>${new Date().toLocaleString()}</span>
                    </div>
                </div>

                <div class="results-analytics">
                    <div class="analytics-grid">
                        <div class="analytics-card total">
                            <div class="analytics-icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="analytics-content">
                                <h4>${resultCount}</h4>
                                <p>Candidates Processed</p>
                            </div>
                        </div>
                        <div class="analytics-card average">
                            <div class="analytics-icon">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="analytics-content">
                                <h4>${analytics.averageScore}%</h4>
                                <p>Average Score</p>
                            </div>
                        </div>
                        <div class="analytics-card qualified">
                            <div class="analytics-icon">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="analytics-content">
                                <h4>${analytics.qualifiedCount}</h4>
                                <p>Highly Qualified</p>
                                <small>(Score ≥ 80%)</small>
                            </div>
                        </div>
                        <div class="analytics-card processing">
                            <div class="analytics-icon">
                                <i class="fas fa-stopwatch"></i>
                            </div>
                            <div class="analytics-content">
                                <h4>${analytics.processingTime}s</h4>
                                <p>Processing Time</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="results-distribution">
                    <h4><i class="fas fa-chart-pie me-2"></i>Score Distribution</h4>
                    <div class="score-ranges">
                        <div class="range-item excellent">
                            <div class="range-bar">
                                <div class="range-fill" style="width: ${(analytics.excellent / resultCount * 100)}%"></div>
                            </div>
                            <div class="range-label">
                                <span class="range-text">Excellent (90-100%)</span>
                                <span class="range-count">${analytics.excellent}</span>
                            </div>
                        </div>
                        <div class="range-item good">
                            <div class="range-bar">
                                <div class="range-fill" style="width: ${(analytics.good / resultCount * 100)}%"></div>
                            </div>
                            <div class="range-label">
                                <span class="range-text">Good (80-89%)</span>
                                <span class="range-count">${analytics.good}</span>
                            </div>
                        </div>
                        <div class="range-item average">
                            <div class="range-bar">
                                <div class="range-fill" style="width: ${(analytics.average / resultCount * 100)}%"></div>
                            </div>
                            <div class="range-label">
                                <span class="range-text">Average (60-79%)</span>
                                <span class="range-count">${analytics.average}</span>
                            </div>
                        </div>
                        <div class="range-item below">
                            <div class="range-bar">
                                <div class="range-fill" style="width: ${(analytics.below / resultCount * 100)}%"></div>
                            </div>
                            <div class="range-label">
                                <span class="range-text">Below Average (<60%)</span>
                                <span class="range-count">${analytics.below}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${resultCount > 0 ? `
                <div class="top-candidates">
                    <h4><i class="fas fa-trophy me-2"></i>Top Candidates ${isDemo ? '(Sample Data)' : ''}</h4>
                    <div class="candidates-preview">
                        ${safeResults
                            .sort((a, b) => (b.semantic_score || b.matchScore || 0) - (a.semantic_score || a.matchScore || 0))
                            .slice(0, 5)
                            .map((result, index) => this.renderCandidatePreview(result, index + 1))
                            .join('')}
                    </div>
                </div>
                ` : ''}

                <div class="results-actions">
                    <div class="action-buttons">
                        ${!isDemo ? `
                        <button class="btn btn-outline-primary" onclick="UploadModule.exportResults()">
                            <i class="fas fa-download me-2"></i>Export Results
                        </button>
                        <button class="btn btn-outline-secondary" onclick="UploadModule.startNewAnalysis()">
                            <i class="fas fa-plus me-2"></i>Analyze More Files
                        </button>
                        <button class="btn btn-primary btn-lg" onclick="UploadModule.redirectToCandidates()">
                            <i class="fas fa-users me-2"></i>View All Candidates
                        </button>
                        ` : `
                        <button class="btn btn-outline-secondary" onclick="UploadModule.closeDemoPreview()">
                            <i class="fas fa-times me-2"></i>Close Preview
                        </button>
                        <button class="btn btn-primary" onclick="UploadModule.startNewAnalysis()">
                            <i class="fas fa-upload me-2"></i>Upload Real Files
                        </button>
                        `}
                    </div>
                </div>

                ${resultCount === 0 ? `
                <div class="no-results">
                    <div class="no-results-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h4>No Candidates Processed</h4>
                    <p>The analysis completed but no candidates were successfully processed. This might be due to:</p>
                    <ul>
                        <li>Invalid file format or structure</li>
                        <li>Missing required data fields</li>
                        <li>File corruption or access issues</li>
                    </ul>
                    <button class="btn btn-primary" onclick="UploadModule.startNewAnalysis()">
                        <i class="fas fa-redo me-2"></i>Try Again
                    </button>
                </div>
                ` : ''}
            </div>
        `;

        container.innerHTML = html;
        container.style.display = 'block';
        
        // Animate the results appearance
        setTimeout(() => {
            container.classList.add('animate-fade-in-up');
        }, 100);
        
        // Only auto-redirect for real analysis results, not demo
        if (resultCount > 0 && !isDemo) {
            setTimeout(() => {
                this.showRedirectCountdown();
            }, 5000);
        }
    },

    /**
     * Calculate analytics from results
     */
    calculateResultsAnalytics(results) {
        if (!results || results.length === 0) {
            return {
                averageScore: 0,
                qualifiedCount: 0,
                processingTime: 0,
                excellent: 0,
                good: 0,
                average: 0,
                below: 0
            };
        }

        // Use semantic scores for analytics (semantic is the final ranking score)
        const scores = results.map(r => r.semantic_score || r.matchScore || 0);
        const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        const qualifiedCount = scores.filter(score => score >= 80).length;
        
        // Use actual processing time from the analysis timer
        let processingTime = 0;
        if (this.state.analysisStartTime) {
            // Calculate actual elapsed time in seconds
            const elapsedMs = Date.now() - this.state.analysisStartTime;
            processingTime = Math.round(elapsedMs / 1000 * 10) / 10; // Round to 1 decimal place
        } else if (results.length > 0 && results[0].processing_time !== undefined) {
            // Fallback: Sum up individual processing times from results
            processingTime = results.reduce((sum, r) => sum + (r.processing_time || 0), 0);
            processingTime = Math.round(processingTime * 10) / 10; // Round to 1 decimal place
        } else {
            // Last resort: estimate based on file count
            processingTime = Math.round((results.length * 0.8 + Math.random() * 2) * 10) / 10;
        }

        // Score distribution based on semantic scores
        const excellent = scores.filter(score => score >= 90).length;
        const good = scores.filter(score => score >= 80 && score < 90).length;
        const average = scores.filter(score => score >= 60 && score < 80).length;
        const below = scores.filter(score => score < 60).length;

        return {
            averageScore,
            qualifiedCount,
            processingTime,
            excellent,
            good,
            average,
            below
        };
    },

    /**
     * Render candidate preview card
     */
    renderCandidatePreview(candidate, rank) {
        // Use semantic score for ranking (final score)
        const semanticScore = candidate.semantic_score || candidate.matchScore || 0;
        const traditionalScore = candidate.traditional_score || candidate.matchScore || 0;
        
        const scoreClass = semanticScore >= 90 ? 'excellent' : 
                          semanticScore >= 80 ? 'good' : 
                          semanticScore >= 60 ? 'average' : 'below';

        return `
            <div class="candidate-preview-card ${scoreClass}">
                <div class="candidate-rank">
                    <span class="rank-number">${rank}</span>
                    ${rank === 1 ? '<i class="fas fa-crown rank-crown"></i>' : ''}
                </div>
                <div class="candidate-info">
                    <h5 class="candidate-name">${candidate.name || 'Unknown Candidate'}</h5>
                    <p class="candidate-details">
                        ${candidate.education || 'Education details not available'}
                    </p>
                </div>
                <div class="candidate-scores">
                    <div class="score-display">
                        <div class="score-item primary">
                            <div class="score-circle ${scoreClass}">
                                <span class="score-value">${semanticScore.toFixed(1)}</span>
                            </div>
                            <span class="score-label">Semantic Score</span>
                        </div>
                        <div class="score-item secondary">
                            <div class="score-value-small">${traditionalScore.toFixed(1)}</div>
                            <span class="score-label-small">Traditional</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Show countdown before auto-redirect
     */
    showRedirectCountdown() {
        const container = document.getElementById('analysisResults');
        if (!container) return;

        const countdownHtml = `
            <div class="redirect-countdown">
                <div class="countdown-content">
                    <i class="fas fa-arrow-right me-2"></i>
                    <span>Redirecting to candidates view in <span id="countdownTimer">5</span> seconds...</span>
                    <button class="btn btn-sm btn-outline-primary ms-3" onclick="UploadModule.cancelRedirect()">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', countdownHtml);

        let countdown = 5;
        this.redirectTimer = setInterval(() => {
            countdown--;
            const timer = document.getElementById('countdownTimer');
            if (timer) timer.textContent = countdown;

            if (countdown <= 0) {
                this.redirectToCandidates();
            }
        }, 1000);
    },

    /**
     * Cancel auto-redirect
     */
    cancelRedirect() {
        if (this.redirectTimer) {
            clearInterval(this.redirectTimer);
            this.redirectTimer = null;
        }
        
        const countdown = document.querySelector('.redirect-countdown');
        if (countdown) {
            countdown.remove();
        }
    },

    /**
     * Start new analysis
     */
    startNewAnalysis() {
        // Reset the upload workflow
        this.clearUploadedFiles();
        
        // Scroll to upload zone
        const uploadZone = document.getElementById('regularUploadZone');
        if (uploadZone) {
            uploadZone.scrollIntoView({ behavior: 'smooth' });
        }
    },

    /**
     * Export results to file
     */
    exportResults() {
        this.showMessage('Export functionality will be implemented soon', 'info');
    },

    /**
     * Test function to preview enhanced results (for demonstration)
     */
    previewEnhancedResults() {
        console.log('🎯 Previewing enhanced analysis results...');
        
        // Sample test data
        const sampleResults = [
            {
                name: 'Maria Santos',
                matchScore: 95,
                education: 'PhD in Computer Science, University of the Philippines'
            },
            {
                name: 'Juan dela Cruz',
                matchScore: 88,
                education: 'MS in Information Technology, Ateneo de Manila University'
            },
            {
                name: 'Ana Reyes',
                matchScore: 82,
                education: 'BS in Computer Engineering, De La Salle University'
            },
            {
                name: 'Carlos Rodriguez',
                matchScore: 75,
                education: 'BS in Information Systems, University of Santo Tomas'
            },
            {
                name: 'Lisa Garcia',
                matchScore: 68,
                education: 'BS in Computer Science, Far Eastern University'
            },
            {
                name: 'Miguel Torres',
                matchScore: 45,
                education: 'BS in Information Technology, Technological University of the Philippines'
            }
        ];
        
        // Display the enhanced results with demo flag
        this.displayAnalysisResults(sampleResults, true);
        
        // Show a demo message
        setTimeout(() => {
            this.showMessage('This is a preview using sample data. Real analysis will show actual candidate information.', 'info');
        }, 1000);
    },

    /**
     * Close demo preview and return to upload interface
     */
    closeDemoPreview() {
        const analysisResults = document.getElementById('analysisResults');
        if (analysisResults) {
            analysisResults.style.display = 'none';
            analysisResults.innerHTML = '';
        }
        
        // Clear any active timers
        this.cancelRedirect();
        
        this.showMessage('Demo preview closed. You can now upload real Excel files for analysis.', 'info');
    },

    /**
     * Redirect to candidates section and refresh data
     */
    redirectToCandidates() {
        try {
            // Clear any active redirect timer first
            this.cancelRedirect();
            
            // Use NavigationModule if available
            if (window.NavigationModule) {
                window.NavigationModule.showSection('candidates');
            } else {
                // Fallback - direct URL change
                window.location.hash = '#candidates';
            }
            
            // Only refresh candidates data once, after a delay
            if (window.CandidatesModule && !this.hasRefreshedCandidates) {
                this.hasRefreshedCandidates = true;
                setTimeout(() => {
                    try {
                        window.CandidatesModule.loadCandidates();
                    } catch (error) {
                        console.warn('Error loading candidates:', error);
                    }
                    // Reset flag after some time
                    setTimeout(() => {
                        this.hasRefreshedCandidates = false;
                    }, 5000);
                }, 1000);
            }
            
            this.showMessage('Redirecting to Applications section...', 'info');
        } catch (error) {
            console.error('Error redirecting to candidates:', error);
        }
    },

    /**
     * Load job postings
     */
    async loadJobPostings() {
        try {
            console.log('📋 Loading job postings...');
            
            // Check if DOM element exists first
            const container = document.getElementById('positionTypesUpload');
            if (!container) {
                console.error('❌ Position types grid not found! Expected element with ID: positionTypesUpload');
                // Retry after a short delay in case DOM isn't ready
                setTimeout(() => this.loadJobPostings(), 500);
                return;
            }
            
            // Try LSPU job postings first
            let response = await fetch('/api/job-postings');
            console.log('📋 Job postings response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📋 Raw API response:', data);
            
            // Handle the wrapped response format
            let jobs = [];
            if (data.success && data.postings) {
                jobs = data.postings;
            } else if (data.success && data.data) {
                jobs = data.data;
            } else if (Array.isArray(data)) {
                jobs = data;
            } else {
                console.warn('⚠️ Unexpected job postings format:', data);
                jobs = [];
            }
            
            console.log('📋 Extracted jobs:', jobs);
            
            if (jobs && jobs.length > 0) {
                this.displayJobPostings(jobs);
                console.log(`✅ Loaded ${jobs.length} job postings`);
            } else {
                console.warn('⚠️ No job postings found');
                this.displayNoJobsMessage();
            }
        } catch (error) {
            console.error('❌ Error loading job postings:', error);
            this.displayJobLoadError();
        }
    },

    /**
     * Display no jobs message
     */
    displayNoJobsMessage() {
        const container = document.getElementById('positionTypesUpload');
        if (container) {
            container.innerHTML = `
                <div class="no-jobs-message">
                    <i class="fas fa-briefcase fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No job postings available.</p>
                    <p class="text-muted small">Please contact your administrator to add job postings.</p>
                </div>
            `;
        }
    },

    /**
     * Display job loading error
     */
    displayJobLoadError() {
        const container = document.getElementById('positionTypesUpload');
        if (container) {
            container.innerHTML = `
                <div class="job-error-message">
                    <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                    <p class="text-warning">Failed to load job postings.</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="UploadModule.loadJobPostings()">
                        <i class="fas fa-refresh me-1"></i>Retry
                    </button>
                </div>
            `;
        }
    },

    /**
     * Display job postings
     */
    displayJobPostings(jobs) {
        const container = document.getElementById('positionTypesUpload');
        if (!container) {
            console.error('Position types grid not found! Expected element with ID: positionTypesUpload');
            return;
        }

        console.log('Found position grid element, rendering jobs...');

        if (jobs.length === 0) {
            this.displayNoJobsMessage();
            return;
        }

        // Convert jobs to expected format
        const formattedJobs = jobs.map(job => ({
            id: job.id,
            position_title: job.title || job.position_title || 'University Position',
            campus_location: job.campus || job.campus_location || job.campus_name || 'Main Campus',
            description: job.description || job.position_category || 'University position',
            position_type_name: job.position_type_name || job.category || 'University Position'
        }));

        // Create job cards with simplified event handling
        container.innerHTML = formattedJobs.map(job => `
            <div class="position-type-card" data-job-id="${job.id}">
                <div class="position-icon">
                    <i class="fas fa-university"></i>
                </div>
                <div class="position-info">
                    <h4>${job.position_title}</h4>
                    <p class="position-description">${job.description}</p>
                    <div class="position-meta">
                        <span class="campus-badge">
                            <i class="fas fa-map-marker-alt"></i>
                            ${job.campus_location}
                        </span>
                    </div>
                </div>
                <div class="position-action">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `).join('');

        // Add click event listeners
        const jobCards = container.querySelectorAll('.position-type-card');
        jobCards.forEach(card => {
            card.addEventListener('click', () => {
                const jobId = parseInt(card.dataset.jobId);
                const job = formattedJobs.find(j => j.id === jobId);
                if (job) {
                    this.selectJob(jobId, job);
                }
            });
        });

        console.log('Displayed ' + formattedJobs.length + ' job postings');
    },

    /**
     * Select a job for upload
     */
    selectJob(jobId, jobData) {
        console.log('Job selected: ' + jobId, jobData);
        
        // Update state
        this.state.selectedJobId = jobId;
        
        // Update UI
        const cards = document.querySelectorAll('.position-type-card');
        cards.forEach(card => {
            card.classList.remove('selected');
            if (parseInt(card.dataset.jobId) === jobId) {
                card.classList.add('selected');
            }
        });
        
        // Show next step
        this.showUploadStep();
        this.showMessage('Job selected: ' + jobData.position_title + '. You can now upload files.', 'success');
    },

    /**
     * Show upload step
     */
    showUploadStep() {
        const uploadStep = document.getElementById('fileUploadStep');
        if (uploadStep) {
            uploadStep.style.display = 'block';
            uploadStep.scrollIntoView({ behavior: 'smooth' });
        }
    },

    /**
     * Set selected job (compatibility method)
     */
    setSelectedJob(jobId) {
        console.log('setSelectedJob called with:', jobId);
        this.state.selectedJobId = jobId;
        this.showMessage('Job selected. You can now upload files.', 'info');
    },
    setSelectedJob(jobId) {
        console.log('🎯 setSelectedJob called with:', jobId, 'type:', typeof jobId);
        this.state.selectedJobId = jobId;
        console.log('🎯 Job selected for upload. State updated:', this.state.selectedJobId);
        this.showMessage('Job selected. You can now upload files.', 'info');
    },

    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        console.log(type.toUpperCase() + ': ' + message);
        
        // Try to find existing message container or create one
        let messageContainer = document.getElementById('uploadMessages');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'uploadMessages';
            messageContainer.className = 'upload-messages';
            
            const uploadSection = document.getElementById('uploadSection');
            if (uploadSection) {
                uploadSection.insertBefore(messageContainer, uploadSection.firstChild);
            }
        }
        
        const alertClass = type === 'error' ? 'danger' : (type === 'success' ? 'success' : 'info');
        messageContainer.innerHTML = 
            '<div class="alert alert-' + alertClass + ' alert-dismissible fade show">' +
                message +
                '<button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>' +
            '</div>';
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageContainer.firstElementChild) {
                messageContainer.firstElementChild.remove();
            }
        }, 5000);
    },

    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    },

    /**
     * Show loading state
     */
    showLoadingState(type, message) {
        const loadingId = type + 'Loading';
        let loadingContainer = document.getElementById(loadingId);
        
        if (!loadingContainer) {
            loadingContainer = document.createElement('div');
            loadingContainer.id = loadingId;
            loadingContainer.className = 'loading-state';
            
            const uploadSection = document.getElementById('uploadSection');
            if (uploadSection) {
                uploadSection.appendChild(loadingContainer);
            }
        }
        
        loadingContainer.innerHTML = 
            '<div class="loading-spinner-container">' +
                '<div class="spinner-border text-primary" role="status">' +
                    '<span class="visually-hidden">Loading...</span>' +
                '</div>' +
                '<div class="loading-message mt-2">' + message + '</div>' +
            '</div>';
        
        loadingContainer.style.display = 'block';
    },

    /**
     * Hide loading state
     */
    hideLoadingState(type) {
        const loadingId = type + 'Loading';
        const loadingContainer = document.getElementById(loadingId);
        
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
    },

    /**
     * Simple delay utility for smooth progress updates
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Auto-initialize when DOM is ready and make globally available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        UploadModule.init();
        window.uploadModuleInstance = UploadModule;
    });
} else {
    UploadModule.init();
    window.uploadModuleInstance = UploadModule;
}

// Make UploadModule globally available
window.UploadModule = UploadModule;

// Debug logging to track module availability
console.log('📦 UploadModule defined and attached to window');
console.log('🔍 UploadModule methods:', Object.keys(UploadModule));