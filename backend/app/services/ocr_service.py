import pytesseract
from PIL import Image
import cv2
import numpy as np
import os
import time
from typing import Dict, List, Optional
import re

from app.schemas import OCRResult
from app.config import settings

class OCRService:
    def __init__(self):
        # Set tesseract path if specified
        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH

    def extract_text(self, image_path: str) -> OCRResult:
        """Extract text from an image using Tesseract OCR."""
        start_time = time.time()
        
        try:
            # Preprocess the image for better OCR results
            processed_image = self._preprocess_image(image_path)
            
            # Configure Tesseract for receipt processing
            config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$%-: '
            
            # Extract text with confidence scores
            data = pytesseract.image_to_data(
                processed_image, 
                config=config,
                output_type=pytesseract.Output.DICT
            )
            
            # Filter out low-confidence text
            filtered_text = self._filter_low_confidence_text(data)
            
            # Clean and structure the text
            cleaned_text = self._clean_extracted_text(filtered_text)
            
            # Calculate average confidence
            confidences = [conf for conf in data['conf'] if conf > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return OCRResult(
                text=cleaned_text,
                confidence=avg_confidence / 100,  # Convert to 0-1 scale
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            print(f"OCR Error: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                processing_time_ms=int((time.time() - start_time) * 1000)
            )

    def _preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better OCR results."""
        # Load image
        image = cv2.imread(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Remove noise with median filter
        denoised = cv2.medianBlur(gray, 3)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Dilate to connect text components
        kernel = np.ones((1, 1), np.uint8)
        dilated = cv2.dilate(thresh, kernel, iterations=1)
        
        return dilated

    def _filter_low_confidence_text(self, data: Dict) -> str:
        """Filter out text with low confidence scores."""
        min_confidence = 30
        text_parts = []
        
        for i, conf in enumerate(data['conf']):
            if conf > min_confidence:
                text = data['text'][i].strip()
                if text:
                    text_parts.append(text)
        
        return ' '.join(text_parts)

    def _clean_extracted_text(self, text: str) -> str:
        """Clean and structure extracted text."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Fix common OCR errors
        text = re.sub(r'[|]', 'I', text)  # Pipe to I
        text = re.sub(r'[0O](?=\d)', '0', text)  # O to 0 when followed by digit
        text = re.sub(r'(?<=\d)[0O]', '0', text)  # O to 0 when preceded by digit
        
        return text

    def extract_store_info(self, text: str) -> Dict[str, Optional[str]]:
        """Extract store information from OCR text."""
        store_patterns = {
            'walmart': r'(?i)wal[-\s]*mart',
            'target': r'(?i)target',
            'kroger': r'(?i)kroger',
            'safeway': r'(?i)safeway',
            'whole_foods': r'(?i)whole\s*foods',
            'trader_joes': r'(?i)trader\s*joe',
            'costco': r'(?i)costco',
            'cvs': r'(?i)cvs',
            'walgreens': r'(?i)walgreens'
        }
        
        detected_store = None
        for store_name, pattern in store_patterns.items():
            if re.search(pattern, text):
                detected_store = store_name.replace('_', ' ').title()
                break
        
        # Extract date patterns
        date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})'
        date_match = re.search(date_pattern, text)
        receipt_date = date_match.group(1) if date_match else None
        
        # Extract total amount
        total_patterns = [
            r'(?i)total[:\s]*\$?(\d+\.\d{2})',
            r'(?i)amount[:\s]*\$?(\d+\.\d{2})',
            r'\$(\d+\.\d{2})\s*(?:total|amount)',
        ]
        
        total_amount = None
        for pattern in total_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    total_amount = float(match.group(1))
                    break
                except ValueError:
                    continue
        
        return {
            'store_name': detected_store,
            'receipt_date': receipt_date,
            'total_amount': total_amount
        }

    def extract_line_items(self, text: str) -> List[Dict[str, str]]:
        """Extract individual line items from receipt text."""
        lines = text.split('\n')
        items = []
        
        # Pattern to match item lines with prices
        item_pattern = r'^(.+?)\s+(\$?\d+\.\d{2})$'
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip header/footer lines
            if any(keyword in line.lower() for keyword in [
                'receipt', 'thank you', 'total', 'subtotal', 'tax', 'change',
                'cashier', 'store', 'phone', 'address', 'date', 'time'
            ]):
                continue
            
            match = re.match(item_pattern, line)
            if match:
                item_name = match.group(1).strip()
                price_str = match.group(2).replace('$', '')
                
                try:
                    price = float(price_str)
                    items.append({
                        'name': item_name,
                        'price': price_str,
                        'raw_line': line
                    })
                except ValueError:
                    continue
        
        return items

    def validate_image(self, image_path: str) -> bool:
        """Validate if the image is suitable for OCR processing."""
        try:
            # Check if file exists and is readable
            if not os.path.exists(image_path):
                return False
            
            # Check file size (not too small, not too large)
            file_size = os.path.getsize(image_path)
            if file_size < 1000 or file_size > settings.MAX_FILE_SIZE:
                return False
            
            # Try to load the image
            image = Image.open(image_path)
            
            # Check image dimensions
            width, height = image.size
            if width < 100 or height < 100:
                return False
            
            # Check if image has reasonable aspect ratio
            aspect_ratio = max(width, height) / min(width, height)
            if aspect_ratio > 10:  # Too long/thin
                return False
            
            return True
            
        except Exception:
            return False

    def get_text_regions(self, image_path: str) -> List[Dict]:
        """Get text regions with bounding boxes for advanced processing."""
        try:
            image = cv2.imread(image_path)
            processed = self._preprocess_image(image_path)
            
            # Get detailed data with bounding boxes
            data = pytesseract.image_to_data(
                processed,
                output_type=pytesseract.Output.DICT
            )
            
            regions = []
            for i in range(len(data['text'])):
                if data['conf'][i] > 30:  # Filter low confidence
                    text = data['text'][i].strip()
                    if text:
                        regions.append({
                            'text': text,
                            'confidence': data['conf'][i],
                            'bbox': {
                                'x': data['left'][i],
                                'y': data['top'][i],
                                'width': data['width'][i],
                                'height': data['height'][i]
                            }
                        })
            
            return regions
            
        except Exception as e:
            print(f"Error getting text regions: {e}")
            return []
