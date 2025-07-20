// services/NotificationService.ts
import { Platform, Alert } from 'react-native';

// Platform-specific imports
let Notifications: any = null;
let Device: any = null;

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  } catch (error) {
    console.log('Expo notifications not installed');
  }
}

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  badge?: number;
}

export interface ScheduledNotificationData extends NotificationData {
  trigger: {
    seconds?: number;
    date?: Date;
    repeats?: boolean;
  };
}

class NotificationService {
  private expoPushToken: string | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;

    if (Platform.OS === 'web') {
      await this.initializeWebNotifications();
    } else {
      await this.initializeMobileNotifications();
    }

    this.isInitialized = true;
  }

  private async initializeWebNotifications() {
    // Web notifications using Service Worker
    if ('serviceWorker' in navigator && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Web notifications enabled');
        }
      } catch (error) {
        console.log('Web notifications not supported');
      }
    }
  }

  private async initializeMobileNotifications() {
    if (!Notifications || !Device) {
      console.log('Expo notifications not available');
      return;
    }

    try {
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Get permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Enable notifications to get alerts about expiring food items'
        );
        return;
      }

      // Get push token for remote notifications
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'your-expo-project-id', // Replace with your actual project ID
        });
        this.expoPushToken = token.data;
        console.log('Push token:', this.expoPushToken);
      }

    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async sendLocalNotification(data: NotificationData): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return this.sendWebNotification(data);
      } else {
        return this.sendMobileNotification(data);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  private sendWebNotification(data: NotificationData): boolean {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.body,
        icon: '/assets/icon.png', // Your app icon
        badge: '/assets/badge.png',
        data: data.data,
      });
      return true;
    }
    return false;
  }

  private async sendMobileNotification(data: NotificationData): Promise<boolean> {
    if (!Notifications) return false;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data,
          sound: data.sound !== false,
          badge: data.badge,
        },
        trigger: null, // Show immediately
      });
      return true;
    } catch (error) {
      console.error('Error sending mobile notification:', error);
      return false;
    }
  }

  async scheduleNotification(data: ScheduledNotificationData): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return this.scheduleWebNotification(data);
      } else {
        return this.scheduleMobileNotification(data);
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  private scheduleWebNotification(data: ScheduledNotificationData): string | null {
    // Web doesn't support scheduled notifications natively
    // We can use setTimeout as a simple alternative
    const delay = data.trigger.seconds ? data.trigger.seconds * 1000 : 
                 data.trigger.date ? data.trigger.date.getTime() - Date.now() : 0;

    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        this.sendWebNotification(data);
      }, delay);

      return timeoutId.toString();
    }

    return null;
  }

  private async scheduleMobileNotification(data: ScheduledNotificationData): Promise<string | null> {
    if (!Notifications) return null;

    try {
      let trigger: any = null;

      if (data.trigger.seconds) {
        trigger = { seconds: data.trigger.seconds };
      } else if (data.trigger.date) {
        trigger = { date: data.trigger.date };
      }

      if (data.trigger.repeats) {
        trigger.repeats = true;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data,
          sound: data.sound !== false,
          badge: data.badge,
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling mobile notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Cancel timeout for web
        clearTimeout(parseInt(notificationId));
        return true;
      } else if (Notifications) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  }

  async cancelAllNotifications(): Promise<boolean> {
    try {
      if (Platform.OS !== 'web' && Notifications) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      return false;
    }
  }

  // ShelfLife.AI specific notification helpers
  async notifyFoodExpiring(foodItem: {
    name: string;
    expiryDate: string;
    daysLeft: number;
  }): Promise<boolean> {
    const title = `⏰ Food Expiring Soon!`;
    let body: string;

    if (foodItem.daysLeft === 0) {
      body = `${foodItem.name} expires today! Consider using, donating, or selling it.`;
    } else if (foodItem.daysLeft === 1) {
      body = `${foodItem.name} expires tomorrow. Don't let it go to waste!`;
    } else {
      body = `${foodItem.name} expires in ${foodItem.daysLeft} days. Plan to use it soon!`;
    }

    return this.sendLocalNotification({
      title,
      body,
      data: { type: 'food_expiring', foodItem },
      sound: true,
    });
  }

  async scheduleExpiryReminder(foodItem: {
    id: string;
    name: string;
    expiryDate: string;
  }): Promise<string | null> {
    const expiryDate = new Date(foodItem.expiryDate);
    const reminderDate = new Date(expiryDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before

    return this.scheduleNotification({
      title: '⏰ Food Expiring Tomorrow!',
      body: `${foodItem.name} expires tomorrow. Consider using or sharing it!`,
      data: { type: 'expiry_reminder', foodItem },
      trigger: { date: reminderDate },
      sound: true,
    });
  }

  async notifyMarketplaceInterest(item: {
    name: string;
    buyer: string;
  }): Promise<boolean> {
    return this.sendLocalNotification({
      title: '🛒 Someone\'s interested in your item!',
      body: `${item.buyer} is interested in your ${item.name}`,
      data: { type: 'marketplace_interest', item },
      sound: true,
    });
  }

  async notifyWastePrevented(stats: {
    itemsSaved: number;
    moneySaved: number;
    co2Saved: number;
  }): Promise<boolean> {
    return this.sendLocalNotification({
      title: '🌱 Great job preventing waste!',
      body: `You've saved ${stats.itemsSaved} items, ₪${stats.moneySaved}, and ${stats.co2Saved}kg CO2 this month!`,
      data: { type: 'waste_prevented', stats },
      sound: true,
    });
  }

  // Get push token for server-side notifications
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Register device token with your backend
  async registerDeviceToken(userId: string): Promise<boolean> {
    if (!this.expoPushToken) return false;

    try {
      // Replace with your actual API endpoint
      const response = await fetch('https://your-api.com/register-push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token: this.expoPushToken,
          platform: Platform.OS,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default NotificationService;
