import { init } from '@instantdb/react';

// Typen für die Datenbank
export type Schema = {
  ingredients: {
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
  };
  recipes: {
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
  };
  recipeIngredients: {
    id: string;
    amount: number;
    unit: string;
  };
  shoppingList: {
    id: string;
    amount: number;
    unit: string;
    checked: boolean;
    shop?: string;
    estimatedPrice?: number;
    addedAt?: string;
    priority?: string;
  };
  receipts: {
    id: string;
    imageUrl: string;
    storeName?: string;
    totalAmount?: number;
    purchaseDate: string;
    processed: boolean;
    rawOcrText?: string;
  };
};

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;

export const db = init<Schema>({ appId: APP_ID });
