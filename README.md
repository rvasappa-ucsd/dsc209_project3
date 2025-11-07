# Mapping Health Inequality: Which U.S. Counties Defy Economic Predictions?

**DSC 209: Data Visualization | Fall 2025**

**Team:** Harsh Arya, Gabrielle Despaigne, Camila Paik, Raghav Vasappanavara

---

## Research Question

**How do socioeconomic factors shape geographic health disparities across U.S. counties, and which communities achieve better health outcomes than their economic conditions predict?**

This visualization explores the relationship between economic factors and health outcomes across 3,068 U.S. counties. Rather than simply showing the well-known correlation between wealth and health, we use machine learning to identify the **exceptions to this rule**—counties that defy economic predictions and achieve better or worse health outcomes than expected.

## Live Visualization

**GitHub Pages:** [https://rvasappa-ucsd.github.io/dsc209_project3/](https://rvasappa-ucsd.github.io/dsc209_project3/)

**Repository:** [https://github.com/rvasappa-ucsd/dsc209_project3](https://github.com/rvasappa-ucsd/dsc209_project3)

---

## Design Rationale

### Visual Encoding Decisions

#### 1. Deviation Map as Primary View

We implemented a **residual/deviation map** that displays the difference between actual and predicted life expectancy for each county. This choice was driven by our research question—we wanted to highlight **outliers** rather than simply confirm the expected correlation between wealth and health.

**Visual Encodings:**
- **Geographic Position:** Counties rendered in their true geographic locations using TopoJSON (preserves spatial relationships essential for regional pattern recognition)
- **Color (Diverging Scale):** 
  - Red-to-white-to-green diverging scale encodes deviation magnitude and direction
  - Red: Counties with lower life expectancy than predicted (underperforming)
  - White/Neutral: Counties performing as expected
  - Green: Counties with higher life expectancy than predicted (overperforming)
  - Domain: -8 to +8 years deviation
  - Color scheme: ColorBrewer RdYlGn (colorblind-accessible)

**Why This Encoding Works:**
- **Expressiveness:** The diverging scale naturally represents positive and negative deviations from a meaningful midpoint (predicted value)
- **Effectiveness:** Color is a strong visual channel for categorical distinctions (good/neutral/bad) and the sequential gradient within each category shows magnitude
- **Perceptual Uniformity:** Equal perceptual differences in color represent equal data differences

#### 2. Alternative Metric View

Users can toggle to a standard choropleth showing any of 12 individual metrics using a **sequential color scale**. This provides:
- Validation that our model captures real patterns (e.g., income strongly correlates with life expectancy)
- Exploration of individual factors without ML interpretation
- Comparison between deviation view and traditional visualizations

**Encoding for Metric View:**
- **Color (Sequential Scale):** Light-to-dark gradient for quantitative values
- **Direction:** For "higher is better" metrics (income, education), darker = better. For "lower is better" metrics (obesity, smoking), reversed.

#### 3. Interaction Techniques

**Details-on-Demand (Hover Tooltips):**
- Reduces visual clutter on the map
- Provides immediate feedback without requiring clicks
- Shows: County name, actual vs predicted life expectancy, deviation amount
- **Rationale:** Schneiderman's mantra—"Overview first, zoom and filter, then details-on-demand"

**Modal Drill-Down (Click):**
- Deep dive into 12 metrics for selected county
- Prediction vs actual comparison visualization
- AI-generated explanatory text analyzing contributing factors
- **Rationale:** Enables hypothesis generation—users can investigate *why* a county is an outlier

**Dynamic Filtering:**
- Filter by performance category (all/overperforming/underperforming/expected)
- **Rationale:** Allows focused exploration of interesting subsets
- Implementation: Uses CSS opacity + pointer-events to dim/disable filtered counties

**View Switching:**
- Toggle between deviation map and single-metric view
- Dropdown selector for 12 different metrics
- **Rationale:** Multiple coordinated views without screen clutter
- Smooth transitions enhance perception of data consistency across views

### Alternatives Considered

We evaluated four approaches during design:

**Option A: Bivariate Choropleth** (showing two metrics simultaneously with 2D color scale)
- *Pros:* Shows correlations directly, visually striking
- *Cons:* 2D color scales are hard to interpret, doesn't leverage our ML model
- *Decision:* Rejected—too complex for general audience

**Option B: Linked Multi-View Dashboard** (map + scatter plot + coordinated brushing)
- *Pros:* Advanced interaction, multiple perspectives simultaneously
- *Cons:* Screen space constraints, higher cognitive load, development complexity
- *Decision:* Rejected—risk of overwhelming users and implementation time

**Option C: Clustering/Archetype Map** (k-means to group counties into types)
- *Pros:* Reveals hidden patterns, memorable narratives
- *Cons:* Loses granular quantitative information, harder to validate
- *Decision:* Rejected—categorical encoding less powerful than quantitative

**Option D: Deviation Map** (our choice)
- *Pros:* Directly answers research question, novel approach, quantitatively interpretable, ML-informed
- *Cons:* Requires understanding of "predicted" concept
- *Decision:* **Selected**—best balance of insight, novelty, and clarity

### Color Palette Selection

We tested multiple ColorBrewer palettes:
- **RdBu** (red-blue): Too associated with political maps in U.S. context
- **PiYG** (pink-yellow-green): Yellow center was low contrast
- **BrBG** (brown-blue-green): Brown seemed unrelated to health
- **RdYlGn** (red-yellow-green): **SELECTED**—intuitive association (red=bad, green=good), colorblind-safe, high contrast

### Typography and Layout

- **Sans-serif font family:** Optimized for screen readability
- **Gradient header background:** Draws attention to title and research question
- **Card-based layout:** Modular design with clear visual hierarchy
- **Responsive grid:** Adapts to mobile, tablet, and desktop screens
- **High contrast ratios:** Meets WCAG AA accessibility standards

---

## Data Transformations

### Source Data
- **Primary Dataset:** County Health Rankings & Roadmaps (2024 data, published 2025)
- **Provider:** Robert Wood Johnson Foundation & University of Wisconsin Population Health Institute
- **Coverage:** 3,068 U.S. counties (99% of U.S. population)
- **Original Format:** CSV with 24 metrics across multiple years

### Data Processing Pipeline

**1. Temporal Filtering**
- Filtered to most recent year (2024) only to ensure temporal consistency
- Rationale: Comparing counties across different time periods would introduce confounding factors

**2. Metric Selection**
- Selected 12 metrics from 24 available based on:
  - Data completeness (>95% of counties have values)
  - Relevance to health outcomes research
  - Coverage of 4 domains: Health Outcomes, Socioeconomic, Healthcare Access, Health Behaviors

**Selected Metrics:**
- **Health Outcomes:** Life expectancy, premature death rate, poor/fair health %
- **Socioeconomic:** Median income, high school graduation %
- **Healthcare Access:** Uninsured rate %, primary care physician rate
- **Health Behaviors:** Adult obesity %, smoking %, physical inactivity %, diabetes %, excessive drinking %

**3. Missing Data Handling**
- Counties with missing life expectancy (target variable): Excluded entirely (91 counties)
- Counties with missing predictors: Median imputation using scikit-learn's SimpleImputer
- Rationale: Life expectancy is essential for our analysis; predictor missingness is <5% and median imputation preserves distribution

**4. Machine Learning Model**
- **Algorithm:** Random Forest Regressor (100 trees, max depth 10)
- **Train/Test Split:** 80/20 random split (stratified by state to preserve geographic diversity)
- **Target:** Life expectancy (years)
- **Features:** 9 socioeconomic and behavioral metrics (excluding outcome measures)
- **Performance:** R² = 0.707 on test set (explains 70.7% of variance)

**5. Residual Calculation**
- Residual = Actual Life Expectancy - Predicted Life Expectancy
- Positive residual → Overperforming (healthier than expected)
- Negative residual → Underperforming (less healthy than expected)

**6. Performance Classification**
- **Overperforming:** Residual > +1.0 years (738 counties, 24%)
- **As Expected:** -1.0 ≤ Residual ≤ +1.0 years (1,645 counties, 54%)
- **Underperforming:** Residual < -1.0 years (685 counties, 22%)
- Rationale: 1-year threshold balances sensitivity (capturing meaningful differences) with specificity (avoiding noise)

**7. Data Export**
- Exported to JSON for web compatibility
- Structure: Array of county objects with FIPS codes for geographic matching
- Size optimization: Rounded to 2 decimal places, removed redundant fields
- Final file size: ~2.8 MB (acceptable for web delivery)

---

## Development Process

### Team Contributions

**Work Distribution:**

| Team Member | Primary Responsibilities | Estimated Hours |
|------------|-------------------------|-----------------|
| **Harsh Arya** | Exploratory data analysis, feature engineering, Random Forest model implementation, hyperparameter tuning | 18 hours |
| **Gabrielle Despaigne** | D3.js map implementation, TopoJSON integration, interaction handlers (hover, click, filter), debugging geographic data matching | 20 hours |
| **Camila Paik** | UI/UX design, CSS styling, modal components, responsive layout, accessibility features, color palette testing | 16 hours |
| **Raghav Vasappanavara** | Data pipeline (CSV→JSON), documentation, testing across browsers, GitHub Pages deployment, write-up | 15 hours |

**Total Effort:** ~69 person-hours over 2.5 weeks

### Development Timeline

**Week 1 (Nov 4-10):**
- Dataset acquisition and exploratory analysis
- Checkpoint submission with 6 exploratory graphs
- Team decision on deviation map approach
- Initial data processing script

**Week 2 (Nov 11-17):**
- Days 1-3: Data pipeline, ML model training, JSON export
- Days 4-6: D3.js core implementation (map rendering, color scales, basic interactions)
- Days 7-9: UI polish (modals, legends, filters), CSS refinement, cross-browser testing

**Week 3 (Nov 18-20):**
- Final testing and bug fixes
- Write-up and documentation
- GitHub Pages deployment

### Technical Challenges

**1. Data Wrangling (~25% of total time)**

*Challenge:* The County Health Rankings dataset, while comprehensive, required extensive preprocessing:
- Multiple years of data mixed in same file
- Inconsistent column naming across years
- Percentage values encoded both as 0-1 decimals and 0-100 integers
- ~5% missing data for predictor variables

*Solution:* 
- Built robust Python pipeline with explicit column mapping
- Implemented median imputation for missing predictors
- Added data validation checks (range verification, FIPS format)
- Created clear separation between source data and processed JSON

**2. Geographic Data Matching (~8 hours)**

*Challenge:* Matching our county data (FIPS codes) with TopoJSON geographic boundaries:
- FIPS codes must be exactly 5 characters with leading zeros (e.g., "06037" not "6037")
- Some counties in TopoJSON weren't in our dataset (territories, recent boundary changes)
- Initial implementation showed ~200 counties as gray (unmatched)

*Solution:*
- Enforced string formatting: `.astype(str).str.zfill(5)`
- Created data validation script to identify mismatches
- Added fallback color (#e0e0e0) for missing data with clear visual distinction

**3. Map Rendering Performance (~6 hours)**

*Challenge:* Rendering 3,068 county paths caused noticeable lag on hover interactions, especially on lower-end devices.

*Solution:*
- Used simplified TopoJSON (10m resolution instead of full detail)
- Optimized hover handlers: debouncing, CSS transforms instead of re-rendering
- Pre-computed color scales rather than calculating on each frame
- Result: Smooth 60fps interactions even on older hardware

**4. Color Scale Design (~5 hours)**

*Challenge:* Finding a diverging color scale that was:
- Colorblind-accessible (8% of male population affected)
- Perceptually uniform (equal visual differences = equal data differences)
- Intuitively interpretable (red=bad, green=good)
- High contrast for both endpoints

*Testing Process:*
- Evaluated 8 ColorBrewer palettes
- Tested with colorblindness simulators (Coblis, Color Oracle)
- Validated with actual colorblind team member
- Final choice: RdYlGn with adjusted domain boundaries

**5. Modal Complexity (~7 hours)**

*Challenge:* Designing a county detail modal that shows 12 metrics without overwhelming users.

*Solution:*
- Grouped metrics by category (Health Outcomes, Socioeconomic, Healthcare Access, Behaviors)
- Used card-based layout with visual hierarchy
- Added prediction comparison chart for context
- Implemented AI-generated explanatory text analyzing contributing factors
- Multiple close methods: X button, outside click, Escape key (accessibility)

### What Took the Most Time

**Surprisingly, interaction polish (~30% of development time) exceeded core visualization implementation (~25%).**

Breaking down the timeline:
1. **Interaction refinement:** 21 hours (tooltips, modals, smooth transitions, edge cases)
2. **Data processing:** 17 hours (cleaning, ML model, export)
3. **Core D3.js map:** 16 hours (projection, paths, color scales)
4. **UI/UX design:** 15 hours (CSS, responsive layout, accessibility)

**Key Lesson:** Users judge interactive visualizations on interaction quality more than visual sophistication. A perfectly rendered map with janky tooltips feels unprofessional, while smooth interactions can compensate for simpler visual design.

### Tools & Technologies

**Data Processing:**
- Python 3.13 (pandas, numpy, scikit-learn)
- Random Forest Regressor (100 trees, 10 max depth)
- JSON export for web compatibility

**Visualization:**
- D3.js v7 (loaded from CDN—no high-level libraries like Vega-Lite)
- TopoJSON v3 for efficient geographic data
- Vanilla JavaScript (ES6+, no frameworks)

**Design:**
- CSS Grid and Flexbox for layout
- CSS Custom Properties for theming
- Responsive design (mobile, tablet, desktop)
- WCAG AA accessibility compliance

**Development:**
- Git for version control
- VS Code with Live Server for local testing
- GitHub Pages for deployment

**Testing:**
- Chrome DevTools for debugging
- Lighthouse for performance auditing
- Cross-browser testing (Chrome, Firefox, Edge, Safari)

---

## Key Insights & Discoveries

Through this visualization, users can discover:

**1. Geographic Patterns**
- Appalachian region shows systematic underperformance (poor health despite moderate income)
- Parts of Minnesota and Colorado show strong overperformance
- Urban-rural divide is complex: some rural counties outperform wealthy suburbs

**2. Income ≠ Health (Always)**
- Median income is the strongest predictor (52% of model importance)
- But 738 counties (24%) significantly outperform their economic profile
- Example: Certain counties in Utah have high life expectancy despite modest income

**3. Protective Factors Beyond Economics**
- Physical activity environment matters: Low inactivity rates correlate with overperformance
- Healthcare access: Primary care density shows surprising importance
- Cultural factors: Some regions show protective health behaviors independent of wealth

**4. Policy Implications**
- Overperforming poor counties reveal potential best practices
- Underperforming wealthy counties suggest local health system failures
- Interactive exploration enables hypothesis generation for public health researchers

---

## How to Use the Visualization

**1. Start with the Overview**
- The map loads in "Deviation View" showing all 3,068 counties
- Green = healthier than predicted, Red = less healthy, White = as expected

**2. Explore with Hover**
- Move cursor over any county to see:
  - County name and state
  - Actual vs predicted life expectancy
  - Deviation amount in years

**3. Deep Dive with Click**
- Click any county for detailed modal showing:
  - All 12 health metrics
  - Visual comparison (predicted vs actual)
  - Potential contributing factors

**4. Filter and Focus**
- Use "Filter Counties" dropdown to show only:
  - Overperforming counties (interesting success stories)
  - Underperforming counties (areas needing intervention)
  - As expected (validation of model)

**5. Compare Metrics**
- Toggle to "Single Metric View"
- Select individual metrics to see traditional choropleths
- Verify relationships (e.g., income vs life expectancy)

---

## Limitations and Future Work

**Current Limitations:**
1. Cross-sectional analysis (2024 data only)—cannot show trends over time
2. County-level aggregation masks within-county health disparities
3. Model explains 70.7% of variance—remaining 29.3% due to unmeasured factors
4. Mobile experience constrained by high county density
5. No demographic breakdowns (race, age, gender)

**Potential Enhancements:**
- Time-series animation showing how deviations change (2020-2025)
- State-level aggregation mode for clearer mobile viewing
- Linked scatter plot for multivariate exploration
- Exportable comparison reports (PDF download)
- Integration with Census demographic data

---

## References & Data Sources

**Primary Dataset:**
- County Health Rankings & Roadmaps. (2025). *2025 County Health Rankings National Data*. Robert Wood Johnson Foundation & University of Wisconsin Population Health Institute. Retrieved from https://www.countyhealthrankings.org/

**Geographic Data:**
- U.S. Census Bureau. (2024). *Cartographic Boundary Files - Counties*. Retrieved from https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json

**Technologies:**
- Bostock, M., Ogievetsky, V., & Heer, J. (2011). D³: Data-Driven Documents. *IEEE Transactions on Visualization and Computer Graphics*, 17(12), 2301-2309.
- Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. *Journal of Machine Learning Research*, 12, 2825-2830.

---

## Project Information

**Course:** DSC 209 - Data Visualization for Data Science  
**Institution:** University of California, San Diego  
**Term:** Fall 2025  

**Team Members:**
- Harsh Arya (harya@ucsd.edu)
- Gabrielle Despaigne (gdespaigne@ucsd.edu)  
- Camila Paik (capaik@ucsd.edu)
- Raghav Vasappanavara (rvasappanavara@ucsd.edu)

**Repository:** https://github.com/rvasappa-ucsd/dsc209_project3  
**Live Visualization:** https://rvasappa-ucsd.github.io/dsc209_project3/

---

*This visualization was created using only D3.js (no high-level libraries) and deployed as a static site requiring no server-side processing.*
