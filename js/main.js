/**
 * Health Inequality Visualization - Main JavaScript
 * D3.js Implementation of Deviation Map
 */

// Global state
const state = {
    viewMode: 'deviation',
    selectedMetric: 'life_expectancy',
    performanceFilter: 'all',
    countiesData: null,
    predictionsData: null,
    metricsData: null,
    topoData: null,
    currentCountySelection: null
};

// Configuration
const config = {
    width: 1200,
    height: 700,
    deviationThresholds: {
        overperforming: 1.0,
        underperforming: -1.0
    },
    colorScales: {
        deviation: {
            domain: [-8, -4, 0, 4, 8],
            range: ['#c51b7d', '#e9a3c9', '#fef3c7', '#a1d76a', '#1b7837']
        }
    },
    dataUrls: {
        counties: 'data/counties_data.json',
        predictions: 'data/predictions.json',
        metrics: 'data/metrics_info.json',
        topology: 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json'
    }
};

// Initialize visualization on page load
document.addEventListener('DOMContentLoaded', init);

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing Health Inequality Visualization...');
    
    try {
        // Load all data
        await loadAllData();
        
        // Set up event listeners
        setupEventListeners();
        
        // Render initial visualization
        renderVisualization();
        
        // Update model info
        updateModelInfo();
        
        // Update statistics dashboard
        updateStatsDashboard();
        
        console.log('Initialization complete!');
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to load data. Please check data files.');
    }
}

/**
 * Load all required data files
 */
async function loadAllData() {
    console.log('Loading data files...');
    
    const loading = document.querySelector('#map-container');
    loading.classList.add('loading');
    
    try {
        // Load data in parallel
        const [countiesData, predictionsData, metricsData, topoData] = await Promise.all([
            d3.json(config.dataUrls.counties),
            d3.json(config.dataUrls.predictions),
            d3.json(config.dataUrls.metrics),
            d3.json(config.dataUrls.topology)
        ]);
        
        // Store in global state
        state.countiesData = countiesData;
        state.predictionsData = predictionsData;
        state.metricsData = metricsData;
        state.topoData = topoData;
        
        console.log(`Loaded ${countiesData.length} counties`);
        console.log(`Model R² score: ${predictionsData.r2_score.toFixed(3)}`);
        
    } catch (error) {
        throw new Error(`Data loading failed: ${error.message}`);
    } finally {
        loading.classList.remove('loading');
    }
}

/**
 * Set up event listeners for interactive elements
 */
function setupEventListeners() {
    // View mode selector
    d3.select('#view-mode').on('change', function() {
        state.viewMode = this.value;
        toggleViewMode();
        renderVisualization();
    });
    
    // Metric selector
    d3.select('#metric-selector').on('change', function() {
        state.selectedMetric = this.value;
        renderVisualization();
    });
    
    // Performance filter
    d3.select('#performance-filter').on('change', function() {
        state.performanceFilter = this.value;
        applyPerformanceFilter();
    });
    
    // Info button
    d3.select('#info-btn').on('click', () => {
        showInfoModal();
    });
    
    // Modal close buttons
    d3.select('#modal-close').on('click', () => {
        hideModal('#county-modal');
    });
    
    d3.select('#info-modal-close').on('click', () => {
        hideModal('#info-modal');
    });
    
    // Close modals on background click
    d3.selectAll('.modal').on('click', function(event) {
        if (event.target === this) {
            hideModal(`#${this.id}`);
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideModal('#county-modal');
            hideModal('#info-modal');
        }
    });
}

/**
 * Toggle between deviation and metric view modes
 */
function toggleViewMode() {
    const metricSelectorGroup = document.getElementById('metric-selector-group');
    const filterGroup = document.getElementById('filter-group');
    const deviationLegend = document.getElementById('legend-deviation');
    const metricLegend = document.getElementById('legend-metric');
    
    if (state.viewMode === 'deviation') {
        metricSelectorGroup.style.display = 'none';
        filterGroup.style.display = 'flex';
        deviationLegend.style.display = 'block';
        metricLegend.style.display = 'none';
    } else {
        metricSelectorGroup.style.display = 'flex';
        filterGroup.style.display = 'none';
        deviationLegend.style.display = 'none';
        metricLegend.style.display = 'block';
    }
}

/**
 * Render the main visualization
 */
