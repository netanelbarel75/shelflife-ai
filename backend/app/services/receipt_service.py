from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import re
import json

from app.models import Receipt, InventoryItem, User
from app.schemas import ReceiptCreate, ParsedReceiptItem, ReceiptParsingResult
from app.services.ocr_service import OCRService
from app.services.ml_service import MLService

class ReceiptService:
    def __init__(self, db: Session):
        self.db = db

    def create_receipt(
        self, 
        user_id: str, 
        file_path: str, 
        original_filename: str,
        receipt_data: ReceiptCreate
    ) -> Receipt:
        """Create a new receipt record."""
        receipt = Receipt(
            id=uuid.uuid4(),
            user_id=user_id,
            file_path=file_path,
            original_filename=original_filename,
            store_name=receipt_data.store_name,
            receipt_date=receipt_data.receipt_date,
            total_amount=receipt_data.total_amount,
            currency=receipt_data.currency,
            processing_status="pending",
            created_at=datetime.utcnow()
        )
        
        self.db.add(receipt)
        self.db.commit()
        self.db.refresh(receipt)
        return receipt

    def get_receipt(self, receipt_id: str, user_id: str) -> Optional[Receipt]:
        """Get a specific receipt for a user."""
        return self.db.query(Receipt).filter(
            and_(
                Receipt.id == receipt_id,
                Receipt.user_id == user_id
            )
        ).first()

    def get_receipt_by_id(self, receipt_id: str) -> Optional[Receipt]:
        """Get receipt by ID (admin function)."""
        return self.db.query(Receipt).filter(Receipt.id == receipt_id).first()

    def get_user_receipts(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[Receipt]:
        """Get user's receipts with pagination."""
        return self.db.query(Receipt).filter(
            Receipt.user_id == user_id
        ).order_by(
            Receipt.created_at.desc()
        ).offset(skip).limit(limit).all()

    def update_processing_status(self, receipt_id: str, status: str):
        """Update receipt processing status."""
        receipt = self.db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if receipt:
            receipt.processing_status = status
            receipt.processed_at = datetime.utcnow()
            self.db.commit()

    def update_ocr_text(self, receipt_id: str, ocr_text: str):
        """Update OCR text for receipt."""
        receipt = self.db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if receipt:
            receipt.ocr_text = ocr_text
            self.db.commit()

    def parse_receipt_items(self, ocr_text: str) -> List[ParsedReceiptItem]:
        """Parse receipt items from OCR text."""
        items = []
        lines = ocr_text.split('\n')
        
        # Patterns for item extraction
        item_patterns = [
            r'^(.+?)\s+(\d+\.\d{2})$',  # Item name followed by price
            r'^(.+?)\s+\$(\d+\.\d{2})$',  # Item name followed by $price
            r'^(\d+)\s+(.+?)\s+(\d+\.\d{2})$',  # Qty Item name price
        ]
        
        for line in lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue
                
            # Skip non-item lines
            if self._is_non_item_line(line):
                continue
            
            # Try to extract item information
            item_info = self._extract_item_info(line)
            if item_info:
                # Categorize the item
                category = self._categorize_item(item_info['name'])
                
                # Create parsed item
                parsed_item = ParsedReceiptItem(
                    name=item_info['name'],
                    quantity=item_info.get('quantity'),
                    price=item_info.get('price'),
                    category=category,
                    confidence=item_info.get('confidence', 0.8)
                )
                
                items.append(parsed_item)
        
        return items

    def save_parsing_results(self, receipt_id: str, items: List[ParsedReceiptItem]):
        """Save parsing results to database."""
        # In a real implementation, you might save this to a separate table
        # For now, we'll store it as JSON in the receipt record or create inventory items
        
        receipt = self.db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if receipt:
            # Create inventory items from parsed items
            for item in items:
                inventory_item = InventoryItem(
                    id=uuid.uuid4(),
                    user_id=receipt.user_id,
                    receipt_id=receipt.id,
                    name=item.name,
                    category=item.category,
                    quantity=self._parse_quantity(item.quantity) if item.quantity else 1,
                    unit=self._parse_unit(item.quantity) if item.quantity else 'item',
                    purchase_price=item.price,
                    purchase_date=receipt.receipt_date or receipt.created_at,
                    store_name=receipt.store_name,
                    predicted_expiry_date=item.estimated_expiry_date,
                    confidence_score=item.confidence,
                    source='receipt',
                    status='fresh',
                    created_at=datetime.utcnow()
                )
                
                self.db.add(inventory_item)
            
            self.db.commit()

    def get_parsing_result(self, receipt_id: str, user_id: str) -> Optional[ReceiptParsingResult]:
        """Get parsing result for a receipt."""
        receipt = self.get_receipt(receipt_id, user_id)
        if not receipt or receipt.processing_status != 'completed':
            return None
        
        # Get inventory items created from this receipt
        items = self.db.query(InventoryItem).filter(
            InventoryItem.receipt_id == receipt_id
        ).all()
        
        parsed_items = []
        for item in items:
            parsed_items.append(ParsedReceiptItem(
                name=item.name,
                quantity=f"{item.quantity} {item.unit}" if item.unit else str(item.quantity),
                price=item.purchase_price,
                category=item.category,
                estimated_expiry_date=item.predicted_expiry_date,
                confidence=item.confidence_score or 0.8
            ))
        
        return ReceiptParsingResult(
            receipt_id=receipt.id,
            store_name=receipt.store_name,
            receipt_date=receipt.receipt_date,
            total_amount=receipt.total_amount,
            items=parsed_items,
            processing_time_ms=5000  # Mock processing time
        )

    def delete_receipt(self, receipt_id: str, user_id: str) -> bool:
        """Delete a receipt and associated items."""
        receipt = self.get_receipt(receipt_id, user_id)
        if not receipt:
            return False
        
        # Delete associated inventory items
        self.db.query(InventoryItem).filter(
            InventoryItem.receipt_id == receipt_id
        ).delete()
        
        # Delete the receipt
        self.db.delete(receipt)
        self.db.commit()
        
        # Delete the file
        try:
            import os
            if os.path.exists(receipt.file_path):
                os.remove(receipt.file_path)
        except Exception as e:
            print(f"Error deleting file: {e}")
        
        return True

    def _is_non_item_line(self, line: str) -> bool:
        """Check if line is not an item line."""
        line_lower = line.lower()
        
        non_item_keywords = [
            'receipt', 'thank you', 'total', 'subtotal', 'tax', 'change',
            'cashier', 'store', 'phone', 'address', 'date', 'time',
            'balance', 'payment', 'visa', 'mastercard', 'cash',
            'tender', 'refund', 'discount', 'coupon', 'save',
            'member', 'rewards', 'points', 'expires', 'valid'
        ]
        
        return any(keyword in line_lower for keyword in non_item_keywords)

    def _extract_item_info(self, line: str) -> Optional[dict]:
        """Extract item information from a line."""
        # Pattern 1: Quantity Item Name Price
        pattern1 = r'^(\d+)\s+(.+?)\s+(\d+\.\d{2})$'
        match1 = re.match(pattern1, line)
        if match1:
            return {
                'quantity': match1.group(1),
                'name': match1.group(2).strip(),
                'price': float(match1.group(3)),
                'confidence': 0.9
            }
        
        # Pattern 2: Item Name Price
        pattern2 = r'^(.+?)\s+(\d+\.\d{2})$'
        match2 = re.match(pattern2, line)
        if match2:
            return {
                'name': match2.group(1).strip(),
                'price': float(match2.group(2)),
                'confidence': 0.8
            }
        
        # Pattern 3: Item Name $Price
        pattern3 = r'^(.+?)\s+\$(\d+\.\d{2})$'
        match3 = re.match(pattern3, line)
        if match3:
            return {
                'name': match3.group(1).strip(),
                'price': float(match3.group(2)),
                'confidence': 0.8
            }
        
        # If no price pattern matches, might still be an item
        if len(line) > 3 and not line.isdigit():
            return {
                'name': line.strip(),
                'confidence': 0.5
            }
        
        return None

    def _categorize_item(self, item_name: str) -> str:
        """Categorize an item based on its name."""
        item_lower = item_name.lower()
        
        categories = {
            'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
            'meat': ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon'],
            'vegetables': ['lettuce', 'spinach', 'carrot', 'broccoli', 'tomato'],
            'fruits': ['banana', 'apple', 'orange', 'grape', 'berry'],
            'bakery': ['bread', 'roll', 'bagel', 'muffin', 'cake'],
            'pantry': ['pasta', 'rice', 'bean', 'cereal', 'soup', 'sauce']
        }
        
        for category, keywords in categories.items():
            if any(keyword in item_lower for keyword in keywords):
                return category
        
        return 'pantry'  # Default category

    def _parse_quantity(self, quantity_str: Optional[str]) -> float:
        """Parse quantity from string."""
        if not quantity_str:
            return 1.0
        
        # Extract number from quantity string
        numbers = re.findall(r'\d+\.?\d*', quantity_str)
        if numbers:
            try:
                return float(numbers[0])
            except ValueError:
                pass
        
        return 1.0

    def _parse_unit(self, quantity_str: Optional[str]) -> str:
        """Parse unit from quantity string."""
        if not quantity_str:
            return 'item'
        
        # Common units
        unit_patterns = {
            r'\blb\b|\bpound\b': 'lb',
            r'\boz\b|\bounce\b': 'oz',
            r'\bkg\b|\bkilogram\b': 'kg',
            r'\bg\b|\bgram\b': 'g',
            r'\bml\b|\bmilliliter\b': 'ml',
            r'\bl\b|\bliter\b': 'l',
            r'\bgal\b|\bgallon\b': 'gallon',
            r'\bqt\b|\bquart\b': 'quart',
            r'\bpt\b|\bpint\b': 'pint',
            r'\bpack\b|\bpkg\b': 'pack',
            r'\bbox\b|\bpackage\b': 'box',
            r'\bbag\b': 'bag',
            r'\bcan\b': 'can',
            r'\bbottle\b': 'bottle'
        }
        
        quantity_lower = quantity_str.lower()
        for pattern, unit in unit_patterns.items():
            if re.search(pattern, quantity_lower):
                return unit
        
        return 'item'

    def get_receipt_stats(self, user_id: str) -> dict:
        """Get receipt statistics for user."""
        total_receipts = self.db.query(Receipt).filter(
            Receipt.user_id == user_id
        ).count()
        
        completed_receipts = self.db.query(Receipt).filter(
            and_(
                Receipt.user_id == user_id,
                Receipt.processing_status == 'completed'
            )
        ).count()
        
        total_amount = self.db.query(func.sum(Receipt.total_amount)).filter(
            and_(
                Receipt.user_id == user_id,
                Receipt.total_amount.isnot(None)
            )
        ).scalar() or 0
        
        return {
            'total_receipts': total_receipts,
            'completed_receipts': completed_receipts,
            'failed_receipts': total_receipts - completed_receipts,
            'total_spending': round(total_amount, 2)
        }
