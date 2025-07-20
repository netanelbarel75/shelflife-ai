from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Any, List
import os
import uuid
import asyncio

from app.database import get_db
from app.schemas import (
    User, Receipt, ReceiptCreate, ReceiptUploadResponse,
    ParsedReceiptItem, ReceiptParsingResult, APIResponse
)
from app.routers.auth import get_current_user
from app.services.receipt_service import ReceiptService
from app.services.ocr_service import OCRService
from app.services.ml_service import MLService
from app.config import settings

router = APIRouter()

@router.post("/upload", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    store_name: str = Form(None),
    receipt_date: str = Form(None),
    total_amount: float = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Upload and process a receipt."""
    
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Supported types: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create receipt record
    receipt_service = ReceiptService(db)
    receipt_data = ReceiptCreate(
        store_name=store_name,
        total_amount=total_amount
    )
    
    receipt = receipt_service.create_receipt(
        current_user.id, 
        file_path, 
        file.filename, 
        receipt_data
    )
    
    # Start background processing
    asyncio.create_task(process_receipt_async(receipt.id, db))
    
    return ReceiptUploadResponse(
        receipt_id=receipt.id,
        message="Receipt uploaded successfully. Processing started.",
        processing_status="processing"
    )

@router.get("/", response_model=List[Receipt])
async def get_receipts(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's receipts."""
    receipt_service = ReceiptService(db)
    receipts = receipt_service.get_user_receipts(current_user.id, skip, limit)
    return receipts

@router.get("/{receipt_id}", response_model=Receipt)
async def get_receipt(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get a specific receipt."""
    receipt_service = ReceiptService(db)
    receipt = receipt_service.get_receipt(receipt_id, current_user.id)
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    return receipt

@router.get("/{receipt_id}/parsing-result", response_model=ReceiptParsingResult)
async def get_receipt_parsing_result(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get receipt parsing result with extracted items."""
    receipt_service = ReceiptService(db)
    result = receipt_service.get_parsing_result(receipt_id, current_user.id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parsing result not found or still processing"
        )
    
    return result

@router.post("/{receipt_id}/reprocess", response_model=APIResponse)
async def reprocess_receipt(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Reprocess a receipt."""
    receipt_service = ReceiptService(db)
    receipt = receipt_service.get_receipt(receipt_id, current_user.id)
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    # Start reprocessing
    asyncio.create_task(process_receipt_async(receipt.id, db))
    
    return APIResponse(
        success=True,
        message="Receipt reprocessing started"
    )

@router.delete("/{receipt_id}", response_model=APIResponse)
async def delete_receipt(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a receipt."""
    receipt_service = ReceiptService(db)
    success = receipt_service.delete_receipt(receipt_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    return APIResponse(
        success=True,
        message="Receipt deleted successfully"
    )

async def process_receipt_async(receipt_id: str, db: Session):
    """Background task to process receipt."""
    try:
        receipt_service = ReceiptService(db)
        ocr_service = OCRService()
        ml_service = MLService()
        
        # Update status to processing
        receipt_service.update_processing_status(receipt_id, "processing")
        
        # Get receipt
        receipt = receipt_service.get_receipt_by_id(receipt_id)
        if not receipt:
            return
        
        # Step 1: OCR Processing
        ocr_result = ocr_service.extract_text(receipt.file_path)
        receipt_service.update_ocr_text(receipt_id, ocr_result.text)
        
        # Step 2: Parse receipt items
        parsed_items = receipt_service.parse_receipt_items(ocr_result.text)
        
        # Step 3: Predict expiry dates for each item
        enhanced_items = []
        for item in parsed_items:
            expiry_prediction = ml_service.predict_expiry(
                product_name=item.name,
                category=item.category,
                purchase_date=receipt.receipt_date
            )
            
            item.estimated_expiry_date = expiry_prediction.predicted_expiry_date
            enhanced_items.append(item)
        
        # Step 4: Save parsing results
        receipt_service.save_parsing_results(receipt_id, enhanced_items)
        
        # Update status to completed
        receipt_service.update_processing_status(receipt_id, "completed")
        
    except Exception as e:
        # Update status to failed
        receipt_service.update_processing_status(receipt_id, "failed")
        print(f"Error processing receipt {receipt_id}: {e}")

@router.get("/{receipt_id}/status")
async def get_processing_status(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get receipt processing status."""
    receipt_service = ReceiptService(db)
    receipt = receipt_service.get_receipt(receipt_id, current_user.id)
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    return {
        "receipt_id": receipt.id,
        "status": receipt.processing_status,
        "processed_at": receipt.processed_at
    }