function renderVisualization() {
    console.log(`Rendering ${state.viewMode} view...`);
    
    const svg = d3.select('#map-svg');
    svg.selectAll('*').remove(); // Clear previous render
    
    // Set up dimensions
    const width = config.width;
    const height = config.height;
    
    // Set up projection
    const projection = d3.geoAlbersUsa()
        .scale(1300)
        .translate([width / 2, height / 2]);
    
    const path = d3.geoPath().projection(projection);
    
    // Convert TopoJSON to GeoJSON
    const counties = topojson.feature(state.topoData, state.topoData.objects.counties);
    const states = topojson.mesh(state.topoData, state.topoData.objects.states, (a, b) => a !== b);
    
    // Create lookup map for county data
    const dataMap = new Map(state.countiesData.map(d => [d.fips, d]));
    
    // Determine color scale based on view mode
    let colorScale;
    if (state.viewMode === 'deviation') {
        colorScale = d3.scaleLinear()
            .domain(config.colorScales.deviation.domain)
            .range(config.colorScales.deviation.range)
            .clamp(true);
    } else {
        colorScale = createMetricColorScale(state.selectedMetric);
        updateMetricLegend(state.selectedMetric, colorScale);
    }
    
    // Render counties
    svg.append('g')
        .attr('class', 'counties')
        .selectAll('path')
        .data(counties.features)
        .join('path')
        .attr('class', d => {
            const countyData = dataMap.get(d.id);
            let classes = 'county';
            
            if (countyData && state.viewMode === 'deviation') {
                const residual = countyData.prediction.residual;
                if (residual > 4) classes += ' extreme-over';
                else if (residual < -4) classes += ' extreme-under';
            }
            
            return classes;
        })
        .attr('d', path)
        .attr('fill', d => {
            const fips = d.id;
            const countyData = dataMap.get(fips);
            
            if (!countyData) return '#e0e0e0'; // Missing data
            
            if (state.viewMode === 'deviation') {
                return colorScale(countyData.prediction.residual);
            } else {
                const value = countyData.metrics[state.selectedMetric];
                return value != null ? colorScale(value) : '#e0e0e0';
            }
        })
        .attr('data-fips', d => d.id)
        .attr('data-performance', d => {
            const countyData = dataMap.get(d.id);
            return countyData ? countyData.prediction.performance : 'unknown';
        })
        .on('mouseover', function(event, d) {
            const countyData = dataMap.get(d.id);
            if (countyData) {
                showTooltip(event, countyData);
                moveTooltip(event);
            }
        })
        .on('mousemove', function(event) {
      //      moveTooltip(event);
        })
        .on('mouseout', function() {
            hideTooltip();
        })
        .on('click', function(event, d) {
            console.log('County clicked:', d.id);
            const countyData = dataMap.get(d.id);
            if (countyData) {
                console.log('County data found, showing modal');
                showCountyModal(countyData);
            } else {
                console.log('No county data found for FIPS:', d.id);
            }
        });
    
    // Render state borders
    svg.append('path')
        .datum(states)
        .attr('class', 'state-border')
        .attr('d', path);
    
    // Apply initial filter
    applyPerformanceFilter();
}

/**
 * Create color scale for a specific metric
 */
function createMetricColorScale(metricKey) {
    const values = state.countiesData
        .map(d => d.metrics[metricKey])
        .filter(v => v != null);
    
    const extent = d3.extent(values);
    
    // Choose color scheme based on metric type
    let colorRange;
    if (metricKey === 'life_expectancy' || metricKey === 'median_income' || 
        metricKey === 'high_school_grad' || metricKey === 'primary_care_rate') {
        // Higher is better
        colorRange = ['#fee5d9', '#fc9272', '#de2d26'];
    } else {
        // Lower is better (reverse)
        colorRange = ['#de2d26', '#fc9272', '#fee5d9'];
    }
    
    return d3.scaleSequential()
        .domain(extent)
        .interpolator(d3.interpolateRgbBasis(colorRange));
}

/**
 * Update metric legend
 */
