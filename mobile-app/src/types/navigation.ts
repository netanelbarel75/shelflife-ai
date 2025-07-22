// src/types/navigation.ts - TypeScript navigation types for better type safety
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

// Stack parameter lists for each tab's stack navigator
export type HomeStackParamList = {
  HomeMain: undefined;
  AddItemManually: { editItem?: any } | undefined;
  ReceiptUpload: undefined;
};

export type InventoryStackParamList = {
  InventoryMain: undefined;
  AddItemManually: { editItem?: any } | undefined;
  ItemDetails: { itemId: string };
};

export type MarketplaceStackParamList = {
  MarketplaceMain: undefined;
  ItemDetails: { listingId: string };
  CreateListing: { inventoryItemId?: string } | undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Help: undefined;
};

// Main tab navigator parameter list
export type TabParamList = {
  Home: undefined;
  Inventory: undefined;
  Marketplace: undefined;
  Profile: undefined;
};

// Navigation prop types for type-safe navigation
export type HomeStackNavigationProp = StackNavigationProp<HomeStackParamList>;
export type InventoryStackNavigationProp = StackNavigationProp<InventoryStackParamList>;
export type MarketplaceStackNavigationProp = StackNavigationProp<MarketplaceStackParamList>;
export type ProfileStackNavigationProp = StackNavigationProp<ProfileStackParamList>;

// Composite navigation props for screens that can navigate to other tabs
export type HomeScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<TabParamList>
>;

export type InventoryScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<InventoryStackParamList, 'InventoryMain'>,
  BottomTabNavigationProp<TabParamList>
>;

export type MarketplaceScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<MarketplaceStackParamList, 'MarketplaceMain'>,
  BottomTabNavigationProp<TabParamList>
>;

export type ProfileScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<ProfileStackParamList, 'ProfileMain'>,
  BottomTabNavigationProp<TabParamList>
>;
