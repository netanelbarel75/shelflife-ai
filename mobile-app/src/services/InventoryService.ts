// services/InventoryService.ts
import { Platform } from 'react-native';
import { ReceiptItem, ProcessedReceipt, FoodCategory } from './ReceiptProcessor';
import { notificationService } from './NotificationService';

// Platform-specific storage import
let AsyncStorage: any = null;
if (Platform.OS !== 'web') {
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (error) {
    console.log('AsyncStorage not installed');
  }
}

export interface InventoryItem extends ReceiptItem {
  id: string;
  userId: string;
  status: 'fresh' | 'nearing' | 'expired' | 'used' | 'donated' | 'sold';
  addedDate: string;
  lastUpdated: string;
  consumedDate?: string;
  location: 'fridge' | 'freezer' | 'pantry' | 'counter';
  photos?: string[];
  notes?: string;
  sharedInMarketplace: boolean;
  notificationIds: string[];
}

export interface InventoryStats {
  totalItems: number;
  freshItems: number;
  nearingExpiry: number;
  expiredItems: number;
  wastePreventedThisMonth: {
    itemCount: number;
    estimatedValue: number;
    co2Saved: number;
  };
  categoryCounts: Record<FoodCategory, number>;
}

export interface ExpiryAlert {
  itemId: string;
  itemName: string;
  daysUntilExpiry: number;
  urgency: 'low' | 'medium' | 'high' | 'expired';
  suggestedActions: string[];
}

class InventoryService {
  private inventory: Map<string, InventoryItem> = new Map();
  private userId: string = 'default_user'; // Replace with actual user management
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;
    