function updateMetricLegend(metricKey, colorScale) {
    const metricInfo = state.metricsData[metricKey];
    const values = state.countiesData
        .map(d => d.metrics[metricKey])
        .filter(v => v != null);
    
    const extent = d3.extent(values);
    
    document.getElementById('metric-legend-title').textContent = metricInfo.name;
    document.getElementById('metric-min').textContent = formatValue(extent[0], metricInfo);
    document.getElementById('metric-max').textContent = formatValue(extent[1], metricInfo);
    
    // Update gradient
    const gradient = document.getElementById('metric-gradient');
    const steps = 100;
    const gradientStops = [];
    
    for (let i = 0; i <= steps; i++) {
        const value = extent[0] + (extent[1] - extent[0]) * (i / steps);
        const color = colorScale(value);
        gradientStops.push(`${color} ${i}%`);
    }
    
    gradient.style.background = `linear-gradient(to right, ${gradientStops.join(', ')})`;
}

/**
 * Apply performance filter to map
 */
function applyPerformanceFilter() {
    const counties = d3.selectAll('.county');
    
    if (state.performanceFilter === 'all') {
        counties.classed('filtered', false);
    } else {
        counties.classed('filtered', function() {
            const performance = d3.select(this).attr('data-performance');
            return performance !== state.performanceFilter;
        });
    }
}

/**
 * Show tooltip on hover
 */
function showTooltip(event, countyData) {
    const tooltip = d3.select('#tooltip');
    
    let content = `<strong>${countyData.name}</strong>`;
    
    if (state.viewMode === 'deviation') {
        const actual = countyData.prediction.actual;
        const predicted = countyData.prediction.predicted;
        const residual = countyData.prediction.residual;
        const sign = residual >= 0 ? '+' : '';
        
        content += `
            <div class="tooltip-row">
                <span class="tooltip-label">Actual Life Expectancy:</span>
                <span class="tooltip-value">${actual.toFixed(1)} years</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Predicted:</span>
                <span class="tooltip-value">${predicted.toFixed(1)} years</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Deviation:</span>
                <span class="tooltip-value">${sign}${residual.toFixed(1)} years</span>
            </div>
        `;
    } else {
        const metricInfo = state.metricsData[state.selectedMetric];
        const value = countyData.metrics[state.selectedMetric];
        
        content += `
            <div class="tooltip-row">
                <span class="tooltip-label">${metricInfo.name}:</span>
                <span class="tooltip-value">${formatValue(value, metricInfo)}</span>
            </div>
        `;
    }
    
    tooltip
        .html(content)
        .style('opacity', 1);
    
    moveTooltip(event);
}

/**
 * Move tooltip with cursor
 */
let lastTooltipMove = 0;

function moveTooltip(event) {
    const tooltip = d3.select('#tooltip');
    if (tooltip.style('opacity') === '0') return;
    
    const now = Date.now();
    if (now - lastTooltipMove < 32) {
        return;
    }
    lastTooltipMove = now;
    
    const tooltip = d3.select('#tooltip');
    tooltip
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px');
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    d3.select('#tooltip').style('opacity', 0);
}

/**
 * Show detailed county modal
 */
