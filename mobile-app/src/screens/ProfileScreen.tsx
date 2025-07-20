import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserStats {
  totalItems: number;
  wasteReduced: string;
  moneySaved: string;
  itemsShared: number;
  carbonOffset: string;
}

const ProfileScreen: React.FC = () => {
  const [notifications, setNotifications] = useState({
    expiry: true,
    marketplace: true,
    recommendations: false,
  });
  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    allowMessages: true,
    publicProfile: false,
  });

  const userStats: UserStats = {
    totalItems: 127,
    wasteReduced: '8.3 kg',
    moneySaved: '$42.50',
    itemsShared: 15,
    carbonOffset: '18.7 lbs CO₂',
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => {
          // TODO: Implement logout
          Alert.alert('Logged out', 'You have been logged out successfully.');
        }},
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Account Deleted', 'Your account has been deleted.');
        }},
      ]
    );
  };

  const StatCard: React.FC<{ title: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = ({
    title, value, icon, color
  }) => (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const SettingRow: React.FC<{
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    onPress?: () => void;
    showArrow?: boolean;
  }> = ({ title, subtitle, icon, value, onValueChange, onPress, showArrow = false }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={value !== undefined}
    >
      <Ionicons name={icon} size={24} color="#666" style={styles.settingIcon} />
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {value !== undefined && onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#e0e0e0', true: '#2E8B57' }}
          thumbColor={value ? '#ffffff' : '#ffffff'}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      ) : null}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={48} color="#2E8B57" />
        </View>
        <Text style={styles.userName}>John Doe</Text>
        <Text style={styles.userEmail}>john.doe@email.com</Text>
        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>🌱 Your Impact</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Items Tracked"
            value={userStats.totalItems.toString()}
            icon="cube"
            color="#2E8B57"
          />
          <StatCard
            title="Waste Reduced"
            value={userStats.wasteReduced}
            icon="leaf"
            color="#51C878"
          />
          <StatCard
            title="Money Saved"
            value={userStats.moneySaved}
            icon="cash"
            color="#FFD700"
          />
          <StatCard
            title="Items Shared"
            value={userStats.itemsShared.toString()}
            icon="people"
            color="#87CEEB"
          />
        </View>
        <View style={styles.carbonOffset}>
          <Ionicons name="earth" size={24} color="#51C878" />
          <Text style={styles.carbonText}>
            You've prevented {userStats.carbonOffset} of carbon emissions!
          </Text>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notifications</Text>
        <View style={styles.settingsGroup}>
          <SettingRow
            title="Expiry Alerts"
            subtitle="Get notified before items expire"
            icon="notifications"
            value={notifications.expiry}
            onValueChange={(value) => setNotifications(prev => ({ ...prev, expiry: value }))}
          />
          <SettingRow
            title="Marketplace Updates"
            subtitle="New items and messages"
            icon="storefront"
            value={notifications.marketplace}
            onValueChange={(value) => setNotifications(prev => ({ ...prev, marketplace: value }))}
          />
          <SettingRow
            title="Recommendations"
            subtitle="Personalized suggestions"
            icon="bulb"
            value={notifications.recommendations}
            onValueChange={(value) => setNotifications(prev => ({ ...prev, recommendations: value }))}
          />
        </View>
      </View>

      {/* Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Privacy</Text>
        <View style={styles.settingsGroup}>
          <SettingRow
            title="Share Location"
            subtitle="For finding nearby items"
            icon="location"
            value={privacy.shareLocation}
            onValueChange={(value) => setPrivacy(prev => ({ ...prev, shareLocation: value }))}
          />
          <SettingRow
            title="Allow Messages"
            subtitle="From other users"
            icon="chatbubble"
            value={privacy.allowMessages}
            onValueChange={(value) => setPrivacy(prev => ({ ...prev, allowMessages: value }))}
          />
          <SettingRow
            title="Public Profile"
            subtitle="Show your stats to others"
            icon="eye"
            value={privacy.publicProfile}
            onValueChange={(value) => setPrivacy(prev => ({ ...prev, publicProfile: value }))}
          />
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ App Settings</Text>
        <View style={styles.settingsGroup}>
          <SettingRow
            title="Data & Storage"
            subtitle="Manage your data usage"
            icon="server"
            showArrow
            onPress={() => Alert.alert('Data & Storage', 'This feature is coming soon!')}
          />
          <SettingRow
            title="Export Data"
            subtitle="Download your data"
            icon="download"
            showArrow
            onPress={() => Alert.alert('Export Data', 'Your data export has been started.')}
          />
          <SettingRow
            title="Help & Support"
            subtitle="Get help or report issues"
            icon="help-circle"
            showArrow
            onPress={() => Alert.alert('Help & Support', 'Visit our help center at help.shelflife.ai')}
          />
          <SettingRow
            title="About"
            subtitle="App version and info"
            icon="information-circle"
            showArrow
            onPress={() => Alert.alert('About', 'ShelfLife.AI v1.0.0\n\nReduce food waste with AI.')}
          />
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Account</Text>
        <View style={styles.settingsGroup}>
          <SettingRow
            title="Change Password"
            icon="key"
            showArrow
            onPress={() => Alert.alert('Change Password', 'Password reset link sent to your email.')}
          />
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#FF6B6B" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash" size={24} color="#FF6B6B" />
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ for reducing food waste
        </Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: 'white',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f5e8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  editProfileButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#2E8B57',
    borderRadius: 20,
  },
  editProfileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  carbonOffset: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
  },
  carbonText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2E8B57',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  settingsGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginLeft: 12,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileScreen;
