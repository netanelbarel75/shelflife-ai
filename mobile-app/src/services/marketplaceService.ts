import apiClient, { ApiResponse, PaginatedResponse } from './api';
import { 
  MarketplaceListing, 
  MarketplaceListingCreate, 
  MarketplaceFilter,
  ListingStatus 
} from './types';

class MarketplaceService {
  async getNearbyListings(
    latitude: number,
    longitude: number,
    page: number = 1,
    perPage: number = 20,
    filters?: MarketplaceFilter
  ): Promise<PaginatedResponse<MarketplaceListing>> {
    try {
      const params = new URLSearchParams();
      params.append('lat', latitude.toString());
      params.append('lng', longitude.toString());
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());
      
      if (filters) {
        if (filters.category) params.append('category', filters.category);
        if (filters.max_price) params.append('max_price', filters.max_price.toString());
        if (filters.max_distance_miles) {
          params.append('max_distance_miles', filters.max_distance_miles.toString());
        }
        if (filters.search_query) params.append('search', filters.search_query);
      }

      const response = await apiClient.get<PaginatedResponse<MarketplaceListing>>(
        `/marketplace/nearby?${params.toString()}`
      );
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch nearby listings');
    }
  }

  async createListing(listingData: MarketplaceListingCreate): Promise<MarketplaceListing> {
    try {
      const response = await apiClient.post<ApiResponse<MarketplaceListing>>(
        '/marketplace',
        listingData
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create listing');
    }
  }

  async getListing(listingId: string): Promise<MarketplaceListing> {
    try {
      const response = await apiClient.get<ApiResponse<MarketplaceListing>>(
        `/marketplace/${listingId}`
      );
      
      // Increment view count
      this.incrementViews(listingId).catch(() => {
        // Silently fail if view increment fails
      });
      
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch listing');
    }
  }

  async updateListing(
    listingId: string, 
    updates: Partial<MarketplaceListingCreate>
  ): Promise<MarketplaceListing> {
    try {
      const response = await apiClient.put<ApiResponse<MarketplaceListing>>(
        `/marketplace/${listingId}`,
        updates
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update listing');
    }
  }

  async deleteListing(listingId: string): Promise<void> {
    try {
      await apiClient.delete(`/marketplace/${listingId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete listing');
    }
  }

  async getUserListings(
    page: number = 1,
    perPage: number = 20,
    status?: ListingStatus
  ): Promise<PaginatedResponse<MarketplaceListing>> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());
      if (status) params.append('status', status);

      const response = await apiClient.get<PaginatedResponse<MarketplaceListing>>(
        `/marketplace/my-listings?${params.toString()}`
      );
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user listings');
    }
  }

  async markAsSold(listingId: string): Promise<MarketplaceListing> {
    try {
      const response = await apiClient.post<ApiResponse<MarketplaceListing>>(
        `/marketplace/${listingId}/mark-sold`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark as sold');
    }
  }

  async expireListing(listingId: string): Promise<void> {
    try {
      await apiClient.post(`/marketplace/${listingId}/expire`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to expire listing');
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get<ApiResponse<string[]>>('/marketplace/categories');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch categories');
    }
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const response = await apiClient.get<ApiResponse<string[]>>(
        `/marketplace/search-suggestions?q=${encodeURIComponent(query)}`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch search suggestions');
    }
  }

  async getUserStats(): Promise<{
    total_listings: number;
    active_listings: number;
    sold_listings: number;
    total_views: number;
    total_revenue: number;
  }> {
    try {
      const response = await apiClient.get<ApiResponse<{
        total_listings: number;
        active_listings: number;
        sold_listings: number;
        total_views: number;
        total_revenue: number;
      }>>('/marketplace/stats');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch marketplace stats');
    }
  }

  async incrementViews(listingId: string): Promise<void> {
    try {
      await apiClient.post(`/marketplace/${listingId}/view`);
    } catch (error: any) {
      // Silently fail - view tracking is not critical
      console.warn('Failed to increment view count:', error.message);
    }
  }

  async reportListing(listingId: string, reason: string, details?: string): Promise<void> {
    try {
      await apiClient.post(`/marketplace/${listingId}/report`, {
        reason,
        details,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to report listing');
    }
  }

  async favoriteListing(listingId: string): Promise<void> {
    try {
      await apiClient.post(`/marketplace/${listingId}/favorite`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to favorite listing');
    }
  }

  async unfavoriteListing(listingId: string): Promise<void> {
    try {
      await apiClient.delete(`/marketplace/${listingId}/favorite`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to unfavorite listing');
    }
  }

  async getFavoriteListings(
    page: number = 1,
    perPage: number = 20
  ): Promise<PaginatedResponse<MarketplaceListing>> {
    try {
      const response = await apiClient.get<PaginatedResponse<MarketplaceListing>>(
        `/marketplace/favorites?page=${page}&per_page=${perPage}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch favorite listings');
    }
  }
}

export default new MarketplaceService();