function showCountyModal(countyData) {
    console.log('showCountyModal called with:', countyData.county, countyData.state);
    state.currentCountySelection = countyData;
    
    // Update modal header
    document.getElementById('modal-county-name').textContent = countyData.county;
    document.getElementById('modal-county-state').textContent = countyData.state;
    
    // Update prediction comparison with animated bars
    const actual = countyData.prediction.actual;
    const predicted = countyData.prediction.predicted;
    const residual = countyData.prediction.residual;
    
    document.getElementById('actual-life-exp').textContent = `${actual.toFixed(1)} years`;
    document.getElementById('predicted-life-exp').textContent = `${predicted.toFixed(1)} years`;
    
    const deviationValue = document.getElementById('deviation-value');
    const sign = residual >= 0 ? '+' : '';
    deviationValue.textContent = `${sign}${residual.toFixed(2)} years`;
    
    const deviationStat = deviationValue.closest('.deviation-stat');
    deviationStat.classList.remove('positive', 'negative');
    if (residual > 0) {
        deviationStat.classList.add('positive');
    } else if (residual < 0) {
        deviationStat.classList.add('negative');
    }
    
    // Create animated prediction bars
    const predictionBar = document.getElementById('prediction-bar');
    const minLife = 65;
    const maxLife = 90;
    const range = maxLife - minLife;
    
    const predictedPercent = ((predicted - minLife) / range) * 100;
    const actualPercent = ((actual - minLife) / range) * 100;
    
    predictionBar.innerHTML = `
        <div style="position: relative; width: 100%; height: 60px;">
            <div style="position: absolute; left: 0; top: 0; width: 100%; height: 30px; background: #e5e7eb; border-radius: 15px; overflow: hidden;">
                <div class="prediction-bar-fill predicted" style="width: 5%; height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); position: relative; transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${predictedPercent}%">
                    <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: white; font-weight: 600; font-size: 0.85rem; white-space: nowrap;">Predicted</span>
                </div>
            </div>
            <div style="position: absolute; left: 0; top: 35px; width: 100%; height: 30px; background: #e5e7eb; border-radius: 15px; overflow: hidden;">
                <div class="prediction-bar-fill actual" style="width: 5%; height: 100%; background: ${residual > 0 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #dc2626)'}; position: relative; transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${actualPercent}%">
                    <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: white; font-weight: 600; font-size: 0.85rem; white-space: nowrap;">Actual</span>
                </div>
            </div>
        </div>
    `;
    
    // Animate bars using requestAnimationFrame for better reliability
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.querySelectorAll('.prediction-bar-fill').forEach(bar => {
                const targetWidth = bar.getAttribute('data-width');
                bar.style.width = targetWidth;
            });
        });
    });
    
    // Explanation
    const explanation = document.getElementById('deviation-explanation');
    if (residual > 1) {
        explanation.textContent = `This county's residents live ${residual.toFixed(1)} years longer than predicted based on socioeconomic factors. This suggests effective local health policies, strong community support, or other protective factors.`;
    } else if (residual < -1) {
        explanation.textContent = `This county's residents live ${Math.abs(residual).toFixed(1)} years shorter than predicted. Despite its socioeconomic profile, local health challenges may include environmental factors, healthcare access barriers, or health behavior patterns.`;
    } else {
        explanation.textContent = `This county's life expectancy closely matches predictions based on socioeconomic factors. Health outcomes align with what we'd expect given income, education, and health behaviors.`;
    }
    
    // Render metrics grid
    renderMetricsGrid(countyData);
    
    // Render contributing factors
    renderContributingFactors(countyData);
    
    // Show modal
    document.getElementById('county-modal').style.display = 'block';
}

/**
 * Render metrics grid in modal with animated bars
 */
function renderMetricsGrid(countyData) {
    const grid = document.getElementById('metrics-grid');
    grid.innerHTML = '';
    
    // Calculate national averages for comparison
    const nationalAverages = {};
    for (const key of Object.keys(state.metricsData)) {
        const values = state.countiesData
            .map(d => d.metrics[key])
            .filter(v => v != null);
        nationalAverages[key] = d3.mean(values);
    }
    
    for (const [key, metricInfo] of Object.entries(state.metricsData)) {
        const value = countyData.metrics[key];
        
        if (value != null) {
            const card = document.createElement('div');
            card.className = 'metric-card';
            
            const avg = nationalAverages[key];
            const percentDiff = ((value - avg) / avg * 100).toFixed(1);
            const isAbove = value > avg;
            const isBetter = (key === 'life_expectancy' || key === 'median_income' || 
                            key === 'high_school_grad' || key === 'primary_care_rate') ? isAbove : !isAbove;
            
            card.innerHTML = `
                <div class="metric-name">${metricInfo.name}</div>
                <div class="metric-value">${formatValue(value, metricInfo)}</div>
                <div class="metric-comparison ${isBetter ? 'better' : 'worse'}">
                    ${Math.abs(percentDiff)}% ${isAbove ? 'above' : 'below'} national avg
                </div>
                <div class="metric-bar-bg">
                    <div class="metric-bar ${isBetter ? 'bar-good' : 'bar-bad'}" style="width: 0%"
                         data-width="${Math.min(Math.abs(percentDiff), 100)}%"></div>
                </div>
                <div class="metric-category">${metricInfo.category}</div>
            `;
            
            grid.appendChild(card);
        }
    }
    
    // Animate bars using requestAnimationFrame for better reliability
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.querySelectorAll('.metric-bar').forEach(bar => {
                const width = bar.getAttribute('data-width');
                bar.style.width = width;
            });
        });
    });
}

/**
 * Render contributing factors analysis
 */
