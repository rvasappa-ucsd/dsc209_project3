"""
Data Preparation Script for Health Inequality Visualization
Processes County Health Rankings data and generates prediction model
"""

import pandas as pd
import numpy as np
import json
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

# Configuration
INPUT_FILE = '../data/county_health_data.csv'
OUTPUT_COUNTIES = '../data/counties_data.json'
OUTPUT_PREDICTIONS = '../data/predictions.json'
OUTPUT_METRICS = '../data/metrics_info.json'

# Metric definitions
METRICS = {
    'life_expectancy': {
        'name': 'Life Expectancy',
        'unit': 'years',
        'format': '.1f',
        'description': 'Average expected lifespan',
        'category': 'Health Outcomes'
    },
    'premature_death_rate': {
        'name': 'Premature Death Rate',
        'unit': 'per 100k',
        'format': '.0f',
        'description': 'Years of potential life lost before age 75',
        'category': 'Health Outcomes'
    },
    'poor_fair_health': {
        'name': 'Poor/Fair Health',
        'unit': '%',
        'format': '.1f',
        'description': 'Adults reporting poor or fair health',
        'category': 'Health Outcomes'
    },
    'median_income': {
        'name': 'Median Household Income',
        'unit': '$',
        'format': ',.0f',
        'description': 'Median household income',
        'category': 'Socioeconomic'
    },
    'high_school_grad': {
        'name': 'High School Graduation',
        'unit': '%',
        'format': '.1f',
        'description': 'High school graduation rate',
        'category': 'Socioeconomic'
    },
    'uninsured_rate': {
        'name': 'Uninsured Rate',
        'unit': '%',
        'format': '.1f',
        'description': 'Population without health insurance',
        'category': 'Healthcare Access'
    },
    'adult_obesity': {
        'name': 'Adult Obesity',
        'unit': '%',
        'format': '.1f',
        'description': 'Adults with BMI >= 30',
        'category': 'Health Behaviors'
    },
    'adult_smoking': {
        'name': 'Adult Smoking',
        'unit': '%',
        'format': '.1f',
        'description': 'Adults who smoke',
        'category': 'Health Behaviors'
    },
    'physical_inactivity': {
        'name': 'Physical Inactivity',
        'unit': '%',
        'format': '.1f',
        'description': 'Adults with no physical activity',
        'category': 'Health Behaviors'
    },
    'diabetes_prevalence': {
        'name': 'Diabetes Prevalence',
        'unit': '%',
        'format': '.1f',
        'description': 'Adults with diabetes',
        'category': 'Health Behaviors'
    },
    'excessive_drinking': {
        'name': 'Excessive Drinking',
        'unit': '%',
        'format': '.1f',
        'description': 'Adults reporting binge/heavy drinking',
        'category': 'Health Behaviors'
    },
    'primary_care_rate': {
        'name': 'Primary Care Physician Rate',
        'unit': 'per 100k',
        'format': '.0f',
        'description': 'Primary care physicians per 100,000 population',
        'category': 'Healthcare Access'
    }
}

# Features for prediction model (exclude outcome variables)
PREDICTOR_FEATURES = [
    'median_income',
    'high_school_grad',
    'uninsured_rate',
    'adult_obesity',
    'adult_smoking',
    'physical_inactivity',
    'diabetes_prevalence',
    'excessive_drinking',
    'primary_care_rate'
]

TARGET_VARIABLE = 'life_expectancy'


def load_and_clean_data(filepath):
    """
    Load County Health Rankings CSV file and extract relevant columns
    """
    print("Loading data from CSV file...")
    
    # Read the CSV file
    df = pd.read_csv(filepath)
    
    # Filter to most recent year only (2024 or latest)
    if 'year' in df.columns:
        latest_year = df['year'].max()
        df = df[df['year'] == latest_year]
        print(f"Filtered to year {latest_year}")
    
    # Column mapping from CSV to our standardized names
    column_mapping = {
        'fips': 'fips',
        'state': 'state',
        'county': 'county',
        'life_expectancy': 'life_expectancy',
        'premature_death': 'premature_death_rate',
        'poor_health': 'poor_fair_health',
        'median_income': 'median_income',
        'hs_graduation': 'high_school_grad',
        'uninsured': 'uninsured_rate',
        'adult_obesity': 'adult_obesity',
        'adult_smoking': 'adult_smoking',
        'physical_inactivity': 'physical_inactivity',
        'diabetes': 'diabetes_prevalence',
        'excessive_drinking': 'excessive_drinking',
        'primary_care_rate': 'primary_care_rate'
    }
    
    # Select and rename columns
    available_cols = [col for col in column_mapping.keys() if col in df.columns]
    df = df[available_cols].rename(columns=column_mapping)
    
    # Convert FIPS to string with leading zeros (5 digits)
    df['fips'] = df['fips'].astype(str).str.zfill(5)
    
    # Remove rows with missing FIPS or target variable
    df = df.dropna(subset=['fips', TARGET_VARIABLE])
    
    # Ensure numeric types
    numeric_cols = [col for col in df.columns if col not in ['fips', 'state', 'county']]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    print(f"Loaded {len(df)} counties with data")
    return df


