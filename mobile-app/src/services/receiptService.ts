import apiClient, { ApiResponse, PaginatedResponse } from './api';
import { 
  Receipt, 
  ReceiptUploadResponse, 
  ReceiptParsingResult,
  ParsedReceiptItem 
} from './types';

class ReceiptService {
  async uploadReceipt(imageUri: string): Promise<ReceiptUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('receipt_image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      } as any);

      const response = await apiClient.post<ApiResponse<ReceiptUploadResponse>>(
        '/receipts/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload receipt');
    }
  }

  async uploadReceiptFile(fileUri: string, fileName: string): Promise<ReceiptUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('receipt_file', {
        uri: fileUri,
        type: 'application/pdf',
        name: fileName,
      } as any);

      const response = await apiClient.post<ApiResponse<ReceiptUploadResponse>>(
        '/receipts/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload receipt file');
    }
  }

  async getProcessingStatus(receiptId: string): Promise<{ status: string; progress?: number }> {
    try {
      const response = await apiClient.get<ApiResponse<{ status: string; progress?: number }>>(
        `/receipts/${receiptId}/status`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get processing status');
    }
  }

  async getReceiptParsingResult(receiptId: string): Promise<ReceiptParsingResult> {
    try {
      const response = await apiClient.get<ApiResponse<ReceiptParsingResult>>(
        `/receipts/${receiptId}/result`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get parsing result');
    }
  }

  async getReceipts(page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Receipt>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Receipt>>(
        `/receipts?page=${page}&per_page=${perPage}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch receipts');
    }
  }

  async getReceipt(receiptId: string): Promise<Receipt> {
    try {
      const response = await apiClient.get<ApiResponse<Receipt>>(`/receipts/${receiptId}`);
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch receipt');
    }
  }

  async deleteReceipt(receiptId: string): Promise<void> {
    try {
      await apiClient.delete(`/receipts/${receiptId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete receipt');
    }
  }

  async confirmReceiptItems(
    receiptId: string, 
    confirmedItems: ParsedReceiptItem[]
  ): Promise<void> {
    try {
      await apiClient.post(`/receipts/${receiptId}/confirm`, {
        confirmed_items: confirmedItems,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to confirm receipt items');
    }
  }

  async reprocessReceipt(receiptId: string): Promise<ReceiptUploadResponse> {
    try {
      const response = await apiClient.post<ApiResponse<ReceiptUploadResponse>>(
        `/receipts/${receiptId}/reprocess`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reprocess receipt');
    }
  }

  async getReceiptImage(receiptId: string): Promise<string> {
    try {
      const response = await apiClient.get<ApiResponse<{ image_url: string }>>(
        `/receipts/${receiptId}/image`
      );
      return response.data.data!.image_url;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get receipt image');
    }
  }

  async emailReceiptForward(email: string, receiptData: string): Promise<ReceiptUploadResponse> {
    try {
      const response = await apiClient.post<ApiResponse<ReceiptUploadResponse>>(
        '/receipts/email-forward',
        {
          email,
          receipt_data: receiptData,
        }
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to process email receipt');
    }
  }

  // Helper method to poll for receipt processing completion
  async waitForProcessingComplete(
    receiptId: string, 
    maxAttempts: number = 30, 
    interval: number = 2000,
    onProgress?: (status: string, progress?: number) => void
  ): Promise<ReceiptParsingResult> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getProcessingStatus(receiptId);
        
        if (onProgress) {
          onProgress(status.status, status.progress);
        }
        
        if (status.status === 'completed') {
          return await this.getReceiptParsingResult(receiptId);
        }
        
        if (status.status === 'failed') {
          throw new Error('Receipt processing failed');
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        attempts++;
      }
    }
    
    throw new Error('Receipt processing timed out');
  }
}

export default new ReceiptService();
