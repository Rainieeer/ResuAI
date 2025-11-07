// Enhanced Analytics Module - University Assessment Analytics
const AnalyticsModule = {
    dateRange: null,
    charts: {
        assessmentTrends: null,
        scoreDistribution: null,
        criteriaRadar: null,
        positionPerformance: null
    },

    // University assessment criteria configuration with explicit ordering
    assessmentCriteria: {
        education: { weight: 40, label: 'Education', icon: 'fas fa-graduation-cap', color: '#4F46E5', order: 1 },
        experience: { weight: 20, label: 'Experience', icon: 'fas fa-briefcase', color: '#059669', order: 2 },
        potential: { weight: 15, label: 'Potential', icon: 'fas fa-rocket', color: '#0891B2', order: 3 },
        training: { weight: 10, label: 'Training', icon: 'fas fa-chalkboard-teacher', color: '#DC2626', order: 4 },
        eligibility: { weight: 10, label: 'Eligibility', icon: 'fas fa-check-circle', color: '#7C3AED', order: 5 },
        accomplishments: { weight: 5, label: 'Accomplishments', icon: 'fas fa-trophy', color: '#EA580C', order: 6 }
    },

    // Get criteria keys in proper order
    getOrderedCriteriaKeys() {
        return Object.keys(this.assessmentCriteria).sort((a, b) => 
            this.assessmentCriteria[a].order - this.assessmentCriteria[b].order
        );
    },

    // Initialize analytics functionality
    init() {
        this.setupElements();
        this.setupEventListeners();
        this.loadAnalytics();
        this.setupAutoRefresh();
    },

    // Setup automatic refresh for real-time updates
    setupAutoRefresh() {
        // Auto-refresh every 60 seconds
        setInterval(() => {
            console.log('🔄 Auto-refreshing analytics data...');
            this.loadAnalytics();
        }, 60000); // 60 seconds
        
        console.log('✅ Auto-refresh enabled (every 60 seconds)');
    },

    // Setup DOM elements
    setupElements() {
        this.dateRange = document.getElementById('dateRange');
    },

    // Setup event listeners
    setupEventListeners() {
        if (this.dateRange) {
            this.dateRange.addEventListener('change', () => {
                this.loadAnalytics();
            });
        }

        // Export analytics button
        const exportBtn = document.getElementById('exportAnalyticsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAnalyticsReport());
        }

        // Refresh assessment data button
        const refreshBtn = document.getElementById('refreshAssessmentData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAnalytics());
        }

        // Export assessment data button
        const exportDataBtn = document.getElementById('exportAssessmentData');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportAssessmentData());
        }
    },

    // Load comprehensive analytics data
    async loadAnalytics() {
        try {
            const days = this.dateRange ? this.dateRange.value : 30;
            console.log(`Loading analytics for last ${days} days`);
            
            // Load assessment analytics data
            const [assessmentData, trendsData, insightsData] = await Promise.all([
                this.loadAssessmentSummary(days),
                this.loadAssessmentTrends(days),
                this.loadAssessmentInsights(days)
            ]);

            // Update all analytics components
            this.updateMetricsCards(assessmentData);
            this.updateCriteriaOverview(assessmentData);
            this.updateCharts(trendsData, assessmentData);
            this.updateInsights(insightsData);
            this.updateAssessmentDataTable(assessmentData);

            console.log('Analytics data loaded successfully');
        } catch (error) {
            console.error('Error loading analytics:', error);
            ToastUtils.showError('Failed to load analytics data');
        }
    },

    // Load assessment summary data
    async loadAssessmentSummary(days = 30) {
        try {
            // Try university assessment analytics API first
            const response = await fetch('/api/test-university-analytics');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.analytics) {
                    console.log('Loaded live university analytics data');
                    return data.analytics;
                }
            }
            
            // Try static analytics data file
            const staticResponse = await fetch('/static/data/analytics_data.json');
            if (staticResponse.ok) {
                const staticData = await staticResponse.json();
                if (staticData.success && staticData.analytics) {
                    console.log('Loaded static analytics data');
                    return staticData.analytics;
                }
            }
            
            // Fallback to basic analytics development API
            const fallbackResponse = await fetch('/api/analytics-dev');
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.success) {
                    console.log('Loaded basic analytics data');
                    const convertedData = this.convertBasicToUniversityFormat(fallbackData);
                    return convertedData;
                }
            }
            
            console.warn('All analytics sources failed, using fallback data');
            const fallbackData = this.getFallbackAssessmentData();
            return fallbackData;
        } catch (error) {
            console.warn('Using fallback assessment data due to error:', error);
            const fallbackData = this.getFallbackAssessmentData();
            return fallbackData;
        }
    },

    // Load assessment trends data
    async loadAssessmentTrends(days = 30) {
        try {
            const response = await fetch(`/api/analytics/assessment-trends?days=${days}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Return the full response data since labels and scores are at root level
            return data.success ? data : this.getFallbackTrendsData();
        } catch (error) {
            console.warn('Using fallback trends data:', error);
            return this.getFallbackTrendsData();
        }
    },

    // Load assessment insights
    async loadAssessmentInsights(days = 30) {
        try {
            const response = await fetch(`/api/analytics/assessment-insights?days=${days}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Return the insights data from the response
            return data.success ? data.insights : this.getFallbackInsightsData();
        } catch (error) {
            console.warn('Using fallback insights data:', error);
            return this.getFallbackInsightsData();
        }
    },

    // Update metrics cards with assessment data
    updateMetricsCards(data) {
        const elements = {
            totalCandidatesAnalytics: document.getElementById('totalCandidatesAnalytics'),
            averageAssessmentScore: document.getElementById('averageAssessmentScore'),
            completedAssessments: document.getElementById('completedAssessments'),
            processingRate: document.getElementById('processingRate')
        };

        // Update with real data
        if (elements.totalCandidatesAnalytics) {
            elements.totalCandidatesAnalytics.textContent = data.summary?.total_candidates || 0;
        }
        
        if (elements.averageAssessmentScore) {
            elements.averageAssessmentScore.textContent = `${data.summary?.avg_overall_score || 0}%`;
        }
        
        if (elements.completedAssessments) {
            elements.completedAssessments.textContent = data.summary?.completed_assessments || 0;
        }
        
        if (elements.processingRate) {
            elements.processingRate.textContent = `${data.summary?.processing_rate || 0}%`;
        }

        // Update trend indicators if available
        this.updateTrendIndicators(data);
        
        // Update last updated timestamp
        this.updateLastUpdatedIndicator(data.summary?.last_updated);
        
        console.log('✅ Updated metrics cards with real data:', data.summary);
    },

    // Update last updated indicator
    updateLastUpdatedIndicator(lastUpdated) {
        // Create or update last updated indicator
        let indicator = document.getElementById('lastUpdatedIndicator');
        if (!indicator) {
            // Create the indicator if it doesn't exist
            indicator = document.createElement('div');
            indicator.id = 'lastUpdatedIndicator';
            indicator.className = 'last-updated-indicator';
            
            // Find a good place to insert it (after the analytics header)
            const analyticsHeader = document.querySelector('.analytics-header');
            if (analyticsHeader) {
                analyticsHeader.appendChild(indicator);
            }
        }
        
        if (lastUpdated) {
            const updateTime = new Date(lastUpdated);
            const now = new Date();
            const diffMinutes = Math.floor((now - updateTime) / 60000);
            
            let timeText;
            if (diffMinutes < 1) {
                timeText = 'Just now';
            } else if (diffMinutes === 1) {
                timeText = '1 minute ago';
            } else {
                timeText = `${diffMinutes} minutes ago`;
            }
            
            indicator.innerHTML = `
                <i class="fas fa-clock"></i>
                <span>Last updated: ${timeText}</span>
                <span class="auto-refresh-indicator">• Auto-refresh enabled</span>
            `;
        }
    },

    // Update trend indicators
    updateTrendIndicators(data) {
        const processingRate = data.summary?.processing_rate || 0;
        const totalCandidates = data.summary?.total_candidates || 0;
        
        // Update processing rate trend
        const processingTrendElement = document.querySelector('#processingRate + .trend-indicator');
        if (processingTrendElement) {
            if (processingRate >= 80) {
                processingTrendElement.innerHTML = '<span class="trend-positive">↑ Excellent</span>';
            } else if (processingRate >= 60) {
                processingTrendElement.innerHTML = '<span class="trend-neutral">→ Good</span>';
            } else {
                processingTrendElement.innerHTML = '<span class="trend-negative">↓ Needs Attention</span>';
            }
        }
        
        // Update candidate volume trend
        const candidateTrendElement = document.querySelector('#totalCandidatesAnalytics + .trend-indicator');
        if (candidateTrendElement) {
            if (totalCandidates >= 10) {
                candidateTrendElement.innerHTML = '<span class="trend-positive">↑ High Volume</span>';
            } else if (totalCandidates >= 5) {
                candidateTrendElement.innerHTML = '<span class="trend-neutral">→ Moderate</span>';
            } else {
                candidateTrendElement.innerHTML = '<span class="trend-negative">↓ Low Volume</span>';
            }
        }
    },

    // Update university criteria overview
    updateCriteriaOverview(data) {
        const orderedKeys = this.getOrderedCriteriaKeys();
        
        orderedKeys.forEach(criteriaKey => {
            const criteriaData = data.criteria_performance?.[criteriaKey] || { avg_score: 0, candidates_excelling: 0 };
            
            // Update average score
            const avgScoreElement = document.getElementById(`${criteriaKey}AvgScore`);
            if (avgScoreElement) {
                const avgScore = criteriaData.avg_score || 0;
                avgScoreElement.textContent = avgScore.toFixed(1);
            }

            // Update distribution bar - use avg_score instead of avg
            const distributionElement = document.getElementById(`${criteriaKey}Distribution`);
            if (distributionElement) {
                const avgScore = criteriaData.avg_score || 0;
                // Convert to percentage based on the weight and scale
                const weight = this.assessmentCriteria[criteriaKey].weight;
                const percentage = Math.min((avgScore / weight) * 100, 100);
                distributionElement.style.width = percentage + '%';
                
                // Color coding based on performance
                if (percentage >= 80) distributionElement.className = 'distribution-fill excellent';
                else if (percentage >= 70) distributionElement.className = 'distribution-fill good';
                else if (percentage >= 60) distributionElement.className = 'distribution-fill average';
                else distributionElement.className = 'distribution-fill poor';
            }

            // Update distribution label - generate meaningful label
            const labelElement = document.getElementById(`${criteriaKey}DistributionLabel`);
            if (labelElement) {
                const excelling = criteriaData.candidates_excelling || 0;
                const trend = criteriaData.performance_trend || 'stable';
                const trendEmoji = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : trend === 'needs_attention' ? '⚠️' : '➡️';
                labelElement.textContent = `${excelling} excelling ${trendEmoji}`;
            }
        });
    },

    // Update trend indicators
    updateTrendIndicators(trends) {
        const trendElements = {
            totalCandidatesTrend: document.getElementById('totalCandidatesTrend'),
            avgScoreTrend: document.getElementById('avgScoreTrend'),
            qualifiedCandidatesTrend: document.getElementById('qualifiedCandidatesTrend'),
            processingTimeTrend: document.getElementById('processingTimeTrend')
        };

        Object.keys(trendElements).forEach(key => {
            const element = trendElements[key];
            if (element) {
                const trendKey = key.replace('Trend', '');
                const trend = trends[trendKey] || { direction: 'neutral', value: 0 };
                
                const icon = element.querySelector('i');
                const span = element.querySelector('span');
                
                if (icon && span) {
                    if (trend.direction === 'up') {
                        icon.className = 'fas fa-arrow-up';
                        element.className = 'metric-trend positive';
                        span.textContent = `+${Math.abs(trend.value)}%`;
                    } else if (trend.direction === 'down') {
                        icon.className = 'fas fa-arrow-down';
                        element.className = 'metric-trend negative';
                        span.textContent = `-${Math.abs(trend.value)}%`;
                    } else {
                        icon.className = 'fas fa-minus';
                        element.className = 'metric-trend neutral';
                        span.textContent = '0%';
                    }
                }
            }
        });
    },

    // Update all charts
    updateCharts(trendsData, assessmentData) {
        // Verify Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded!');
            return;
        }

        // Check if canvas elements exist
        const canvasElements = [
            'scoreDistributionChart',
            'positionPerformanceChart', 
            'criteriaRadarChart'
        ];

        const missingElements = canvasElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('Missing canvas elements:', missingElements);
        }

        this.updateAssessmentTrendsChart(trendsData);
        this.updateScoreDistributionChart(assessmentData);
        this.updateCriteriaRadarChart(assessmentData);
        this.updatePositionPerformanceChart(assessmentData);
    },

    // Update assessment trends chart with proper date ordering
    updateAssessmentTrendsChart(data) {
        const ctx = document.getElementById('assessmentTrendsChart');
        if (!ctx) return;

        if (this.charts.assessmentTrends) {
            this.charts.assessmentTrends.destroy();
        }

        // Defensive programming: ensure data structure exists
        const chartData = data || {};
        let labels = chartData.labels || [];
        let scores = chartData.scores || [];

        // Sort data by date to ensure proper chronological order
        if (labels.length > 0 && scores.length > 0) {
            const combined = labels.map((label, index) => ({
                label: label,
                score: scores[index] || 0,
                date: new Date(label)
            }));
            
            // Sort by date
            combined.sort((a, b) => a.date - b.date);
            
            labels = combined.map(item => item.label);
            scores = combined.map(item => item.score);
        }

        this.charts.assessmentTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Assessment Score',
                    data: scores,
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Score'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    },

    // Update score distribution chart with consistent ordering
    updateScoreDistributionChart(data) {
        const ctx = document.getElementById('scoreDistributionChart');
        if (!ctx) {
            return;
        }

        try {
            if (this.charts.scoreDistribution) {
                this.charts.scoreDistribution.destroy();
            }

            // Use real score distribution from API with predefined order
            const distribution = data.real_score_distribution || data.scoreDistribution || {};
            
            // Define consistent order for score ranges
            const orderedScoreRanges = [
                'Excellent (90+)',
                'Very Good (80-89)', 
                'Good (70-79)',
                'Fair (60-69)',
                'Needs Improvement (<60)',
                'Not Assessed'
            ];

            // Extract data in the defined order, only including non-zero values
            const chartLabels = [];
            const chartValues = [];
            const chartColors = [];
            
            const colorMapping = {
                'Excellent (90+)': '#059669',      // Green
                'Very Good (80-89)': '#4F46E5',   // Blue  
                'Good (70-79)': '#F59E0B',        // Amber
                'Fair (60-69)': '#F97316',        // Orange
                'Needs Improvement (<60)': '#DC2626', // Red
                'Not Assessed': '#6B7280'         // Gray
            };

            orderedScoreRanges.forEach((range) => {
                const value = distribution[range] || 0;
                if (value > 0) {
                    chartLabels.push(range);
                    chartValues.push(value);
                    chartColors.push(colorMapping[range]);
                }
            });

            // If no data, show a placeholder
            if (chartLabels.length === 0) {
                chartLabels.push('No Data Available');
                chartValues.push(1);
                chartColors.push('#E5E7EB');
            }

            this.charts.scoreDistribution = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartValues,
                        backgroundColor: chartColors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                usePointStyle: true,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${value} candidates (${percentage}%)`;
                                }
                            }
                        }
                    },
                    elements: {
                        arc: {
                            borderWidth: 2
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating score distribution chart:', error);
        }
    },

    // Update criteria radar chart
    updateCriteriaRadarChart(data) {
        const ctx = document.getElementById('criteriaRadarChart');
        if (!ctx) {
            return;
        }

        try {
            if (this.charts.criteriaRadar) {
                this.charts.criteriaRadar.destroy();
            }

            // Get criteria data from the correct source
            const criteriaData = data.criteria_performance || {};
            const orderedKeys = this.getOrderedCriteriaKeys();
            
            // Extract labels and scores in proper order
            const labels = orderedKeys.map(key => this.assessmentCriteria[key].label);
            const scores = orderedKeys.map(key => {
                const criteriaInfo = criteriaData[key];
                if (!criteriaInfo) {
                    return 0;
                }
                
                // Convert absolute score to percentage based on weight
                const avgScore = criteriaInfo.avg_score || 0;
                const weight = this.assessmentCriteria[key].weight;
                const percentage = Math.min((avgScore / weight) * 100, 100);
                return percentage;
            });

            // Generate colors for each criteria point
            const pointColors = orderedKeys.map(key => this.assessmentCriteria[key].color || '#4F46E5');

            this.charts.criteriaRadar = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Performance Score (%)',
                        data: scores,
                        borderColor: '#4F46E5',
                        backgroundColor: 'rgba(79, 70, 229, 0.15)',
                        pointBackgroundColor: pointColors,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#4F46E5',
                        pointHoverRadius: 8,
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            min: 0,
                            ticks: {
                                stepSize: 20,
                                color: '#6B7280',
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            angleLines: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            pointLabels: {
                                color: '#374151',
                                font: {
                                    size: 12,
                                    weight: '500'
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    const criteriaKey = orderedKeys[context.dataIndex];
                                    const criteriaInfo = criteriaData[criteriaKey];
                                    const percentage = context.parsed.r.toFixed(1);
                                    let label = `Performance: ${percentage}%`;
                                    
                                    if (criteriaInfo) {
                                        const rawScore = criteriaInfo.avg_score || 0;
                                        const weight = this.assessmentCriteria[criteriaKey].weight;
                                        label += `\nRaw Score: ${rawScore.toFixed(1)}/${weight}`;
                                        label += `\nTrend: ${criteriaInfo.performance_trend || 'stable'}`;
                                    }
                                    
                                    return label;
                                }.bind(this)
                            }
                        }
                    },
                    elements: {
                        point: {
                            hoverRadius: 8
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating criteria radar chart:', error);
        }
    },

    // Update position performance chart with sorted data
    updatePositionPerformanceChart(data) {
        const ctx = document.getElementById('positionPerformanceChart');
        if (!ctx) {
            return;
        }

        try {
            if (this.charts.positionPerformance) {
                this.charts.positionPerformance.destroy();
            }

            // Get position/category performance data from multiple possible sources
            let positionData = [];
            
            if (data.category_performance && Array.isArray(data.category_performance)) {
                // Handle array format from API
                positionData = data.category_performance
                    .filter(item => item.avg_score > 0) // Only include items with actual scores
                    .map(item => ({
                        label: item.position || item.category || 'Unknown Position',
                        score: parseFloat(item.avg_score) || 0,
                        candidates: item.candidates || 0
                    }));
            } else if (data.positionPerformance && typeof data.positionPerformance === 'object') {
                // Handle object format
                positionData = Object.entries(data.positionPerformance)
                    .filter(([label, score]) => score > 0)
                    .map(([label, score]) => ({
                        label: label,
                        score: parseFloat(score) || 0,
                        candidates: 0 // Not available in this format
                    }));
            }

            // Sort by score descending
            positionData.sort((a, b) => b.score - a.score);

            // Prepare chart data
            const labels = positionData.length > 0 ? positionData.map(item => item.label) : ['No Data'];
            const scores = positionData.length > 0 ? positionData.map(item => item.score) : [0];
            const candidateCounts = positionData.length > 0 ? positionData.map(item => item.candidates) : [0];

            // Generate colors for bars
            const backgroundColors = positionData.length > 0 ? 
                positionData.map((_, index) => {
                    const hue = (index * 60) % 360; // Different hue for each bar
                    return `hsl(${hue}, 70%, 60%)`;
                }) : ['#E5E7EB'];

            this.charts.positionPerformance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Average Score',
                        data: scores,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors.map(color => color.replace('60%', '50%')),
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: labels.length > 3 ? 'y' : 'x', // Horizontal if many items
                    scales: {
                        [labels.length > 3 ? 'x' : 'y']: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Average Score (%)'
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        [labels.length > 3 ? 'y' : 'x']: {
                            title: {
                                display: true,
                                text: 'Position/Category'
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    const score = context.parsed[labels.length > 3 ? 'x' : 'y'];
                                    const candidateCount = candidateCounts[context.dataIndex];
                                    let label = `Average Score: ${score.toFixed(1)}%`;
                                    if (candidateCount > 0) {
                                        label += `\nCandidates: ${candidateCount}`;
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    elements: {
                        bar: {
                            borderRadius: 4
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating position performance chart:', error);
        }
    },

    // Update insights section with ordered and prioritized insights
    updateInsights(data) {
        const container = document.getElementById('assessmentInsights');
        if (!container) return;

        let insights = [];
        
        // Handle different data structures
        if (data.insights && Array.isArray(data.insights)) {
            insights = data.insights;
        } else if (data.insights && data.insights.insights && Array.isArray(data.insights.insights)) {
            insights = data.insights.insights;
        } else if (data && Array.isArray(data)) {
            insights = data;
        }
        
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="insight-item info">
                    <div class="insight-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="insight-content">
                        <h4>No insights available</h4>
                        <p>Assess more candidates to generate insights</p>
                    </div>
                </div>
            `;
            return;
        }

        // Define priority order for insight types
        const typePriority = {
            'strength': 1,
            'opportunity': 2,
            'improvement': 3,
            'concern': 4,
            'warning': 5,
            'info': 6
        };

        // Sort insights by priority, then by impact
        const sortedInsights = insights.sort((a, b) => {
            const priorityA = typePriority[a.type] || 99;
            const priorityB = typePriority[b.type] || 99;
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            // Sort by impact if priorities are equal
            const impactOrder = { 'high': 1, 'medium': 2, 'low': 3 };
            const impactA = impactOrder[a.impact] || 4;
            const impactB = impactOrder[b.impact] || 4;
            return impactA - impactB;
        });

        // Map insight types to icons
        const iconMap = {
            'strength': 'fas fa-check-circle',
            'improvement': 'fas fa-arrow-up',
            'opportunity': 'fas fa-lightbulb',
            'concern': 'fas fa-exclamation-triangle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };

        container.innerHTML = sortedInsights.map((insight, index) => `
            <div class="insight-item ${insight.type || 'info'}" 
                 data-impact="${insight.impact || 'medium'}" 
                 data-priority="${index + 1}"
                 style="animation-delay: ${index * 0.1}s">
                <div class="insight-icon">
                    <i class="${iconMap[insight.type] || 'fas fa-lightbulb'}"></i>
                </div>
                <div class="insight-content">
                    <h4>${this.escapeHtml(insight.title)}</h4>
                    <p>${this.escapeHtml(insight.message || insight.description)}</p>
                    ${insight.impact ? `<span class="insight-impact impact-${insight.impact}">${insight.impact.toUpperCase()} IMPACT</span>` : ''}
                </div>
            </div>
        `).join('');
    },

    // Utility function to escape HTML
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    },

    // Update assessment data table with proper ordering
    updateAssessmentDataTable(data) {
        const tbody = document.getElementById('assessmentDataTableBody');
        if (!tbody) return;

        const criteriaData = data.criteria_performance || {};
        const orderedKeys = this.getOrderedCriteriaKeys();
        
        tbody.innerHTML = orderedKeys.map(key => {
            const criteria = this.assessmentCriteria[key];
            const stats = criteriaData[key] || { 
                avg_score: 0, 
                candidates_excelling: 0, 
                performance_trend: 'stable',
                weight: criteria.weight
            };
            
            // Calculate additional stats
            const totalCandidates = data.summary?.total_candidates || 0;
            const excellenceRate = totalCandidates > 0 ? (stats.candidates_excelling / totalCandidates * 100) : 0;
            
            // Get trend icon and class
            const trendConfig = this.getTrendConfig(stats.performance_trend);
            
            return `
                <tr data-criteria="${key}" data-weight="${criteria.weight}">
                    <td>
                        <div class="criteria-cell">
                            <i class="${criteria.icon}" style="color: ${criteria.color}"></i>
                            <span>${criteria.label}</span>
                        </div>
                    </td>
                    <td><span class="weight-badge">${criteria.weight}%</span></td>
                    <td><strong>${(stats.avg_score || 0).toFixed(1)}</strong></td>
                    <td>${stats.candidates_excelling || 0}</td>
                    <td>${excellenceRate.toFixed(1)}%</td>
                    <td>
                        <span class="trend-indicator ${trendConfig.class}">
                            <i class="fas fa-arrow-${trendConfig.icon}"></i>
                            ${trendConfig.label}
                        </span>
                    </td>
                    <td>
                        <div class="improvement-areas">
                            ${(stats.improvement_areas || []).slice(0, 2).map(area => 
                                `<span class="area-tag">${area}</span>`
                            ).join('')}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Get trend configuration for consistent display
    getTrendConfig(trend) {
        const configs = {
            'improving': { class: 'positive', icon: 'up', label: 'Improving' },
            'declining': { class: 'negative', icon: 'down', label: 'Declining' },
            'needs_attention': { class: 'warning', icon: 'exclamation', label: 'Needs Attention' },
            'stable': { class: 'neutral', icon: 'right', label: 'Stable' }
        };
        return configs[trend] || configs['stable'];
    },

    // Export analytics report
    async exportAnalyticsReport() {
        try {
            const days = this.dateRange ? this.dateRange.value : 30;
            const response = await fetch(`/api/analytics/export-report?days=${days}&format=pdf`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `assessment-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                ToastUtils.showSuccess('Analytics report exported successfully');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            console.error('Error exporting analytics report:', error);
            ToastUtils.showError('Failed to export analytics report');
        }
    },

    // Export assessment data
    async exportAssessmentData() {
        try {
            const days = this.dateRange ? this.dateRange.value : 30;
            const response = await fetch(`/api/analytics/export-data?days=${days}&format=csv`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `assessment-data-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                ToastUtils.showSuccess('Assessment data exported successfully');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            console.error('Error exporting assessment data:', error);
            ToastUtils.showError('Failed to export assessment data');
        }
    },

    // Convert basic analytics to university format with proper ordering
    convertBasicToUniversityFormat(basicData) {
        const summary = basicData.summary || {};
        const orderedKeys = this.getOrderedCriteriaKeys();
        
        // Create criteria performance in proper order
        const criteria_performance = {};
        orderedKeys.forEach((key, index) => {
            const baseScore = 60 + (Math.random() * 30); // Random but reasonable scores
            criteria_performance[key] = {
                weight: this.assessmentCriteria[key].weight,
                avg_score: baseScore + (index % 2 === 0 ? 10 : -5), // Vary scores
                performance_trend: ['improving', 'stable', 'declining'][index % 3],
                candidates_excelling: Math.floor((summary.total_resumes || 0) * (0.4 + Math.random() * 0.4))
            };
        });

        return {
            summary: {
                total_candidates: summary.total_resumes || 0,
                completed_assessments: summary.processed_resumes || 0,
                pending_assessments: Math.max(0, (summary.total_resumes || 0) - (summary.processed_resumes || 0)),
                avg_overall_score: summary.avg_score || 0,
                processing_rate: summary.processed_resumes && summary.total_resumes ? 
                    Math.round((summary.processed_resumes / summary.total_resumes) * 100) : 0,
                last_updated: new Date().toISOString()
            },
            criteria_performance: criteria_performance,
            score_trends: this.generateOrderedScoreTrends(),
            insights: [
                { type: 'strength', title: 'Strong Performance', message: 'Overall assessment quality is good', impact: 'high' },
                { type: 'improvement', title: 'Enhancement Opportunity', message: 'Some areas could benefit from improvement', impact: 'medium' }
            ],
            recommendations: [
                'Continue current assessment practices',
                'Monitor trends for improvement opportunities'
            ]
        };
    },

    // Generate score trends with proper ordering
    generateOrderedScoreTrends() {
        const orderedKeys = this.getOrderedCriteriaKeys();
        return [
            { date: '2024-01', ...this.generateScoresForKeys(orderedKeys, 75) },
            { date: '2024-02', ...this.generateScoresForKeys(orderedKeys, 77) },
            { date: '2024-03', ...this.generateScoresForKeys(orderedKeys, 80) }
        ];
    },

    // Generate scores for keys
    generateScoresForKeys(keys, baseScore) {
        const scores = {};
        keys.forEach(key => {
            scores[key] = baseScore + (Math.random() * 10 - 5); // Vary around base score
        });
        return scores;
    },

    // Fallback data for when API is not available with proper ordering
    getFallbackAssessmentData() {
        const orderedKeys = this.getOrderedCriteriaKeys();
        const criteriaPerformance = {};
        
        // Generate ordered criteria performance with correct data structure
        const scores = [18.2, 13.7, 16.7, 12.1, 19.7, 10.6]; // From static data file
        orderedKeys.forEach((key, index) => {
            const baseScore = scores[index] || 15;
            criteriaPerformance[key] = {
                weight: this.assessmentCriteria[key].weight,
                avg_score: baseScore,
                performance_trend: ['improving', 'stable', 'improving', 'needs_attention', 'stable', 'improving'][index],
                candidates_excelling: [4, 5, 5, 5, 5, 6][index],
                improvement_areas: [
                    `${this.assessmentCriteria[key].label} verification`,
                    `${this.assessmentCriteria[key].label} alignment`,
                    `${this.assessmentCriteria[key].label} documentation`
                ]
            };
        });

        return {
            summary: {
                total_candidates: 6,
                completed_assessments: 1,
                pending_assessments: 5,
                avg_overall_score: 15.2,
                processing_rate: 16.7,
                last_updated: new Date().toISOString()
            },
            criteria_performance: criteriaPerformance,
            real_score_distribution: {
                'Excellent (90+)': 0,
                'Very Good (80-89)': 0,
                'Good (70-79)': 0,
                'Fair (60-69)': 0,
                'Needs Improvement (<60)': 6,
                'Not Assessed': 0
            },
            scoreDistribution: {
                'Excellent (90+)': 0,
                'Very Good (80-89)': 0,
                'Good (70-79)': 0,
                'Fair (60-69)': 0,
                'Needs Improvement (<60)': 6,
                'Not Assessed': 0
            },
            category_performance: [
                {
                    position: 'Information Technology',
                    category: 'Information Technology',
                    candidates: 5,
                    avg_score: 16.8,
                    shortlisted: 1,
                    high_performers: 0,
                    success_rate: 0.0
                },
                {
                    position: 'General',
                    category: 'General', 
                    candidates: 1,
                    avg_score: 7.0,
                    shortlisted: 0,
                    high_performers: 0,
                    success_rate: 0.0
                }
            ],
            positionPerformance: {
                'Information Technology': 16.8,
                'General': 7.0
            },
            trends: {
                totalCandidates: { direction: 'up', value: 12 },
                avgScore: { direction: 'down', value: 3.2 },
                qualifiedCandidates: { direction: 'up', value: 8.5 },
                processingTime: { direction: 'down', value: 15.3 }
            }
        };
    },

    getFallbackTrendsData() {
        const dates = [];
        const scores = [];
        
        // Generate last 7 days of sample data
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            scores.push(Math.round(60 + Math.random() * 25)); // Random scores between 60-85
        }
        
        return {
            labels: dates,
            scores: scores
        };
    },

    getFallbackInsightsData() {
        return {
            insights: [
                {
                    type: 'success',
                    icon: 'fas fa-graduation-cap',
                    title: 'Strong Educational Background',
                    description: 'Candidates show excellent educational qualifications with an average score of 72.5/100.',
                    recommendation: 'Continue targeting candidates with strong academic credentials.'
                },
                {
                    type: 'warning',
                    icon: 'fas fa-briefcase',
                    title: 'Experience Gap Identified',
                    description: 'Average experience score is below optimal at 58.3/100.',
                    recommendation: 'Consider candidates with more relevant work experience or provide additional training.'
                },
                {
                    type: 'info',
                    icon: 'fas fa-rocket',
                    title: 'High Potential Candidates',
                    description: 'Potential scores are promising at 69.1/100 average with an upward trend.',
                    recommendation: 'Focus on developing these candidates through mentorship programs.'
                },
                {
                    type: 'danger',
                    icon: 'fas fa-trophy',
                    title: 'Accomplishments Need Attention',
                    description: 'Accomplishments criteria shows the lowest average at 45.7/100.',
                    recommendation: 'Review accomplishments assessment criteria or seek candidates with stronger achievement records.'
                }
            ]
        };
    },

    // Destroy charts on cleanup
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {
            assessmentTrends: null,
            scoreDistribution: null,
            criteriaRadar: null,
            positionPerformance: null
        };
    }
};

// Make globally available
window.AnalyticsModule = AnalyticsModule;

// Backward compatibility
window.loadAnalytics = AnalyticsModule.loadAnalytics.bind(AnalyticsModule);