def build_prediction_model(df):
    """
    Train Random Forest model to predict life expectancy
    Returns model, predictions, and feature importance
    """
    print("\nTraining Random Forest prediction model...")
    
    # Prepare features and target
    X = df[PREDICTOR_FEATURES].copy()
    y = df[TARGET_VARIABLE].copy()
    
    # Handle missing values with median imputation
    from sklearn.impute import SimpleImputer
    imputer = SimpleImputer(strategy='median')
    X_imputed = pd.DataFrame(
        imputer.fit_transform(X),
        columns=X.columns,
        index=X.index
    )
    
    # Split data for evaluation
    X_train, X_test, y_train, y_test = train_test_split(
        X_imputed, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=20,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    
    # Evaluate model
    train_score = rf_model.score(X_train, y_train)
    test_score = rf_model.score(X_test, y_test)
    
    print(f"Model R² Score (Train): {train_score:.3f}")
    print(f"Model R² Score (Test): {test_score:.3f}")
    
    # Get predictions for all counties
    predictions = rf_model.predict(X_imputed)
    
    # Calculate residuals (actual - predicted)
    residuals = y.values - predictions
    
    # Get feature importance
    feature_importance = pd.DataFrame({
        'feature': PREDICTOR_FEATURES,
        'importance': rf_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nFeature Importance:")
    print(feature_importance.to_string(index=False))
    
    return predictions, residuals, feature_importance, test_score


def create_county_geojson_mapping():
    """
    Create a mapping of FIPS codes to county names for GeoJSON matching
    Note: You'll need to download US counties TopoJSON separately
    Recommended source: https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json
    """
    # This is a placeholder - the actual GeoJSON will be loaded in JavaScript
    return {
        'source': 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json',
        'instructions': 'Download and include in /data folder or use CDN link'
    }


def export_to_json(df, predictions, residuals, feature_importance, r2_score):
    """
    Export processed data and predictions to JSON files for D3.js
    """
    print("\nExporting data to JSON files...")
    
    # Main county data
    counties_data = []
    for i, (idx, row) in enumerate(df.iterrows()):
        county_dict = {
            'fips': row['fips'],
            'state': row['state'],
            'county': row['county'],
            'name': f"{row['county']}, {row['state']}",
            'metrics': {},
            'prediction': {
                'actual': float(row[TARGET_VARIABLE]),
                'predicted': float(predictions[i]),
                'residual': float(residuals[i]),
                'performance': 'overperforming' if residuals[i] > 1.0 else 
                              ('underperforming' if residuals[i] < -1.0 else 'as_expected')
            }
        }
        
        # Add all metrics
        for metric_key, metric_info in METRICS.items():
            if metric_key in row.index and pd.notna(row[metric_key]):
                county_dict['metrics'][metric_key] = float(row[metric_key])
            else:
                county_dict['metrics'][metric_key] = None
        
        counties_data.append(county_dict)
    
    # Save counties data
    with open(OUTPUT_COUNTIES, 'w') as f:
        json.dump(counties_data, f, indent=2)
    print(f"✓ Saved {len(counties_data)} counties to {OUTPUT_COUNTIES}")
    
    # Save prediction model info
    predictions_info = {
        'model': 'Random Forest Regressor',
        'target_variable': TARGET_VARIABLE,
        'predictor_features': PREDICTOR_FEATURES,
        'r2_score': float(r2_score),
        'feature_importance': [
            {
                'feature': row['feature'],
                'importance': float(row['importance']),
                'name': METRICS[row['feature']]['name']
            }
            for _, row in feature_importance.iterrows()
        ],
        'statistics': {
            'mean_residual': float(np.mean(residuals)),
            'std_residual': float(np.std(residuals)),
            'min_residual': float(np.min(residuals)),
            'max_residual': float(np.max(residuals)),
            'overperforming_count': int(np.sum(residuals > 1.0)),
            'underperforming_count': int(np.sum(residuals < -1.0))
        }
    }
    
    with open(OUTPUT_PREDICTIONS, 'w') as f:
        json.dump(predictions_info, f, indent=2)
    print(f"✓ Saved prediction info to {OUTPUT_PREDICTIONS}")
    
    # Save metrics metadata
    with open(OUTPUT_METRICS, 'w') as f:
        json.dump(METRICS, f, indent=2)
    print(f"✓ Saved metrics metadata to {OUTPUT_METRICS}")
    
    # Print summary statistics
    print("\n=== Data Summary ===")
    print(f"Total counties: {len(counties_data)}")
    print(f"Overperforming (residual > 1 year): {predictions_info['statistics']['overperforming_count']}")
    print(f"Underperforming (residual < -1 year): {predictions_info['statistics']['underperforming_count']}")
    print(f"Max positive deviation: +{predictions_info['statistics']['max_residual']:.2f} years")
    print(f"Max negative deviation: {predictions_info['statistics']['min_residual']:.2f} years")


def main():
    """
    Main execution function
    """
    print("=" * 70)
    print("County Health Rankings Data Processing")
    print("=" * 70)
    
    try:
        # Load and clean data
        df = load_and_clean_data(INPUT_FILE)
        
        # Build prediction model
        predictions, residuals, feature_importance, r2_score = build_prediction_model(df)
        
        # Export to JSON
        export_to_json(df, predictions, residuals, feature_importance, r2_score)
        
        print("\n" + "=" * 70)
        print("✓ Data processing complete!")
        print("=" * 70)
        print("\nNext steps:")
        print("1. Download US counties TopoJSON from:")
        print("   https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json")
        print("2. Review generated JSON files in /data folder")
        print("3. Proceed with D3.js visualization implementation")
        
    except FileNotFoundError:
        print(f"\n❌ Error: Could not find input file: {INPUT_FILE}")
        print("Please ensure the Excel file is in the /data folder")
    except Exception as e:
        print(f"\n❌ Error during processing: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
