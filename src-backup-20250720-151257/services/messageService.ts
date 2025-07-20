import apiClient, { ApiResponse, PaginatedResponse } from './api';
import { Message, MessageCreate, Conversation } from './types';

class MessageService {
  async sendMessage(messageData: MessageCreate): Promise<Message> {
    try {
      const response = await apiClient.post<ApiResponse<Message>>('/messages', messageData);
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send message');
    }
  }

  async getMessages(
    page: number = 1,
    perPage: number = 50,
    unreadOnly: boolean = false
  ): Promise<PaginatedResponse<Message>> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());
      if (unreadOnly) params.append('unread_only', 'true');

      const response = await apiClient.get<PaginatedResponse<Message>>(
        `/messages?${params.toString()}`
      );
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch messages');
    }
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await apiClient.get<ApiResponse<Conversation[]>>('/messages/conversations');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }

  async getConversation(
    partnerId: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<PaginatedResponse<Message>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Message>>(
        `/messages/conversation/${partnerId}?page=${page}&per_page=${perPage}`
      );
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch conversation');
    }
  }

  async markAsRead(messageId: string): Promise<Message> {
    try {
      const response = await apiClient.post<ApiResponse<Message>>(
        `/messages/${messageId}/mark-read`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark message as read');
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.post('/messages/mark-all-read');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark all messages as read');
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<ApiResponse<{ count: number }>>('/messages/unread-count');
      return response.data.data!.count;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get unread count');
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await apiClient.delete(`/messages/${messageId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete message');
    }
  }

  async getListingMessages(listingId: string): Promise<Message[]> {
    try {
      const response = await apiClient.get<ApiResponse<Message[]>>(
        `/messages/listing/${listingId}`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch listing messages');
    }
  }

  async blockUser(userId: string): Promise<void> {
    try {
      await apiClient.post(`/messages/block/${userId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to block user');
    }
  }

  async unblockUser(userId: string): Promise<void> {
    try {
      await apiClient.delete(`/messages/block/${userId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to unblock user');
    }
  }

  async getBlockedUsers(): Promise<string[]> {
    try {
      const response = await apiClient.get<ApiResponse<string[]>>('/messages/blocked');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch blocked users');
    }
  }

  async reportMessage(messageId: string, reason: string, details?: string): Promise<void> {
    try {
      await apiClient.post(`/messages/${messageId}/report`, {
        reason,
        details,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to report message');
    }
  }

  // Real-time message helpers (for when you add WebSocket support)
  async startListening(onNewMessage: (message: Message) => void): Promise<void> {
    // This would implement WebSocket connection for real-time messages
    // For now, we'll use polling
    console.log('Real-time messaging not yet implemented');
  }

  async stopListening(): Promise<void> {
    // Stop WebSocket connection
    console.log('Real-time messaging not yet implemented');
  }

  // Helper method to poll for new messages
  async pollForNewMessages(lastCheckTime: string): Promise<Message[]> {
    try {
      const response = await apiClient.get<ApiResponse<Message[]>>(
        `/messages/new-since?timestamp=${encodeURIComponent(lastCheckTime)}`
      );
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to poll for new messages');
    }
  }
}

export default new MessageService();
