// services/ReceiptProcessor.ts
import { Platform } from 'react-native';

export interface ReceiptItem {
  id: string;
  name: string;
  originalName: string; // Raw name from receipt
  quantity: number;
  unit: string;
  price: number;
  category: FoodCategory;
  estimatedExpiryDate: string;
  confidence: number; // 0-1 confidence in expiry estimation
  barcode?: string;
  brand?: string;
}

export interface ProcessedReceipt {
  id: string;
  storeName: string;
  storeAddress?: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
  rawText: string;
  processingDate: string;
}

export type FoodCategory = 
  | 'fruits' 
  | 'vegetables' 
  | 'dairy' 
  | 'meat' 
  | 'bakery' 
  | 'frozen' 
  | 'pantry' 
  | 'snacks' 
  | 'beverages' 
  | 'other';

interface ExpiryRule {
  category: FoodCategory;
  baseShelfLife: number; // days
  storageConditions: {
    room: number;
    refrigerated: number;
    frozen: number;
  };
  keywords: string[];
}

class ReceiptProcessor {
  private apiKey: string | null = null;
  private expiryRules: ExpiryRule[] = [];

  constructor() {
    this.initializeExpiryRules();
  }

  private initializeExpiryRules() {
    this.expiryRules = [
      {
        category: 'fruits',
        baseShelfLife: 7,
        storageConditions: { room: 3, refrigerated: 7, frozen: 365 },
        keywords: ['apple', 'banana', 'orange', 'strawberry', 'grape', 'pear', 'peach', 'plum', 'cherry', 'berry', 'fruit', 'citrus']
      },
      {
        category: 'vegetables',
        baseShelfLife: 5,
        storageConditions: { room: 3, refrigerated: 10, frozen: 365 },
        keywords: ['carrot', 'potato', 'tomato', 'onion', 'pepper', 'lettuce', 'spinach', 'broccoli', 'cucumber', 'vegetable', 'salad']
      },
      {
        category: 'dairy',
        baseShelfLife: 7,
        storageConditions: { room: 0.5, refrigerated: 14, frozen: 90 },
        keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'dairy', 'cottage', 'mozzarella', 'cheddar']
      },
      {
        category: 'meat',
        baseShelfLife: 3,
        storageConditions: { room: 0.25, refrigerated: 5, frozen: 365 },
        keywords: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'meat', 'steak', 'ground', 'sausage']
      },
      {
        category: 'bakery',
        baseShelfLife: 3,
        storageConditions: { room: 3, refrigerated: 7, frozen: 90 },
        keywords: ['bread', 'bagel', 'muffin', 'cake', 'pastry', 'croissant', 'bun', 'roll', 'bakery']
      },
      {
        category: 'frozen',
        baseShelfLife: 365,
        storageConditions: { room: 1, refrigerated: 1, frozen: 365 },
        keywords: ['frozen', 'ice cream', 'popsicle', 'freeze']
      },
      {
        category: 'pantry',
        baseShelfLife: 365,
        storageConditions: { room: 365, refrigerated: 365, frozen: 365 },
        keywords: ['pasta', 'rice', 'beans', 'cereal', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'canned']
      },
      {
        category: 'beverages',
        baseShelfLife: 30,
        storageConditions: { room: 30, refrigerated: 60, frozen: 365 },
        keywords: ['juice', 'soda', 'water', 'beer', 'wine', 'coffee', 'tea', 'drink', 'beverage']
      },
      {
        category: 'snacks',
        baseShelfLife: 90,
        storageConditions: { room: 90, refrigerated: 90, frozen: 365 },
        keywords: ['chips', 'crackers', 'cookies', 'candy', 'chocolate', 'nuts', 'snack']
      }
    ];
  }

  async processReceiptImage(imageUri: string): Promise<ProcessedReceipt> {
    try {
      // Step 1: Extract text from receipt using OCR
      const extractedText = await this.extractTextFromImage(imageUri);
      
      // Step 2: Parse the extracted text
      const parsedData = this.parseReceiptText(extractedText);
      
      // Step 3: Process items and estimate expiry dates
      const processedItems = await this.processItems(parsedData.items);
      
      return {
        id: this.generateId(),
        storeName: parsedData.storeName,
        storeAddress: parsedData.storeAddress,
        date: parsedData.date,
        totalAmount: parsedData.totalAmount,
        items: processedItems,
        rawText: extractedText,
        processingDate: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error('Error processing receipt:', error);
      throw new Error('Failed to process receipt');
    }
  }

  private async extractTextFromImage(imageUri: string): Promise<string> {
    if (Platform.OS === 'web') {
      return this.extractTextWeb(imageUri);
    } else {
      return this.extractTextMobile(imageUri);
    }
  }

  private async extractTextWeb(imageUri: string): Promise<string> {
    // For web, we'll simulate OCR or use a service like Tesseract.js
    try {
      // In a real implementation, you'd use Tesseract.js or send to your backend
      // For now, we'll return mock data for demonstration
      return this.getMockReceiptText();
    } catch (error) {
      console.error('Web OCR error:', error);
      return this.getMockReceiptText();
    }
  }

  private async extractTextMobile(imageUri: string): Promise<string> {
    try {
      // You can use expo-document-picker with ML Kit or send to AWS Textract
      // For now, we'll return mock data for demonstration
      return this.getMockReceiptText();
    } catch (error) {
      console.error('Mobile OCR error:', error);
      return this.getMockReceiptText();
    }
  }

  private getMockReceiptText(): string {
    return `
    SUPER PHARM
    123 Dizengoff Street, Tel Aviv
    Receipt #: 12345
    Date: 20/07/2025 14:30
    
    Fresh Milk 1L              12.90
    Whole Wheat Bread          8.50
    Bananas 1kg               15.30
    Greek Yogurt 500g         18.90
    Chicken Breast 800g       32.00
    Tomatoes 500g             12.50
    Olive Oil 500ml           25.90
    
    Subtotal:                125.00
    Tax:                      21.25
    Total:                   146.25
    
    Thank you for shopping!
    `;
  }

  private parseReceiptText(text: string): {
    storeName: string;
    storeAddress?: string;
    date: string;
    totalAmount: number;
    items: Array<{
      name: string;
      price: number;
      quantity: number;
      unit: string;
    }>;
  } {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract store name (usually first line)
    const storeName = lines[0] || 'Unknown Store';
    
    // Extract date using regex
    const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4})/;
    const dateMatch = text.match(dateRegex);
    const date = dateMatch ? this.parseDate(dateMatch[1]) : new Date().toISOString().split('T')[0];
    
    // Extract total amount
    const totalRegex = /total:?\s*(\d+\.?\d*)/i;
    const totalMatch = text.match(totalRegex);
    const totalAmount = totalMatch ? parseFloat(totalMatch[1]) : 0;
    
    // Extract address
    const addressRegex = /\d+\s+[^,\n]+/;
    const addressMatch = text.match(addressRegex);
    const storeAddress = addressMatch ? addressMatch[0] : undefined;
    
    // Extract items
    const items = this.extractItems(lines);
    
    return {
      storeName,
      storeAddress,
      date,
      totalAmount,
      items,
    };
  }

  private extractItems(lines: string[]): Array<{
    name: string;
    price: number;
    quantity: number;
    unit: string;
  }> {
    const items: Array<{
      name: string;
      price: number;
      quantity: number;
      unit: string;
    }> = [];
    
    // Look for lines that contain both text and prices
    const itemRegex = /^(.+?)\s+(\d+\.?\d*)$/;
    
    for (const line of lines) {
      const match = line.match(itemRegex);
      if (match && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('tax')) {
        const name = match[1].trim();
        const price = parseFloat(match[2]);
        
        // Extract quantity and unit from name
        const { cleanName, quantity, unit } = this.extractQuantityAndUnit(name);
        
        items.push({
          name: cleanName,
          price,
          quantity,
          unit,
        });
      }
    }
    
    return items;
  }

  private extractQuantityAndUnit(name: string): {
    cleanName: string;
    quantity: number;
    unit: string;
  } {
    // Common patterns: "Item 1kg", "Item 500g", "Item 2L", "Item x2"
    const patterns = [
      /(.+?)\s+(\d+\.?\d*)\s*(kg|g|l|ml|units?|pcs?|pieces?)$/i,
      /(.+?)\s+x\s*(\d+)/i,
      /(\d+\.?\d*)\s*(kg|g|l|ml|units?|pcs?|pieces?)\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        if (pattern === patterns[0]) {
          return {
            cleanName: match[1].trim(),
            quantity: parseFloat(match[2]),
            unit: match[3].toLowerCase(),
          };
        } else if (pattern === patterns[1]) {
          return {
            cleanName: match[1].trim(),
            quantity: parseInt(match[2]),
            unit: 'units',
          };
        } else if (pattern === patterns[2]) {
          return {
            cleanName: match[3].trim(),
            quantity: parseFloat(match[1]),
            unit: match[2].toLowerCase(),
          };
        }
      }
    }
    
    // Default case
    return {
      cleanName: name,
      quantity: 1,
      unit: 'units',
    };
  }

  private async processItems(rawItems: Array<{
    name: string;
    price: number;
    quantity: number;
    unit: string;
  }>): Promise<ReceiptItem[]> {
    const processedItems: ReceiptItem[] = [];
    
    for (const rawItem of rawItems) {
      const category = this.categorizeItem(rawItem.name);
      const estimatedExpiryDate = this.estimateExpiryDate(rawItem.name, category);
      const confidence = this.calculateConfidence(rawItem.name, category);
      
      processedItems.push({
        id: this.generateId(),
        name: this.cleanItemName(rawItem.name),
        originalName: rawItem.name,
        quantity: rawItem.quantity,
        unit: rawItem.unit,
        price: rawItem.price,
        category,
        estimatedExpiryDate,
        confidence,
      });
    }
    
    return processedItems;
  }

  private categorizeItem(itemName: string): FoodCategory {
    const name = itemName.toLowerCase();
    
    for (const rule of this.expiryRules) {
      for (const keyword of rule.keywords) {
        if (name.includes(keyword.toLowerCase())) {
          return rule.category;
        }
      }
    }
    
    return 'other';
  }

  private estimateExpiryDate(itemName: string, category: FoodCategory): string {
    const rule = this.expiryRules.find(r => r.category === category);
    if (!rule) {
      // Default to 30 days for unknown items
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      return expiryDate.toISOString().split('T')[0];
    }
    
    // Determine storage condition based on category
    let shelfLife = rule.baseShelfLife;
    
    // Special cases based on item name
    const name = itemName.toLowerCase();
    if (name.includes('fresh')) {
      shelfLife = Math.min(shelfLife, rule.storageConditions.refrigerated);
    } else if (name.includes('frozen')) {
      shelfLife = rule.storageConditions.frozen;
    } else if (category === 'dairy' || category === 'meat') {
      shelfLife = rule.storageConditions.refrigerated;
    }
    
    // Adjust based on brand patterns (premium brands might last longer)
    if (name.includes('organic') || name.includes('premium')) {
      shelfLife = Math.floor(shelfLife * 1.2);
    }
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + shelfLife);
    
    return expiryDate.toISOString().split('T')[0];
  }

  private calculateConfidence(itemName: string, category: FoodCategory): number {
    let confidence = 0.5; // Base confidence
    
    const name = itemName.toLowerCase();
    const rule = this.expiryRules.find(r => r.category === category);
    
    if (rule) {
      // Higher confidence if we found exact keyword matches
      const keywordMatches = rule.keywords.filter(keyword => 
        name.includes(keyword.toLowerCase())
      ).length;
      
      confidence = Math.min(0.5 + (keywordMatches * 0.15), 0.95);
    }
    
    // Reduce confidence for generic names
    if (name.length < 5 || name.includes('item') || name.includes('product')) {
      confidence *= 0.7;
    }
    
    // Increase confidence for specific brands or detailed names
    if (name.length > 15 || name.includes('organic') || name.includes('fresh')) {
      confidence = Math.min(confidence * 1.2, 0.95);
    }
    
    return Math.round(confidence * 100) / 100;
  }

  private cleanItemName(name: string): string {
    // Remove common receipt artifacts and clean up the name
    return name
      .replace(/^\d+\s*x\s*/i, '') // Remove "2x " prefix
      .replace(/\s+\d+\.?\d*\s*(kg|g|l|ml|units?|pcs?)$/i, '') // Remove quantity suffix
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private parseDate(dateString: string): string {
    try {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2]);
        
        const date = new Date(year, month, day);
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Date parsing error:', error);
    }
    
    return new Date().toISOString().split('T')[0];
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Advanced features for future implementation

  async improveAccuracyWithPhoto(receiptItem: ReceiptItem, photoUri: string): Promise<ReceiptItem> {
    // Use computer vision to analyze the actual food item
    // This would integrate with YOLOv8 or similar models
    
    try {
      // For now, slightly improve confidence if photo is provided
      return {
        ...receiptItem,
        confidence: Math.min(receiptItem.confidence + 0.1, 0.95),
      };
    } catch (error) {
      console.error('Photo analysis error:', error);
      return receiptItem;
    }
  }

  async learnFromUserFeedback(itemId: string, actualExpiryDate: string): Promise<void> {
    // Store user feedback to improve future predictions
    // This would feed into your machine learning model
    
    try {
      // Send feedback to your backend for ML model training
      console.log(`Learning from feedback for item ${itemId}: actual expiry ${actualExpiryDate}`);
    } catch (error) {
      console.error('Feedback learning error:', error);
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }
}

// Export singleton instance
export const receiptProcessor = new ReceiptProcessor();
export default ReceiptProcessor;
