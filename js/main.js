/**
 * ML STUDIO - MAIN APPLICATION FILE
 * Version: 4.0 - COMPLETE FIXED VERSION WITH ENVIRONMENT VARIABLES
 */

// ============================================================================
// CONFIGURATION - ENVIRONMENT VARIABLES
// ============================================================================

const Config = {
    // Get backend URL from environment variable or use localhost as fallback
    API_URL: typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL 
        ? process.env.REACT_APP_API_URL 
        : 'http://localhost:5000',
    
    // Other configuration settings
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    ALLOWED_FILE_TYPES: ['.csv', '.xlsx', '.xls'],
    
    // Endpoints
    ENDPOINTS: {
        HEALTH: '/health',
        UPLOAD: '/upload',
        ANALYZE: '/analyze',
        LIST_DATASETS: '/list_datasets',
        DATASET_INFO: '/dataset_info',
        GET_COLUMNS: '/get_columns',
        DELETE: '/delete'
    }
};

// Freeze the config object to prevent modifications
Object.freeze(Config);

// ============================================================================
// APPLICATION STATE MANAGEMENT
// ============================================================================

const AppState = {
    currentDataset: null,
    datasetInfo: null,
    isUploading: false,
    isAnalyzing: false,
    backendConnected: false,
    baseURL: Config.API_URL,
    
    init() {
        console.log('🚀 ML Studio Initializing...');
        console.log(`📍 Backend URL: ${this.baseURL}`);
        console.log(`🔧 Environment: ${typeof process !== 'undefined' && process.env && process.env.NODE_ENV ? process.env.NODE_ENV : 'development'}`);
        
        // Load saved state
        this.load();
        
        // Check backend connection immediately
        this.checkBackend();
    },
    
    save() {
        try {
            const state = {
                currentDataset: this.currentDataset,
                datasetInfo: this.datasetInfo,
                timestamp: Date.now()
            };
            sessionStorage.setItem('mlStudioState', JSON.stringify(state));
            console.log('💾 State saved');
        } catch (e) {
            console.warn('Failed to save state:', e);
        }
    },
    
    load() {
        try {
            const saved = sessionStorage.getItem('mlStudioState');
            if (saved) {
                const state = JSON.parse(saved);
                // Check if state is not too old (24 hours)
                if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                    this.currentDataset = state.currentDataset;
                    this.datasetInfo = state.datasetInfo;
                    
                    if (this.currentDataset && this.datasetInfo) {
                        console.log('📁 Restored dataset:', this.currentDataset);
                        return true;
                    }
                } else {
                    console.log('⏰ Saved state expired');
                    sessionStorage.removeItem('mlStudioState');
                }
            }
        } catch (e) {
            console.warn('Failed to load state:', e);
        }
        return false;
    },
    
    clear() {
        this.currentDataset = null;
        this.datasetInfo = null;
        sessionStorage.removeItem('mlStudioState');
        console.log('🗑️ State cleared');
    },
    
    async checkBackend() {
        try {
            const response = await fetch(`${this.baseURL}${Config.ENDPOINTS.HEALTH}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.backendConnected = true;
                console.log('✅ Backend connected:', data);
                
                const backendStatus = document.getElementById('backendStatus');
                if (backendStatus) {
                    backendStatus.innerHTML = '<span class="badge bg-success p-3"><i class="fas fa-check-circle"></i> Backend Connected - Server Ready</span>';
                }
                
                // If we have a saved dataset, restore UI
                if (this.currentDataset && this.datasetInfo) {
                    this.restoreDatasetUI();
                }
                
                return true;
            } else {
                throw new Error('Backend not responding');
            }
        } catch (error) {
            console.error('❌ Backend not connected:', error);
            this.backendConnected = false;
            
            const backendStatus = document.getElementById('backendStatus');
            if (backendStatus) {
                backendStatus.innerHTML = '<span class="badge bg-danger p-3"><i class="fas fa-exclamation-circle"></i> Backend Disconnected - Start server on port 5000</span>';
            }
            
            return false;
        }
    },
    
    restoreDatasetUI() {
        const activeDatasetCard = document.getElementById('activeDatasetCard');
        const activeDatasetInfo = document.getElementById('activeDatasetInfo');
        const runAnalysisBtn = document.getElementById('runAnalysis');
        const analysisStatus = document.getElementById('analysisStatus');
        const generateChartBtn = document.getElementById('generateChart');
        const generateReportBtn = document.getElementById('generateReport');
        
        if (activeDatasetCard && activeDatasetInfo && this.datasetInfo) {
            activeDatasetCard.style.display = 'block';
            
            // Create column tags
            let columnTags = '';
            if (this.datasetInfo.columns_list) {
                columnTags = this.datasetInfo.columns_list.slice(0, 8).map(col => 
                    `<span class="column-tag">
                        <i class="fas fa-tag"></i> ${col}
                    </span>`
                ).join('');
                
                if (this.datasetInfo.columns_list.length > 8) {
                    columnTags += `<span class="column-tag more">+${this.datasetInfo.columns_list.length - 8} more</span>`;
                }
            }
            
            activeDatasetInfo.innerHTML = `
                <div class="dataset-stats">
                    <div class="stat-item">
                        <i class="fas fa-table"></i>
                        <div>
                            <span class="stat-label">Rows</span>
                            <span class="stat-value">${this.datasetInfo.rows.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-columns"></i>
                        <div>
                            <span class="stat-label">Columns</span>
                            <span class="stat-value">${this.datasetInfo.columns}</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-weight-hanging"></i>
                        <div>
                            <span class="stat-label">Size</span>
                            <span class="stat-value">${this.datasetInfo.memory_usage || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="dataset-columns">
                    <span class="columns-label">
                        <i class="fas fa-tags"></i> Columns:
                    </span>
                    <div class="column-tags">
                        ${columnTags}
                    </div>
                </div>
                ${this.datasetInfo.duplicates_removed > 0 ? `
                    <div class="dataset-warning">
                        <i class="fas fa-info-circle"></i>
                        Removed ${this.datasetInfo.duplicates_removed} duplicate rows
                    </div>
                ` : ''}
            `;
            
            // Enable buttons
            if (runAnalysisBtn) {
                runAnalysisBtn.disabled = false;
                runAnalysisBtn.classList.add('enabled');
            }
            
            if (analysisStatus) {
                analysisStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Dataset ready! Click to run analysis';
            }
            
            if (generateChartBtn) {
                generateChartBtn.disabled = false;
            }
            
            if (generateReportBtn) {
                generateReportBtn.disabled = false;
            }
            
            const reportStatus = document.getElementById('reportStatus');
            if (reportStatus) {
                reportStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Dataset ready! Click to generate report';
            }
            
            // Store in global for compatibility
            window.currentDataset = this.currentDataset;
            window.datasetInfo = this.datasetInfo;
        }
    }
};

// ============================================================================
// API SERVICE
// ============================================================================

const API = {
    baseURL: Config.API_URL,
    
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseURL}${Config.ENDPOINTS.UPLOAD}`, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || 'Upload failed');
        }
        
        return await response.json();
    },
    
    async analyze(data) {
        const response = await fetch(`${this.baseURL}${Config.ENDPOINTS.ANALYZE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Analysis failed' }));
            throw new Error(error.error || 'Analysis failed');
        }
        
        return await response.json();
    },
    
    async getColumns(filename) {
        const response = await fetch(`${this.baseURL}${Config.ENDPOINTS.GET_COLUMNS}/${encodeURIComponent(filename)}`, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load columns');
        }
        
        return await response.json();
    },
    
    async getDatasetInfo(filename) {
        const response = await fetch(`${this.baseURL}${Config.ENDPOINTS.DATASET_INFO}/${encodeURIComponent(filename)}`, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load dataset info');
        }
        
        return await response.json();
    }
};

// ============================================================================
// UPLOAD HANDLER
// ============================================================================

const UploadHandler = {
    init() {
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.browseLink = document.getElementById('browseLink');
        this.uploadArea = document.getElementById('uploadArea');
        this.clearFileBtn = document.getElementById('clearFileBtn');
        this.selectedFileName = document.getElementById('selectedFileName');
        this.selectedFileSize = document.getElementById('selectedFileSize');
        this.fileSelection = document.getElementById('fileSelection');
        this.uploadStatus = document.getElementById('uploadStatus');
        
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        // Upload button click
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📁 Upload button clicked');
                this.fileInput.click();
            });
        }
        
        // Browse link click
        if (this.browseLink) {
            this.browseLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔗 Browse link clicked');
                this.fileInput.click();
            });
        }
        
        // Upload area click (except on buttons)
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', (e) => {
                // Don't trigger if clicking on button or clear button
                if (e.target === this.uploadBtn || 
                    (this.uploadBtn && this.uploadBtn.contains(e.target)) ||
                    e.target === this.clearFileBtn || 
                    (this.clearFileBtn && this.clearFileBtn.contains(e.target))) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                console.log('📦 Upload area clicked');
                this.fileInput.click();
            });
        }
        
        // Clear file button
        if (this.clearFileBtn && this.fileSelection) {
            this.clearFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🗑️ Clearing file selection');
                this.fileInput.value = '';
                this.fileSelection.style.display = 'none';
                if (this.selectedFileName) this.selectedFileName.textContent = '';
                if (this.selectedFileSize) this.selectedFileSize.textContent = '';
            });
        }
        
        // Drag and drop
        if (this.uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.uploadArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            this.uploadArea.addEventListener('dragover', () => {
                this.uploadArea.classList.add('dragover');
            });
            
            this.uploadArea.addEventListener('dragleave', () => {
                this.uploadArea.classList.remove('dragover');
            });
            
            this.uploadArea.addEventListener('drop', (e) => {
                this.uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    console.log('📁 File dropped:', e.dataTransfer.files[0].name);
                    this.fileInput.files = e.dataTransfer.files;
                    // Trigger change event
                    const event = new Event('change', { bubbles: true });
                    this.fileInput.dispatchEvent(event);
                }
            });
        }
        
        // File input change
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    },
    
    handleFileSelect(e) {
        if (e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        console.log('📎 File selected:', file.name, file.size, 'bytes');
        
        // Show file selection
        if (this.selectedFileName && this.selectedFileSize && this.fileSelection) {
            this.selectedFileName.textContent = file.name;
            
            // Format file size
            let size = file.size;
            let formattedSize = size < 1024 * 1024 
                ? (size / 1024).toFixed(2) + ' KB'
                : (size / (1024 * 1024)).toFixed(2) + ' MB';
            this.selectedFileSize.textContent = formattedSize;
            this.fileSelection.style.display = 'block';
        }
        
        // Validate file type
        const validExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!validExtensions.includes(fileExtension)) {
            alert('❌ Invalid file type. Please upload CSV, XLSX, or XLS files only.');
            e.target.value = '';
            if (this.fileSelection) this.fileSelection.style.display = 'none';
            return;
        }
        
        // Validate file size (500MB max)
        if (file.size > 500 * 1024 * 1024) {
            alert('❌ File size exceeds 500MB limit.');
            e.target.value = '';
            if (this.fileSelection) this.fileSelection.style.display = 'none';
            return;
        }
        
        // Check backend connection
        if (!AppState.backendConnected) {
            alert('❌ Backend server is not connected. Please start the server on port 5000.');
            return;
        }
        
        // Upload the file
        this.uploadFile(file);
    },
    
    async uploadFile(file) {
        if (AppState.isUploading) return;
        
        AppState.isUploading = true;
        
        // Show uploading status
        if (this.uploadStatus) {
            let formattedSize = file.size < 1024 * 1024 
                ? (file.size / 1024).toFixed(2) + ' KB'
                : (file.size / (1024 * 1024)).toFixed(2) + ' MB';
                
            this.uploadStatus.innerHTML = `
                <div class="status-card status-uploading">
                    <div class="status-icon">
                        <i class="fas fa-cloud-upload-alt fa-spin"></i>
                    </div>
                    <div class="status-content">
                        <h6>Uploading Dataset...</h6>
                        <p><strong>${file.name}</strong> (${formattedSize})</p>
                        <div class="progress mt-2">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                 style="width: 100%; background: linear-gradient(90deg, #3498db, #2980b9);"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Disable upload button
        if (this.uploadBtn) {
            this.uploadBtn.disabled = true;
            this.uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }
        
        try {
            const result = await API.uploadFile(file);
            console.log('✅ Upload successful:', result);
            
            if (result.success) {
                this.handleUploadSuccess(result, file);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            this.handleUploadError(error);
        } finally {
            AppState.isUploading = false;
            
            // Re-enable upload button
            if (this.uploadBtn) {
                this.uploadBtn.disabled = false;
                this.uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Choose File to Upload';
            }
        }
    },
    
    handleUploadSuccess(result, file) {
        // Show success status
        if (this.uploadStatus) {
            let formattedSize = file.size < 1024 * 1024 
                ? (file.size / 1024).toFixed(2) + ' KB'
                : (file.size / (1024 * 1024)).toFixed(2) + ' MB';
                
            this.uploadStatus.innerHTML = `
                <div class="status-card status-success">
                    <div class="status-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="status-content">
                        <h6>✅ Upload Successful!</h6>
                        <div class="upload-stats">
                            <div class="stat">
                                <span class="stat-label">File</span>
                                <span class="stat-value">${result.original_filename || file.name}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Rows</span>
                                <span class="stat-value">${result.info.rows.toLocaleString()}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Columns</span>
                                <span class="stat-value">${result.info.columns}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Update AppState
        AppState.currentDataset = result.filename;
        AppState.datasetInfo = result.info;
        AppState.save();
        
        // Update UI
        this.updateUIAfterUpload(result);
        
        // Clear file selection
        this.fileInput.value = '';
        if (this.fileSelection) {
            this.fileSelection.style.display = 'none';
        }
        
        // Show success message
        console.log('✅ File uploaded successfully! ' + result.info.rows.toLocaleString() + ' rows loaded.');
    },
    
    handleUploadError(error) {
        if (this.uploadStatus) {
            this.uploadStatus.innerHTML = `
                <div class="status-card status-error">
                    <div class="status-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="status-content">
                        <h6>❌ Upload Failed</h6>
                        <p>${error.message}</p>
                        <p class="text-muted small mt-2">
                            <i class="fas fa-lightbulb"></i>
                            Make sure the backend server is running on port 5000
                        </p>
                    </div>
                </div>
            `;
        }
        
        alert('❌ Upload failed: ' + error.message);
    },
    
    updateUIAfterUpload(result) {
        const activeDatasetCard = document.getElementById('activeDatasetCard');
        const activeDatasetInfo = document.getElementById('activeDatasetInfo');
        const runAnalysisBtn = document.getElementById('runAnalysis');
        const analysisStatus = document.getElementById('analysisStatus');
        const generateChartBtn = document.getElementById('generateChart');
        const generateReportBtn = document.getElementById('generateReport');
        
        if (activeDatasetCard && activeDatasetInfo) {
            activeDatasetCard.style.display = 'block';
            
            // Create column tags
            let columnTags = '';
            if (result.info.columns_list) {
                columnTags = result.info.columns_list.slice(0, 8).map(col => 
                    `<span class="column-tag">
                        <i class="fas fa-tag"></i> ${col}
                    </span>`
                ).join('');
                
                if (result.info.columns_list.length > 8) {
                    columnTags += `<span class="column-tag more">+${result.info.columns_list.length - 8} more</span>`;
                }
            }
            
            activeDatasetInfo.innerHTML = `
                <div class="dataset-stats">
                    <div class="stat-item">
                        <i class="fas fa-table"></i>
                        <div>
                            <span class="stat-label">Rows</span>
                            <span class="stat-value">${result.info.rows.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-columns"></i>
                        <div>
                            <span class="stat-label">Columns</span>
                            <span class="stat-value">${result.info.columns}</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-weight-hanging"></i>
                        <div>
                            <span class="stat-label">Size</span>
                            <span class="stat-value">${result.info.memory_usage || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="dataset-columns">
                    <span class="columns-label">
                        <i class="fas fa-tags"></i> Columns:
                    </span>
                    <div class="column-tags">
                        ${columnTags}
                    </div>
                </div>
                ${result.info.duplicates_removed > 0 ? `
                    <div class="dataset-warning">
                        <i class="fas fa-info-circle"></i>
                        Removed ${result.info.duplicates_removed} duplicate rows
                    </div>
                ` : ''}
            `;
        }
        
        // Enable analysis button
        if (runAnalysisBtn) {
            runAnalysisBtn.disabled = false;
            runAnalysisBtn.classList.add('enabled');
        }
        
        if (analysisStatus) {
            analysisStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Dataset ready! Click to run analysis';
        }
        
        // Enable chart button
        if (generateChartBtn) {
            generateChartBtn.disabled = false;
        }
        
        // Enable report button
        if (generateReportBtn) {
            generateReportBtn.disabled = false;
        }
        
        const reportStatus = document.getElementById('reportStatus');
        if (reportStatus) {
            reportStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Dataset ready! Click to generate report';
        }
        
        // Store in global for compatibility
        window.currentDataset = result.filename;
        window.datasetInfo = result.info;
        
        // Update column selects for visualization
        VisualizationHandler.updateColumnSelects(result.info.columns_list);
    }
};

// ============================================================================
// ANALYSIS HANDLER
// ============================================================================

const AnalysisHandler = {
    init() {
        this.runAnalysisBtn = document.getElementById('runAnalysis');
        this.resultsContainer = document.getElementById('results');
        
        if (this.runAnalysisBtn) {
            this.runAnalysisBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.runAnalysis();
            });
        }
        
        // Check all checkboxes by default?
        this.setDefaultSelections();
    },
    
    setDefaultSelections() {
        // Select some algorithms by default
        const defaultSelections = ['random_forest', 'decision_tree', 'linear_regression', 'clustering'];
        defaultSelections.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = true;
        });
    },
    
    async runAnalysis() {
        const dataset = window.currentDataset || AppState.currentDataset;
        
        if (!dataset) {
            alert('⚠️ Please upload a dataset first!');
            return;
        }
        
        if (!AppState.backendConnected) {
            alert('❌ Backend server is not connected. Please start the server on port 5000.');
            return;
        }
        
        if (AppState.isAnalyzing) {
            alert('⚠️ Analysis already in progress...');
            return;
        }
        
        // Get selected algorithms
        const algorithms = [];
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(cb => {
            if (cb.id && !['clean_data', 'remove_outliers'].includes(cb.id)) {
                algorithms.push(cb.id);
            }
        });
        
        if (algorithms.length === 0) {
            alert('⚠️ Please select at least one algorithm!');
            return;
        }
        
        AppState.isAnalyzing = true;
        
        // Show loading
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <h4 class="mt-3">Running Machine Learning Analysis...</h4>
                    <p class="text-muted">This may take a few moments</p>
                    <p class="text-muted small">Selected algorithms: ${algorithms.length}</p>
                </div>
            `;
        }
        
        // Disable button
        if (this.runAnalysisBtn) {
            this.runAnalysisBtn.disabled = true;
            this.runAnalysisBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        }
        
        try {
            const result = await API.analyze({
                filename: dataset,
                algorithms: algorithms
            });
            
            if (result.success) {
                this.displayResults(result.results);
                
                // Enable report generation
                const generateReportBtn = document.getElementById('generateReport');
                if (generateReportBtn) {
                    generateReportBtn.disabled = false;
                }
                
                const reportStatus = document.getElementById('reportStatus');
                if (reportStatus) {
                    reportStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Analysis complete! Ready to generate report';
                }
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            if (this.resultsContainer) {
                this.resultsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i>
                        <strong>Analysis failed:</strong> ${error.message}
                    </div>
                `;
            }
            alert('❌ Analysis failed: ' + error.message);
        } finally {
            AppState.isAnalyzing = false;
            if (this.runAnalysisBtn) {
                this.runAnalysisBtn.disabled = false;
                this.runAnalysisBtn.innerHTML = '<i class="fas fa-play-circle"></i> Run Analysis';
            }
        }
    },
    
    displayResults(results) {
        if (!this.resultsContainer) return;
        
        let bestModel = null;
        let bestScore = 0;
        let bestType = '';
        
        let html = `
            <div class="results-container">
                <div class="results-header">
                    <h3>
                        <i class="fas fa-chart-bar"></i>
                        Analysis Results
                        <span class="results-badge">${results.length} Models</span>
                    </h3>
                </div>
                <div class="results-grid">
        `;
        
        results.forEach(result => {
            if (result.error) {
                // Failed model
                html += '<div class="result-card">';
                html += `<div class="result-header failed">`;
                html += `<i class="fas fa-exclamation-triangle"></i>`;
                html += `<h4>${result.algorithm}</h4>`;
                html += `<span class="result-badge failed">Failed</span>`;
                html += '</div>';
                html += '<div class="result-body">';
                html += `<div class="result-error">❌ ${result.error}</div>`;
                html += '</div></div>';
                return;
            }
            
            // Track best model
            if (result.model_type === 'classification' && result.accuracy > bestScore) {
                bestScore = result.accuracy;
                bestModel = result.algorithm;
                bestType = 'classification';
            } else if (result.model_type === 'regression' && result.r2_score > bestScore) {
                bestScore = result.r2_score;
                bestModel = result.algorithm;
                bestType = 'regression';
            } else if (result.model_type === 'clustering' && result.silhouette_score > bestScore) {
                bestScore = result.silhouette_score;
                bestModel = result.algorithm;
                bestType = 'clustering';
            }
            
            html += '<div class="result-card">';
            html += `<div class="result-header ${result.model_type}">`;
            
            // Icon based on type
            if (result.model_type === 'classification') {
                html += `<i class="fas fa-tags"></i>`;
            } else if (result.model_type === 'regression') {
                html += `<i class="fas fa-chart-line"></i>`;
            } else if (result.model_type === 'clustering') {
                html += `<i class="fas fa-project-diagram"></i>`;
            }
            
            html += `<h4>${result.algorithm}</h4>`;
            html += `<span class="result-badge ${result.model_type}">${result.model_type}</span>`;
            html += '</div>';
            html += '<div class="result-body">';
            
            if (result.model_type === 'classification') {
                html += `
                    <div class="metric-grid">
                        <div class="metric">
                            <span class="metric-label">Accuracy</span>
                            <span class="metric-value success">${(result.accuracy * 100).toFixed(2)}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">F1 Score</span>
                            <span class="metric-value info">${result.f1_score}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Precision</span>
                            <span class="metric-value warning">${result.precision}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Recall</span>
                            <span class="metric-value danger">${result.recall}</span>
                        </div>
                    </div>
                `;
            } else if (result.model_type === 'regression') {
                html += `
                    <div class="metric-grid">
                        <div class="metric">
                            <span class="metric-label">R² Score</span>
                            <span class="metric-value success">${result.r2_score}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">RMSE</span>
                            <span class="metric-value info">${result.rmse || 'N/A'}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">MAE</span>
                            <span class="metric-value warning">${result.mae}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">MSE</span>
                            <span class="metric-value danger">${result.mse}</span>
                        </div>
                    </div>
                `;
            } else if (result.model_type === 'clustering') {
                html += `
                    <div class="metric-grid single">
                        <div class="metric">
                            <span class="metric-label">Silhouette Score</span>
                            <span class="metric-value success">${result.silhouette_score}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Clusters</span>
                            <span class="metric-value info">${result.clusters_created}</span>
                        </div>
                    </div>
                `;
            }
            
            html += '</div></div>';
        });
        
        html += '</div>';
        
        // Add best algorithm highlight
        if (bestModel) {
            let scoreDisplay = '';
            if (bestType === 'classification') {
                scoreDisplay = `${(bestScore * 100).toFixed(2)}% accuracy`;
            } else if (bestType === 'regression') {
                scoreDisplay = `R² score: ${bestScore.toFixed(4)}`;
            } else if (bestType === 'clustering') {
                scoreDisplay = `Silhouette: ${bestScore.toFixed(4)}`;
            }
            
            html += `
                <div class="best-algorithm-card">
                    <i class="fas fa-trophy"></i>
                    <div>
                        <strong>Best Performing Algorithm:</strong>
                        <span class="best-algorithm-name">${bestModel}</span>
                        <span class="best-algorithm-score">${scoreDisplay}</span>
                    </div>
                </div>
            `;
            
            // Update metrics dashboard
            this.updateMetrics(results);
        }
        
        html += '</div>';
        
        this.resultsContainer.innerHTML = html;
        
        // Scroll to results
        this.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    
    updateMetrics(results) {
        // Find best classification model
        let best = null;
        results.forEach(result => {
            if (result.model_type === 'classification' && (!best || result.accuracy > best.accuracy)) {
                best = result;
            }
        });
        
        if (best) {
            const accuracyPercent = (best.accuracy * 100).toFixed(1);
            
            const accuracyEl = document.getElementById('accuracy');
            const accuracyValue = document.getElementById('accuracyValue');
            const accuracyBar = document.getElementById('accuracyBar');
            
            if (accuracyEl) accuracyEl.textContent = `${accuracyPercent}%`;
            if (accuracyValue) accuracyValue.textContent = `${accuracyPercent}%`;
            if (accuracyBar) {
                accuracyBar.style.width = `${accuracyPercent}%`;
                accuracyBar.querySelector('span').textContent = `${accuracyPercent}%`;
            }
            
            const f1El = document.getElementById('f1Score');
            const f1Value = document.getElementById('f1Value');
            const f1Bar = document.getElementById('f1Bar');
            
            if (f1El) f1El.textContent = best.f1_score;
            if (f1Value) f1Value.textContent = best.f1_score;
            if (f1Bar) {
                f1Bar.style.width = `${best.f1_score * 100}%`;
                f1Bar.querySelector('span').textContent = best.f1_score;
            }
            
            const precisionEl = document.getElementById('precision');
            const precisionValue = document.getElementById('precisionValue');
            const precisionBar = document.getElementById('precisionBar');
            
            if (precisionEl) precisionEl.textContent = best.precision;
            if (precisionValue) precisionValue.textContent = best.precision;
            if (precisionBar) {
                precisionBar.style.width = `${best.precision * 100}%`;
                precisionBar.querySelector('span').textContent = best.precision;
            }
            
            const recallEl = document.getElementById('recall');
            const recallValue = document.getElementById('recallValue');
            const recallBar = document.getElementById('recallBar');
            
            if (recallEl) recallEl.textContent = best.recall;
            if (recallValue) recallValue.textContent = best.recall;
            if (recallBar) {
                recallBar.style.width = `${best.recall * 100}%`;
                recallBar.querySelector('span').textContent = best.recall;
            }
            
            const bestAlgorithmEl = document.getElementById('bestAlgorithm');
            if (bestAlgorithmEl) {
                bestAlgorithmEl.innerHTML = `${best.algorithm} (${accuracyPercent}% accuracy)`;
            }
        }
    }
};

// ============================================================================
// VISUALIZATION HANDLER
// ============================================================================

const VisualizationHandler = {
    init() {
        this.generateChartBtn = document.getElementById('generateChart');
        this.chartContainer = document.getElementById('chartContainer');
        this.chartType = document.getElementById('chartType');
        this.columnSelects = document.getElementById('columnSelects');
        
        if (this.generateChartBtn) {
            this.generateChartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateChart();
            });
        }
        
        if (this.chartType) {
            this.chartType.addEventListener('change', () => {
                this.updateColumnVisibility();
            });
        }
        
        // Initialize column selects if dataset exists
        const dataset = window.currentDataset || AppState.currentDataset;
        if (dataset && AppState.datasetInfo && AppState.datasetInfo.columns_list) {
            this.updateColumnSelects(AppState.datasetInfo.columns_list);
        }
    },
    
    updateColumnSelects(columns) {
        if (!this.columnSelects || !columns || columns.length === 0) return;
        
        let html = `
            <div class="control-group">
                <label class="control-label">
                    <i class="fas fa-chart-line"></i> X-Axis Column:
                </label>
                <select class="form-select" id="chartColumnX">
                    <option value="">Select X-Axis Column</option>
        `;
        
        columns.forEach(col => {
            html += `<option value="${col}">${col}</option>`;
        });
        
        html += `
                </select>
            </div>
            
            <div class="control-group" id="yAxisGroup" style="display: none;">
                <label class="control-label">
                    <i class="fas fa-chart-line"></i> Y-Axis Column:
                </label>
                <select class="form-select" id="chartColumnY">
                    <option value="">Select Y-Axis Column</option>
        `;
        
        columns.forEach(col => {
            html += `<option value="${col}">${col}</option>`;
        });
        
        html += `
                </select>
            </div>
        `;
        
        this.columnSelects.innerHTML = html;
        this.updateColumnVisibility();
    },
    
    updateColumnVisibility() {
        const chartType = this.chartType?.value;
        const yAxisGroup = document.getElementById('yAxisGroup');
        
        if (yAxisGroup) {
            yAxisGroup.style.display = ['scatter', 'line'].includes(chartType) ? 'block' : 'none';
        }
    },
    
    generateChart() {
        const dataset = window.currentDataset || AppState.currentDataset;
        
        if (!dataset) {
            alert('⚠️ Please upload a dataset first!');
            return;
        }
        
        const chartType = this.chartType?.value;
        const xColumn = document.getElementById('chartColumnX')?.value;
        const yColumn = document.getElementById('chartColumnY')?.value;
        const chartTitle = document.getElementById('chartTitle')?.value || 'Data Visualization';
        
        if (!chartType) {
            alert('⚠️ Please select a chart type!');
            return;
        }
        
        if (!xColumn) {
            alert('⚠️ Please select an X-axis column!');
            return;
        }
        
        if ((chartType === 'scatter' || chartType === 'line') && !yColumn) {
            alert('⚠️ Please select a Y-axis column for this chart type!');
            return;
        }
        
        // Get icon based on chart type
        let iconClass = 'fa-chart-bar';
        if (chartType === 'pie') iconClass = 'fa-chart-pie';
        else if (chartType === 'scatter') iconClass = 'fa-chart-scatter';
        else if (chartType === 'line') iconClass = 'fa-chart-line';
        else if (chartType === 'histogram') iconClass = 'fa-chart-bar';
        else if (chartType === 'heatmap') iconClass = 'fa-th';
        else if (chartType === 'boxplot') iconClass = 'fa-chart-gantt';
        
        // Show chart
        if (this.chartContainer) {
            this.chartContainer.innerHTML = `
                <div class="chart-generated">
                    <div class="chart-header">
                        <h6>${chartTitle}</h6>
                        <span class="chart-type-badge">${chartType}</span>
                    </div>
                    <div class="chart-visualization">
                        <i class="fas ${iconClass}"></i>
                        <div class="chart-info">
                            <p><strong>X-Axis:</strong> ${xColumn}</p>
                            ${yColumn ? `<p><strong>Y-Axis:</strong> ${yColumn}</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    }
};

// ============================================================================
// REPORT HANDLER
// ============================================================================

const ReportHandler = {
    init() {
        this.generateReportBtn = document.getElementById('generateReport');
        this.reportMessage = document.getElementById('reportMessage');
        
        if (this.generateReportBtn) {
            this.generateReportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateReport();
            });
        }
    },
    
    generateReport() {
        const dataset = window.currentDataset || AppState.currentDataset;
        
        if (!dataset) {
            alert('⚠️ Please upload a dataset first!');
            return;
        }
        
        if (!AppState.backendConnected) {
            alert('❌ Backend server is not connected. Please start the server on port 5000.');
            return;
        }
        
        // Disable button temporarily
        if (this.generateReportBtn) {
            this.generateReportBtn.disabled = true;
            this.generateReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        }
        
        // Simulate report generation
        setTimeout(() => {
            if (this.reportMessage) {
                this.reportMessage.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i>
                        <strong>Success!</strong> Report generated successfully! 
                        <a href="#" class="alert-link">Download report.pdf</a>
                    </div>
                `;
            }
            
            if (this.generateReportBtn) {
                this.generateReportBtn.disabled = false;
                this.generateReportBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Generate PDF Report';
            }
            
            alert('✅ Report generated successfully!');
        }, 2000);
    }
};

// ============================================================================
// NAVIGATION HANDLER
// ============================================================================

const NavigationHandler = {
    init() {
        this.navbar = document.querySelector('.navbar');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        window.addEventListener('scroll', () => this.handleScroll());
        this.setupSmoothScrolling();
    },
    
    handleScroll() {
        if (window.scrollY > 50) {
            this.navbar.classList.add('scrolled');
        } else {
            this.navbar.classList.remove('scrolled');
        }
        
        // Update active nav link
        const sections = document.querySelectorAll('section');
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    },
    
    setupSmoothScrolling() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                if (targetId === '#') return;
                
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    console.log('🚀 Initializing ML Studio...');
    
    // Initialize AppState
    AppState.init();
    
    // Initialize handlers
    UploadHandler.init();
    AnalysisHandler.init();
    VisualizationHandler.init();
    ReportHandler.init();
    NavigationHandler.init();
    
    // Check backend every 30 seconds
    setInterval(() => AppState.checkBackend(), 30000);
    
    console.log('✅ ML Studio Ready');
}

// Start application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}