// App.tsx - Simplified with AuthContext for better state management
import React from 'react';
import {
  StatusBar,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import types
import {
  TabParamList,
  HomeStackParamList,
  InventoryStackParamList,
  MarketplaceStackParamList,
  ProfileStackParamList,
} from './src/types/navigation';

// Import context
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Import screens
import { LoginScreen, RegisterScreen } from './src/screens/auth/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AddItemManuallyScreen from './src/screens/AddItemManuallyScreen';
import ReceiptUploadScreen from './src/screens/ReceiptUploadScreen';

// Import components
import LoadingScreen from './src/components/LoadingScreen';
import AuthScreens from './src/components/AuthScreens';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStackNavigator = createStackNavigator<HomeStackParamList>();
const InventoryStackNavigator = createStackNavigator<InventoryStackParamList>();
const MarketplaceStackNavigator = createStackNavigator<MarketplaceStackParamList>();
const ProfileStackNavigator = createStackNavigator<ProfileStackParamList>();

// Stack for Home and related screens
function HomeStack() {
  return (
    <HomeStackNavigator.Navigator>
      <HomeStackNavigator.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ 
          title: 'Dashboard',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
        }}
      />
      <HomeStackNavigator.Screen 
        name="AddItemManually" 
        component={AddItemManuallyScreen}
        options={{ 
          title: 'Add Item',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
        }}
      />
      <HomeStackNavigator.Screen 
        name="ReceiptUpload" 
        component={ReceiptUploadScreen}
        options={{ 
          title: 'Scan Receipt',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
        }}
      />
    </HomeStackNavigator.Navigator>
  );
}

// Stack for Inventory and related screens
function InventoryStack() {
  return (
    <InventoryStackNavigator.Navigator>
      <InventoryStackNavigator.Screen 
        name="InventoryMain" 
        component={InventoryScreen}
        options={{ 
          title: 'My Inventory',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
        }}
      />
      <InventoryStackNavigator.Screen 
        name="AddItemManually" 
        component={AddItemManuallyScreen}
        options={{ 
          title: 'Add Item',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
        }}
      />
    </InventoryStackNavigator.Navigator>
  );
}

// Stack for Marketplace and related screens
function MarketplaceStack() {
  return (
    <MarketplaceStackNavigator.Navigator>
      <MarketplaceStackNavigator.Screen 
        name="MarketplaceMain" 
        component={MarketplaceScreen}
        options={{ 
          title: 'Local Market',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
        }}
      />
    </MarketplaceStackNavigator.Navigator>
  );
}

// Stack for Profile and related screens
function ProfileStack() {
  return (
    <ProfileStackNavigator.Navigator>
      <ProfileStackNavigator.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
        }}
      />
    </ProfileStackNavigator.Navigator>
  );
}

// Main app tabs with proper navigation
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Marketplace') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // Hide header as stacks handle it
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Marketplace" component={MarketplaceStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

// App Content Component (uses AuthContext)
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen during auth check
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show authentication screens
  if (!isAuthenticated) {
    return <AuthScreens />;
  }

  // Show main app for authenticated users
  return (
    <NavigationContainer>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'light-content' : 'default'}
        backgroundColor="#4CAF50"
      />
      <MainTabs />
    </NavigationContainer>
  );
};

// Main App Component with AuthProvider and ErrorBoundary
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;