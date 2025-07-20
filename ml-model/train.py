#!/usr/bin/env python3
"""
ML Model Training Script for ShelfLife.AI
Trains a machine learning model to predict food expiry dates.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import lightgbm as lgb
import joblib
import os
import json
from datetime import datetime, timedelta
import argparse

def generate_synthetic_training_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate synthetic training data for the ML model."""
    np.random.seed(42)
    
    # Define categories and their typical shelf lives
    categories = {
        'dairy': {'mean': 10, 'std': 5, 'min': 1, 'max': 30},
        'meat': {'mean': 3, 'std': 2, 'min': 1, 'max': 10},
        'vegetables': {'mean': 7, 'std': 4, 'min': 1, 'max': 21},
        'fruits': {'mean': 8, 'std': 5, 'min': 2, 'max': 30},
        'bakery': {'mean': 5, 'std': 3, 'min': 1, 'max': 14},
        'pantry': {'mean': 180, 'std': 100, 'min': 30, 'max': 730}
    }
    
    storage_multipliers = {
        'pantry': 1.0,
        'refrigerator': 1.5,
        'freezer': 10.0
    }
    
    brands = ['generic', 'premium', 'organic', 'store_brand', 'name_brand']
    brand_multipliers = {'organic': 0.8, 'premium': 1.2, 'generic': 1.0, 'store_brand': 0.9, 'name_brand': 1.1}
    
    data = []
    
    for _ in range(n_samples):
        category = np.random.choice(list(categories.keys()))
        storage = np.random.choice(list(storage_multipliers.keys()))
        brand = np.random.choice(brands)
        
        # Base shelf life from category
        base_shelf_life = max(
            categories[category]['min'],
            min(
                categories[category]['max'],
                np.random.normal(categories[category]['mean'], categories[category]['std'])
            )
        )
        
        # Apply modifiers
        shelf_life = base_shelf_life * storage_multipliers[storage] * brand_multipliers[brand]
        
        # Add some noise
        shelf_life = max(1, shelf_life + np.random.normal(0, shelf_life * 0.1))
        
        # Additional features
        is_organic = 1 if 'organic' in brand else 0
        purchase_season = np.random.randint(1, 5)  # 1=spring, 2=summer, 3=fall, 4=winter
        temperature_avg = np.random.normal(20, 10)  # Average storage temperature
        
        data.append({
            'category': category,
            'storage_location': storage,
            'brand_type': brand,
            'is_organic': is_organic,
            'purchase_season': purchase_season,
            'temperature_avg': temperature_avg,
            'shelf_life_days': int(shelf_life)
        })
    
    return pd.DataFrame(data)

def prepare_features(df: pd.DataFrame) -> tuple:
    """Prepare features for training."""
    # Encode categorical variables
    label_encoders = {}
    categorical_features = ['category', 'storage_location', 'brand_type']
    
    df_encoded = df.copy()
    
    for feature in categorical_features:
        le = LabelEncoder()
        df_encoded[feature] = le.fit_transform(df[feature])
        label_encoders[feature] = le
    
    # Features and target
    feature_columns = ['category', 'storage_location', 'brand_type', 'is_organic', 
                      'purchase_season', 'temperature_avg']
    X = df_encoded[feature_columns]
    y = df_encoded['shelf_life_days']
    
    return X, y, label_encoders

def train_models(X, y, label_encoders) -> dict:
    """Train multiple models and return the best one."""
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    models = {
        'random_forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        'gradient_boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
        'lightgbm': lgb.LGBMRegressor(n_estimators=100, random_state=42, verbose=-1)
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"Training {name}...")
        
        # Train model
        model.fit(X_train, y_train)
        
        # Predictions
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)
        
        # Metrics
        train_mse = mean_squared_error(y_train, y_pred_train)
        test_mse = mean_squared_error(y_test, y_pred_test)
        test_mae = mean_absolute_error(y_test, y_pred_test)
        test_r2 = r2_score(y_test, y_pred_test)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='r2')
        
        results[name] = {
            'model': model,
            'train_mse': train_mse,
            'test_mse': test_mse,
            'test_mae': test_mae,
            'test_r2': test_r2,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'label_encoders': label_encoders
        }
        
        print(f"{name} - Test R²: {test_r2:.4f}, Test MAE: {test_mae:.4f}")
    
    return results

def save_best_model(results: dict, model_dir: str = 'models'):
    """Save the best performing model."""
    os.makedirs(model_dir, exist_ok=True)
    
    # Find best model based on test R²
    best_model_name = max(results.keys(), key=lambda k: results[k]['test_r2'])
    best_result = results[best_model_name]
    
    print(f"\nBest model: {best_model_name}")
    print(f"Test R²: {best_result['test_r2']:.4f}")
    print(f"Test MAE: {best_result['test_mae']:.4f}")
    
    # Save model
    model_path = os.path.join(model_dir, 'expiry_model.pkl')
    joblib.dump(best_result['model'], model_path)
    
    # Save label encoders
    encoders_path = os.path.join(model_dir, 'label_encoders.pkl')
    joblib.dump(best_result['label_encoders'], encoders_path)
    
    # Save metadata
    metadata = {
        'model_type': best_model_name,
        'test_r2': best_result['test_r2'],
        'test_mae': best_result['test_mae'],
        'cv_mean': best_result['cv_mean'],
        'cv_std': best_result['cv_std'],
        'features': ['category', 'storage_location', 'brand_type', 'is_organic', 
                    'purchase_season', 'temperature_avg'],
        'trained_at': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }
    
    metadata_path = os.path.join(model_dir, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\nModel saved to: {model_path}")
    print(f"Encoders saved to: {encoders_path}")
    print(f"Metadata saved to: {metadata_path}")
    
    return model_path

def main():
    parser = argparse.ArgumentParser(description='Train ShelfLife.AI ML model')
    parser.add_argument('--samples', type=int, default=10000, 
                       help='Number of synthetic samples to generate')
    parser.add_argument('--model-dir', type=str, default='models',
                       help='Directory to save trained model')
    
    args = parser.parse_args()
    
    print("🤖 ShelfLife.AI ML Model Training")
    print("=" * 40)
    
    # Generate synthetic training data
    print(f"Generating {args.samples} synthetic training samples...")
    df = generate_synthetic_training_data(args.samples)
    
    print(f"Dataset shape: {df.shape}")
    print(f"Categories: {df['category'].unique()}")
    print(f"Storage locations: {df['storage_location'].unique()}")
    
    # Prepare features
    print("\nPreparing features...")
    X, y, label_encoders = prepare_features(df)
    
    # Train models
    print("\nTraining models...")
    results = train_models(X, y, label_encoders)
    
    # Save best model
    print("\nSaving best model...")
    model_path = save_best_model(results, args.model_dir)
    
    print("\n✅ Training completed successfully!")
    print(f"Model ready for use: {model_path}")

if __name__ == "__main__":
    main()
