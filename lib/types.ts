// Type definitions für die Catering App
// Basierend auf InstantDB Schema

export interface Ingredient {
  id: string;
  name: string;
  category?: string;
  shop: string;
  pricePerUnit: number;
  unitSize: number;
  unitType: string;
  pricePerKg?: number;
  pricePerLiter?: number;
  pricePerPiece?: number;
  pricePerHundredGram?: number;
  lastPurchaseDate?: string;
  receiptImageUrl?: string;
  currentStock?: number;
  minStock?: number;
  expiryDate?: string;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  portions: number;
  prepTime?: number;
  category?: string;
  imageUrl?: string;
  allergens?: string;
  notes?: string;
  totalCostPerPortion?: number;
  suggestedMargin?: number;
  customMargin?: number;
  sellingPricePerPortion?: number;
  createdAt?: string;
  recipeIngredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  amount: number;
  unit: string;
  recipe?: { id: string };
  ingredient?: Ingredient;
}

export interface ShoppingListItem {
  id: string;
  amount: number;
  unit: string;
  checked: boolean;
  shop?: string;
  estimatedPrice?: number;
  addedAt?: string;
  priority?: 'high' | 'normal' | 'low';
  ingredient?: Ingredient;
}

export interface Receipt {
  id: string;
  name?: string;
  imageUrl: string;
  storeName?: string;
  totalAmount?: number;
  purchaseDate: string;
  processed: boolean;
  rawOcrText?: string;
}

// Utility types
export type UnitType = 'g' | 'kg' | 'ml' | 'l' | 'Stück' | 'EL' | 'TL' | 'Prise';

export type RecipeCategory = 
  | 'Vorspeise'
  | 'Hauptgericht'
  | 'Beilage'
  | 'Dessert'
  | 'Snack'
  | 'Getränk'
  | 'Sonstiges';

export type IngredientCategory =
  | 'Gemüse'
  | 'Obst'
  | 'Fleisch'
  | 'Fisch'
  | 'Milchprodukte'
  | 'Getreide'
  | 'Gewürze'
  | 'Backwaren'
  | 'Getränke'
  | 'Sonstiges';

// OCR related types
export interface ScannedReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  shop: string;
}

export interface ParsedRecipe {
  name: string;
  portions: number;
  prepTime: number;
  category: string;
  description: string;
  ingredients: ParsedIngredient[];
  steps: string[];
}

export interface ParsedIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
}