    try {
      await this.loadInventoryFromStorage();
      this.scheduleExpiryChecks();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize inventory service:', error);
    }
  }

  private async loadInventoryFromStorage() {
    try {
      const storedInventory = await this.getFromStorage('inventory');
      if (storedInventory) {
        const items: InventoryItem[] = JSON.parse(storedInventory);
        this.inventory.clear();
        items.forEach(item => this.inventory.set(item.id, item));
      }
    } catch (error) {
      console.error('Error loading inventory from storage:', error);
    }
  }

  private async saveInventoryToStorage() {
    try {
      const items = Array.from(this.inventory.values());
      await this.setToStorage('inventory', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving inventory to storage:', error);
    }
  }

  private async getFromStorage(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else if (AsyncStorage) {
      return AsyncStorage.getItem(key);
    }
    return null;
  }

  private async setToStorage(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else if (AsyncStorage) {
      await AsyncStorage.setItem(key, value);
    }
  }

  // Add a single item to inventory
  async addItem(itemData: {
    name: string;
    originalName?: string;
    category: FoodCategory;
    quantity?: number;
    unit?: string;
    location?: InventoryItem['location'];
    estimatedExpiryDate: string;
    price?: number;
    notes?: string;
  }): Promise<boolean> {
    try {
      const newItem: InventoryItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId,
        name: itemData.name,
        originalName: itemData.originalName || itemData.name,
        category: itemData.category,
        quantity: itemData.quantity || 1,
        unit: itemData.unit || 'pieces',
        price: itemData.price || 0,
        estimatedExpiryDate: itemData.estimatedExpiryDate,
        status: this.calculateStatus(itemData.estimatedExpiryDate),
        addedDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        location: itemData.location || this.suggestLocation(itemData.category),
        photos: [],
        notes: itemData.notes || '',
        sharedInMarketplace: false,
        notificationIds: [],
      };

      this.inventory.set(newItem.id, newItem);
      await this.saveInventoryToStorage();
      await this.scheduleExpiryNotifications(newItem);

      console.log(`✅ Added item: ${newItem.name} (expires: ${newItem.estimatedExpiryDate})`);
      return true;
    } catch (error) {
      console.error('Error adding item:', error);
      return false;
    }
  }

  async updateItem(itemId: string, updates: Partial<InventoryItem>): Promise<boolean> {
    try {
      const item = this.inventory.get(itemId);
      if (!item) return false;

      const updatedItem = { ...item, ...updates, lastUpdated: new Date().toISOString() };
      this.inventory.set(itemId, updatedItem);
      await this.saveInventoryToStorage();

      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      return false;
    }
  }

  async markAsUsed(itemId: string, notes?: string): Promise<boolean> {
    try {
      const item = this.inventory.get(itemId);
      if (!item) return false;

      const updatedItem: InventoryItem = {
        ...item,
        status: 'used',
        consumedDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        notes: notes ? `${item.notes || ''}\n${notes}`.trim() : item.notes || '',
      };

      this.inventory.set(itemId, updatedItem);
      await this.saveInventoryToStorage();
      await this.updateWastePreventionStats(item, 'used');

      // Cancel scheduled notifications
      for (const notificationId of item.notificationIds) {
        await notificationService.cancelNotification(notificationId);
      }

      return true;
    } catch (error) {
      console.error('Error marking item as used:', error);
      return false;
    }
  }

  async shareInMarketplace(itemId: string): Promise<boolean> {
    try {
      const item = this.inventory.get(itemId);
      if (!item) return false;

      const updatedItem = { ...item, sharedInMarketplace: true, lastUpdated: new Date().toISOString() };
      this.inventory.set(itemId, updatedItem);
      await this.saveInventoryToStorage();

      return true;
    } catch (error) {
      console.error('Error sharing item in marketplace:', error);
      return false;
    }
  }

  getInventory(filters?: {
    status?: InventoryItem['status'][];
    category?: FoodCategory[];
    location?: InventoryItem['location'][];
    searchTerm?: string;
  }): InventoryItem[] {
    let items = Array.from(this.inventory.values());

    if (filters) {
      if (filters.status) {
        items = items.filter(item => filters.status!.includes(item.status));
      }
      if (filters.category) {
        items = items.filter(item => filters.category!.includes(item.category));
      }
      if (filters.location) {
        items = items.filter(item => filters.location!.includes(item.location));
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        items = items.filter(item => 
          item.name.toLowerCase().includes(term) ||
          item.originalName.toLowerCase().includes(term)
        );
      }
    }

    // Sort by expiry date, with expired items first, then by urgency
    return items.sort((a, b) => {
      const aDate = new Date(a.estimatedExpiryDate);
      const bDate = new Date(b.estimatedExpiryDate);
      return aDate.getTime() - bDate.getTime();
    });
  }

  getExpiryAlerts(): ExpiryAlert[] {
    const alerts: ExpiryAlert[] = [];
    const today = new Date();

    for (const item of this.inventory.values()) {
      if (item.status === 'used' || item.status === 'donated' || item.status === 'sold') {
        continue;
      }

      const expiryDate = new Date(item.estimatedExpiryDate);
      const diffTime = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let urgency: ExpiryAlert['urgency'];
      let suggestedActions: string[];

      if (daysUntilExpiry < 0) {
        urgency = 'expired';
        suggestedActions = ['Discard safely', 'Check if still usable'];
      } else if (daysUntilExpiry === 0) {
        urgency = 'high';
        suggestedActions = ['Use immediately', 'Cook and freeze', 'Share in marketplace'];
      } else if (daysUntilExpiry <= 1) {
        urgency = 'high';
        suggestedActions = ['Use tomorrow', 'Share in marketplace', 'Prepare meal'];
      } else if (daysUntilExpiry <= 3) {
        urgency = 'medium';
        suggestedActions = ['Plan meals', 'Share in marketplace', 'Freeze if possible'];
      } else if (daysUntilExpiry <= 7) {
        urgency = 'low';
        suggestedActions = ['Include in meal planning'];
      } else {
        continue; // No alert needed
      }

      alerts.push({
        itemId: item.id,
        itemName: item.name,
        daysUntilExpiry,
        urgency,
        suggestedActions,
      });
    }

    // Sort by urgency and then by days until expiry
    const urgencyOrder = { expired: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  }

  getInventoryStats(): InventoryStats {
    const items = Array.from(this.inventory.values());
    const categoryCounts: Record<FoodCategory, number> = {
      fruits: 0, vegetables: 0, dairy: 0, meat: 0, bakery: 0,
      frozen: 0, pantry: 0, snacks: 0, beverages: 0, other: 0
    };

    let freshItems = 0;
    let nearingExpiry = 0;
    let expiredItems = 0;

    items.forEach(item => {
      categoryCounts[item.category]++;

      switch (item.status) {
        case 'fresh':
          freshItems++;
          break;
        case 'nearing':
          nearingExpiry++;
          break;
        case 'expired':
          expiredItems++;
          break;
      }
    });

    return {
      totalItems: items.length,
      freshItems,
      nearingExpiry,
      expiredItems,
      wastePreventedThisMonth: this.getWastePreventionStats(),
      categoryCounts,
    };
  }

  private calculateStatus(estimatedExpiryDate: string): InventoryItem['status'] {
    const today = new Date();
    const expiryDate = new Date(estimatedExpiryDate);
    const diffTime = expiryDate.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 2) return 'nearing';
    return 'fresh';
  }

  private suggestLocation(category: FoodCategory): InventoryItem['location'] {
    switch (category) {
      case 'dairy':
      case 'meat':
        return 'fridge';
      case 'frozen':
        return 'freezer';
      case 'fruits':
      case 'vegetables':
        return 'fridge'; // Most fruits and vegetables go in fridge
      case 'bakery':
        return 'counter';
      default:
        return 'pantry';
    }
  }

  private async scheduleExpiryNotifications(item: InventoryItem): Promise<void> {
    const expiryDate = new Date(item.estimatedExpiryDate);
    const now = new Date();

    // Schedule notification 1 day before expiry
    const oneDayBefore = new Date(expiryDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    if (oneDayBefore > now) {
      const notificationId = await notificationService.scheduleExpiryReminder({
        id: item.id,
        name: item.name,
        expiryDate: item.estimatedExpiryDate,
      });

      if (notificationId) {
        item.notificationIds.push(notificationId);
      }
    }
  }

  private scheduleExpiryChecks(): void {
    // Check for expiry alerts every day at 9 AM
    const checkInterval = 24 * 60 * 60 * 1000; // 24 hours

    setInterval(async () => {
      await this.performDailyExpiryCheck();
    }, checkInterval);

    // Also check immediately
    this.performDailyExpiryCheck();
  }

  private async performDailyExpiryCheck(): Promise<void> {
    const alerts = this.getExpiryAlerts();
    const highUrgencyAlerts = alerts.filter(alert => 
      alert.urgency === 'high' || alert.urgency === 'expired'
    );

    if (highUrgencyAlerts.length > 0) {
      await notificationService.sendLocalNotification({
        title: `⚠️ ${highUrgencyAlerts.length} Food Items Need Attention!`,
        body: `Check your inventory - items are expiring soon`,
        data: { type: 'daily_expiry_check', alertCount: highUrgencyAlerts.length },
        sound: true,
      });
    }

    // Update item statuses
    for (const item of this.inventory.values()) {
      const newStatus = this.calculateStatus(item.estimatedExpiryDate);
      if (newStatus !== item.status) {
        await this.updateItem(item.id, { status: newStatus });
      }
    }
  }

  private async updateWastePreventionStats(item: InventoryItem, action: 'used' | 'donated' | 'sold'): Promise<void> {
    try {
      const stats = await this.getFromStorage('wastePreventionStats');
      const currentStats = stats ? JSON.parse(stats) : {
        itemCount: 0,
        estimatedValue: 0,
        co2Saved: 0,
        lastUpdated: new Date().getMonth(),
      };

      const currentMonth = new Date().getMonth();
      if (currentStats.lastUpdated !== currentMonth) {
        // Reset monthly stats
        currentStats.itemCount = 0;
        currentStats.estimatedValue = 0;
        currentStats.co2Saved = 0;
        currentStats.lastUpdated = currentMonth;
      }

      // Estimate CO2 savings (rough approximation)
      const co2PerItem = this.estimateCO2Footprint(item);

      currentStats.itemCount += 1;
      currentStats.estimatedValue += item.price;
      currentStats.co2Saved += co2PerItem;

      await this.setToStorage('wastePreventionStats', JSON.stringify(currentStats));

      // Send celebration notification for milestones
      if (currentStats.itemCount % 10 === 0) {
        await notificationService.notifyWastePrevented({
          itemsSaved: currentStats.itemCount,
          moneySaved: currentStats.estimatedValue,
          co2Saved: currentStats.co2Saved,
        });
      }

    } catch (error) {
      console.error('Error updating waste prevention stats:', error);
    }
  }

  private estimateCO2Footprint(item: InventoryItem): number {
    // Rough estimates in kg CO2 per item
    const co2PerCategory: Record<FoodCategory, number> = {
      meat: 15.0,
      dairy: 3.0,
      fruits: 0.5,
      vegetables: 0.3,
      bakery: 1.0,
      beverages: 0.7,
      frozen: 1.5,
      pantry: 0.8,
      snacks: 1.2,
      other: 1.0,
    };

    return co2PerCategory[item.category] || 1.0;
  }

  private getWastePreventionStats(): InventoryStats['wastePreventedThisMonth'] {
    // This would be loaded from storage in a real implementation
    return {
      itemCount: 12,
      estimatedValue: 156.50,
      co2Saved: 15.3,
    };
  }

  // Public methods for external use
  async refreshInventory(): Promise<void> {
    await this.loadInventoryFromStorage();
  }

  async exportInventory(): Promise<string> {
    const items = Array.from(this.inventory.values());
    return JSON.stringify(items, null, 2);
  }

  async importInventory(data: string): Promise<boolean> {
    try {
      const items: InventoryItem[] = JSON.parse(data);
      this.inventory.clear();
      items.forEach(item => this.inventory.set(item.id, item));
      await this.saveInventoryToStorage();
      return true;
    } catch (error) {
      console.error('Error importing inventory:', error);
      return false;
    }
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();
export default InventoryService;
