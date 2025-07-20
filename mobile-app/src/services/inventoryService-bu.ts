import apiClient, { ApiResponse, PaginatedResponse } from './api';
import { 
  InventoryItem, 
  InventoryItemCreate, 
  InventoryItemUpdate, 
  InventoryStats,
  InventoryFilter
} from './types';

class InventoryService {
  async getInventory(
    page: number = 1,
    perPage: number = 20,
    filters?: InventoryFilter
  ): Promise<PaginatedResponse<InventoryItem>> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());
      
      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.category) params.append('category', filters.category);
        if (filters.search_query) params.append('search', filters.search_query);
        if (filters.days_until_expiry_max !== undefined) {
          params.append('days_until_expiry_max', filters.days_until_expiry_max.toString());
        }
      }

      const response = await apiClient.get<PaginatedResponse<InventoryItem>>(
        `/inventory?${params.toString()}`
      );
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch inventory');
    }
  }

  async getInventoryItem(itemId: string): Promise<InventoryItem> {
    try {
      const response = await apiClient.get<ApiResponse<InventoryItem>>(`/inventory/${itemId}`);
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch inventory item');
    }
  }

  async createInventoryItem(itemData: InventoryItemCreate): Promise<InventoryItem> {
    try {
      const response = await apiClient.post<ApiResponse<InventoryItem>>('/inventory', itemData);
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create inventory item');
    }
  }

  async updateInventoryItem(itemId: string, updates: InventoryItemUpdate): Promise<InventoryItem> {
    try {
      const response = await apiClient.put<ApiResponse<InventoryItem>>(
        `/inventory/${itemId}`, 
        updates
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update inventory item');
    }
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    try {
      await apiClient.delete(`/inventory/${itemId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete inventory item');
    }
  }

  async getInventoryStats(): Promise<InventoryStats> {
    try {
      const response = await apiClient.get<ApiResponse<InventoryStats>>('/inventory/stats');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch inventory stats');
    }
  }

  async getExpiringItems(days: number = 7): Promise<InventoryItem[]> {
    try {
      const response = await apiClient.get<ApiResponse<InventoryItem[]>>(
        `/inventory/expiring?days=${days}`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch expiring items');
    }
  }

  async markAsUsed(itemId: string): Promise<InventoryItem> {
    try {
      const response = await apiClient.post<ApiResponse<InventoryItem>>(
        `/inventory/${itemId}/mark-used`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark item as used');
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get<ApiResponse<string[]>>('/inventory/categories');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch categories');
    }
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const response = await apiClient.get<ApiResponse<string[]>>(
        `/inventory/search-suggestions?q=${encodeURIComponent(query)}`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch search suggestions');
    }
  }

  async bulkUpdateItems(updates: Array<{ id: string; updates: InventoryItemUpdate }>): Promise<void> {
    try {
      await apiClient.put('/inventory/bulk-update', { updates });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to bulk update items');
    }
  }

  async uploadItemImage(itemId: string, imageUri: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'item-image.jpg',
      } as any);

      const response = await apiClient.post<ApiResponse<{ image_url: string }>>(
        `/inventory/${itemId}/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.data!.image_url;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    }
  }
}

export default new InventoryService();