function renderContributingFactors(countyData) {
    const factorsList = document.getElementById('factors-list');
    factorsList.innerHTML = '';
    
    const factors = [];
    
    // Analyze metrics to identify potential contributing factors
    const income = countyData.metrics.median_income;
    const education = countyData.metrics.high_school_grad;
    const uninsured = countyData.metrics.uninsured_rate;
    const obesity = countyData.metrics.adult_obesity;
    const smoking = countyData.metrics.adult_smoking;
    const primaryCare = countyData.metrics.primary_care_rate;
    
    // Compare to national averages (approximate)
    if (income > 65000) {
        factors.push('High median household income provides economic security');
    } else if (income < 45000) {
        factors.push('Low median income may limit access to health resources');
    }
    
    if (education > 90) {
        factors.push('High educational attainment correlates with health literacy');
    } else if (education < 80) {
        factors.push('Lower educational attainment may affect health knowledge');
    }
    
    if (uninsured < 8) {
        factors.push('Low uninsured rate ensures healthcare access');
    } else if (uninsured > 15) {
        factors.push('High uninsured rate creates healthcare access barriers');
    }
    
    if (obesity < 25) {
        factors.push('Below-average obesity rate indicates healthy behaviors');
    } else if (obesity > 35) {
        factors.push('High obesity rate increases chronic disease risk');
    }
    
    if (smoking < 15) {
        factors.push('Low smoking rate reduces respiratory and cardiovascular disease');
    } else if (smoking > 20) {
        factors.push('High smoking rate increases health risks');
    }
    
    if (primaryCare > 80) {
        factors.push('Strong primary care infrastructure supports preventive care');
    } else if (primaryCare < 40) {
        factors.push('Limited primary care access may delay diagnosis and treatment');
    }
    
    // Add factors to list
    factors.forEach(factor => {
        const li = document.createElement('li');
        li.textContent = factor;
        factorsList.appendChild(li);
    });
    
    if (factors.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Metrics are near national averages across most indicators';
        factorsList.appendChild(li);
    }
}

/**
 * Show info modal
 */
function showInfoModal() {
    document.getElementById('info-modal').style.display = 'block';
}

/**
 * Hide modal
 */
function hideModal(selector) {
    document.querySelector(selector).style.display = 'none';
}

/**
 * Update model info card
 */
function updateModelInfo() {
    if (state.predictionsData) {
        const r2 = state.predictionsData.r2_score;
        document.getElementById('model-r2').innerHTML = 
            `<strong>Accuracy (R²):</strong> ${r2.toFixed(3)} (${(r2 * 100).toFixed(1)}% of variance explained)`;
    }
}

/**
 * Update statistics dashboard
 */
function updateStatsDashboard() {
    if (!state.countiesData || !state.predictionsData) return;
    
    const totalCounties = state.countiesData.length;
    const overperforming = state.countiesData.filter(c => 
        c.prediction && c.prediction.performance === 'overperforming'
    ).length;
    const underperforming = state.countiesData.filter(c => 
        c.prediction && c.prediction.performance === 'underperforming'
    ).length;
    const r2 = state.predictionsData.r2_score;
    
    // Animate numbers counting up
    animateValue('stat-total-counties', 0, totalCounties, 1000, 0);
    animateValue('stat-overperforming', 0, overperforming, 1200, 0);
    animateValue('stat-underperforming', 0, underperforming, 1400, 0);
    animateValue('stat-model-accuracy', 0, r2, 1600, 3, v => v.toFixed(3));
}

/**
 * Animate a number counter
 */
function animateValue(id, start, end, duration, decimals = 0, formatter = null) {
    const element = document.getElementById(id);
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16); // 60 FPS
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        
        const displayValue = formatter ? formatter(current) : 
                           decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toLocaleString();
        element.textContent = displayValue;
    }, 16);
}

/**
 * Format value with appropriate unit
 */
function formatValue(value, metricInfo) {
    if (value == null) return 'N/A';
    
    const format = d3.format(metricInfo.format);
    
    if (metricInfo.unit === '$') {
        return '$' + format(value);
    } else if (metricInfo.unit === '%') {
        return format(value) + '%';
    } else {
        return format(value) + ' ' + metricInfo.unit;
    }
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.getElementById('map-container');
    container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #c51b7d;">
            <h3>Error Loading Visualization</h3>
            <p>${message}</p>
            <p>Please ensure all data files are present in the /data folder.</p>
        </div>
    `;
}

// Export for debugging
window.HealthViz = {
    state,
    config,
    renderVisualization,
    showCountyModal
};
