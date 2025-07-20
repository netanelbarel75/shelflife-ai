import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import os
import re
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

from app.schemas import ExpiryPredictionResponse
from app.config import settings

class MLService:
    def __init__(self):
        self.model = None
        self.label_encoders = {}
        self.shelf_life_database = self._load_shelf_life_database()
        self._load_model()

    def _load_model(self):
        """Load the trained ML model."""
        try:
            if os.path.exists(settings.MODEL_PATH):
                self.model = joblib.load(settings.MODEL_PATH)
                print("ML model loaded successfully")
            else:
                print("No trained model found, using rule-based predictions")
        except Exception as e:
            print(f"Error loading ML model: {e}")
            self.model = None

    def _load_shelf_life_database(self) -> Dict[str, Dict]:
        """Load shelf life database for different food categories."""
        # In production, this would be loaded from a database
        return {
            'dairy': {
                'milk': {'pantry': 1, 'refrigerator': 7, 'freezer': 90},
                'yogurt': {'pantry': 1, 'refrigerator': 14, 'freezer': 60},
                'cheese': {'pantry': 1, 'refrigerator': 30, 'freezer': 180},
                'butter': {'pantry': 2, 'refrigerator': 60, 'freezer': 365},
                'cream': {'pantry': 1, 'refrigerator': 10, 'freezer': 90}
            },
            'meat': {
                'chicken': {'pantry': 0, 'refrigerator': 2, 'freezer': 365},
                'beef': {'pantry': 0, 'refrigerator': 3, 'freezer': 365},
                'pork': {'pantry': 0, 'refrigerator': 3, 'freezer': 180},
                'fish': {'pantry': 0, 'refrigerator': 2, 'freezer': 180},
                'ground_meat': {'pantry': 0, 'refrigerator': 1, 'freezer': 120}
            },
            'vegetables': {
                'lettuce': {'pantry': 1, 'refrigerator': 7, 'freezer': 30},
                'spinach': {'pantry': 1, 'refrigerator': 5, 'freezer': 30},
                'carrots': {'pantry': 3, 'refrigerator': 30, 'freezer': 365},
                'potatoes': {'pantry': 30, 'refrigerator': 60, 'freezer': 365},
                'tomatoes': {'pantry': 7, 'refrigerator': 14, 'freezer': 90},
                'onions': {'pantry': 30, 'refrigerator': 60, 'freezer': 180}
            },
            'fruits': {
                'bananas': {'pantry': 5, 'refrigerator': 7, 'freezer': 180},
                'apples': {'pantry': 14, 'refrigerator': 60, 'freezer': 365},
                'oranges': {'pantry': 7, 'refrigerator': 30, 'freezer': 365},
                'berries': {'pantry': 1, 'refrigerator': 7, 'freezer': 365},
                'grapes': {'pantry': 3, 'refrigerator': 14, 'freezer': 365}
            },
            'bakery': {
                'bread': {'pantry': 3, 'refrigerator': 7, 'freezer': 90},
                'rolls': {'pantry': 2, 'refrigerator': 5, 'freezer': 90},
                'bagels': {'pantry': 3, 'refrigerator': 7, 'freezer': 180},
                'croissants': {'pantry': 1, 'refrigerator': 3, 'freezer': 60}
            },
            'pantry': {
                'pasta': {'pantry': 730, 'refrigerator': 730, 'freezer': 730},
                'rice': {'pantry': 1095, 'refrigerator': 1095, 'freezer': 1095},
                'beans': {'pantry': 365, 'refrigerator': 365, 'freezer': 365},
                'cereal': {'pantry': 180, 'refrigerator': 180, 'freezer': 180},
                'crackers': {'pantry': 90, 'refrigerator': 90, 'freezer': 90}
            }
        }

    def predict_expiry(
        self,
        product_name: str,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        purchase_date: Optional[datetime] = None,
        storage_location: str = "refrigerator"
    ) -> ExpiryPredictionResponse:
        """Predict expiry date for a food item."""
        
        if not purchase_date:
            purchase_date = datetime.now()

        # Normalize product name for lookup
        normalized_name = self._normalize_product_name(product_name)
        
        # Determine category if not provided
        if not category:
            category = self._determine_category(product_name)
        
        # Get shelf life from database
        shelf_life_days = self._get_shelf_life_from_database(
            normalized_name, category, storage_location
        )
        
        # Apply ML model adjustments if available
        if self.model:
            shelf_life_days = self._apply_ml_prediction(
                product_name, category, brand, shelf_life_days
            )
        
        # Apply brand-specific adjustments
        shelf_life_days = self._apply_brand_adjustments(
            brand, category, shelf_life_days
        )
        
        # Calculate expiry date
        predicted_expiry_date = purchase_date + timedelta(days=shelf_life_days)
        
        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(
            product_name, category, brand, normalized_name
        )
        
        # Determine influencing factors
        factors = self._get_prediction_factors(
            category, storage_location, brand, normalized_name
        )
        
        return ExpiryPredictionResponse(
            predicted_expiry_date=predicted_expiry_date,
            confidence_score=confidence,
            estimated_shelf_life_days=shelf_life_days,
            factors=factors
        )

    def _normalize_product_name(self, product_name: str) -> str:
        """Normalize product name for database lookup."""
        # Convert to lowercase and remove extra spaces
        normalized = product_name.lower().strip()
        
        # Remove common prefixes/suffixes
        normalized = re.sub(r'\b(organic|fresh|frozen|canned|whole|low fat|fat free|2%|skim)\b', '', normalized)
        
        # Remove brand names (simplified list)
        brand_patterns = [
            r'\b(kraft|nestle|pepsi|coca cola|kellogs|general mills|unilever)\b'
        ]
        
        for pattern in brand_patterns:
            normalized = re.sub(pattern, '', normalized, flags=re.IGNORECASE)
        
        # Clean up extra spaces
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return normalized

    def _determine_category(self, product_name: str) -> str:
        """Determine food category from product name."""
        product_lower = product_name.lower()
        
        category_keywords = {
            'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'cottage cheese'],
            'meat': ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'ground'],
            'vegetables': ['lettuce', 'spinach', 'carrot', 'broccoli', 'tomato', 'potato', 'onion'],
            'fruits': ['banana', 'apple', 'orange', 'grape', 'berry', 'strawberry', 'blueberry'],
            'bakery': ['bread', 'roll', 'bagel', 'muffin', 'croissant', 'bun'],
            'pantry': ['pasta', 'rice', 'bean', 'cereal', 'cracker', 'soup', 'sauce']
        }
        
        for category, keywords in category_keywords.items():
            if any(keyword in product_lower for keyword in keywords):
                return category
        
        return 'pantry'  # Default category

    def _get_shelf_life_from_database(
        self, 
        normalized_name: str, 
        category: str, 
        storage_location: str
    ) -> int:
        """Get shelf life from database."""
        
        category_data = self.shelf_life_database.get(category.lower(), {})
        
        # Try exact match first
        if normalized_name in category_data:
            return category_data[normalized_name].get(storage_location, 7)
        
        # Try fuzzy matching
        for item_name, shelf_life in category_data.items():
            if item_name in normalized_name or normalized_name in item_name:
                return shelf_life.get(storage_location, 7)
        
        # Default shelf life by category and storage
        defaults = {
            'dairy': {'pantry': 1, 'refrigerator': 7, 'freezer': 90},
            'meat': {'pantry': 0, 'refrigerator': 2, 'freezer': 180},
            'vegetables': {'pantry': 3, 'refrigerator': 14, 'freezer': 90},
            'fruits': {'pantry': 5, 'refrigerator': 14, 'freezer': 180},
            'bakery': {'pantry': 3, 'refrigerator': 7, 'freezer': 90},
            'pantry': {'pantry': 365, 'refrigerator': 365, 'freezer': 365}
        }
        
        return defaults.get(category, {}).get(storage_location, 7)

    def _apply_ml_prediction(
        self, 
        product_name: str, 
        category: str, 
        brand: Optional[str], 
        base_shelf_life: int
    ) -> int:
        """Apply ML model prediction to adjust shelf life."""
        try:
            # This would use the actual trained model
            # For now, return base prediction with small adjustments
            if 'organic' in product_name.lower():
                return max(1, int(base_shelf_life * 0.8))  # Organic lasts less
            elif brand and brand.lower() in ['premium', 'high quality']:
                return int(base_shelf_life * 1.2)  # Premium lasts longer
            
            return base_shelf_life
            
        except Exception as e:
            print(f"ML prediction error: {e}")
            return base_shelf_life

    def _apply_brand_adjustments(
        self, 
        brand: Optional[str], 
        category: str, 
        shelf_life: int
    ) -> int:
        """Apply brand-specific adjustments."""
        if not brand:
            return shelf_life
        
        brand_lower = brand.lower()
        
        # Premium brands might last longer
        premium_brands = ['organic valley', 'whole foods', 'trader joe', 'horizon']
        if any(premium in brand_lower for premium in premium_brands):
            return int(shelf_life * 1.1)
        
        return shelf_life

    def _calculate_confidence(
        self, 
        product_name: str, 
        category: str, 
        brand: Optional[str], 
        normalized_name: str
    ) -> float:
        """Calculate prediction confidence score."""
        confidence = 0.5  # Base confidence
        
        # Higher confidence for known categories
        if category in self.shelf_life_database:
            confidence += 0.2
        
        # Higher confidence for exact matches
        if normalized_name in self.shelf_life_database.get(category, {}):
            confidence += 0.3
        
        # Brand information adds confidence
        if brand:
            confidence += 0.1
        
        # ML model adds confidence
        if self.model:
            confidence += 0.2
        
        return min(1.0, confidence)

    def _get_prediction_factors(
        self, 
        category: str, 
        storage_location: str, 
        brand: Optional[str], 
        normalized_name: str
    ) -> List[str]:
        """Get factors that influenced the prediction."""
        factors = []
        
        factors.append(f"Category: {category.title()}")
        factors.append(f"Storage: {storage_location.title()}")
        
        if brand:
            factors.append(f"Brand: {brand}")
        
        if storage_location == 'refrigerator':
            factors.append("Refrigeration extends shelf life")
        elif storage_location == 'freezer':
            factors.append("Freezing significantly extends shelf life")
        
        if 'organic' in normalized_name:
            factors.append("Organic products may have shorter shelf life")
        
        return factors

    def train_model(self, training_data: pd.DataFrame):
        """Train the ML model with new data."""
        try:
            # Prepare features
            features = ['category', 'storage_location', 'brand', 'is_organic']
            X = training_data[features]
            y = training_data['actual_shelf_life_days']
            
            # Encode categorical variables
            for feature in ['category', 'storage_location', 'brand']:
                if feature not in self.label_encoders:
                    self.label_encoders[feature] = LabelEncoder()
                X[feature] = self.label_encoders[feature].fit_transform(
                    X[feature].fillna('unknown')
                )
            
            # Train model
            self.model = RandomForestRegressor(
                n_estimators=100,
                random_state=42,
                max_depth=10
            )
            self.model.fit(X, y)
            
            # Save model
            os.makedirs(os.path.dirname(settings.MODEL_PATH), exist_ok=True)
            joblib.dump(self.model, settings.MODEL_PATH)
            
            print("Model trained and saved successfully")
            return True
            
        except Exception as e:
            print(f"Error training model: {e}")
            return False

    def get_model_metrics(self) -> Dict:
        """Get model performance metrics."""
        if not self.model:
            return {"status": "No model loaded"}
        
        return {
            "status": "Model loaded",
            "model_type": "Random Forest Regressor",
            "features": ["category", "storage_location", "brand", "is_organic"],
            "database_items": sum(len(items) for items in self.shelf_life_database.values())
        }

    def update_shelf_life_database(self, product_name: str, category: str, actual_days: int):
        """Update shelf life database with real-world data."""
        try:
            normalized_name = self._normalize_product_name(product_name)
            
            if category not in self.shelf_life_database:
                self.shelf_life_database[category] = {}
            
            if normalized_name not in self.shelf_life_database[category]:
                self.shelf_life_database[category][normalized_name] = {
                    'pantry': actual_days,
                    'refrigerator': actual_days,
                    'freezer': actual_days * 3
                }
            else:
                # Update with weighted average
                current_days = self.shelf_life_database[category][normalized_name]['refrigerator']
                updated_days = int((current_days + actual_days) / 2)
                self.shelf_life_database[category][normalized_name]['refrigerator'] = updated_days
            
            print(f"Updated shelf life for {normalized_name}: {actual_days} days")
            return True
            
        except Exception as e:
            print(f"Error updating shelf life database: {e}")
            return False
