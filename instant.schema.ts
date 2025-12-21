import { i } from "@instantdb/core";

const schema = i.graph(
  {
    "ingredients": i.entity({
      "name": i.string(),
      "category": i.string().optional(),
      "shop": i.string(),
      "pricePerUnit": i.number(),
      "unitSize": i.number(),
      "unitType": i.string(),
      "pricePerKg": i.number().optional(),
      "pricePerLiter": i.number().optional(),
      "pricePerPiece": i.number().optional(),
      "pricePerHundredGram": i.number().optional(),
      "lastPurchaseDate": i.string().optional(),
      "receiptImageUrl": i.string().optional(),
      "currentStock": i.number().optional(),
      "minStock": i.number().optional(),
      "expiryDate": i.string().optional(),
      "notes": i.string().optional()
    }),
    "recipes": i.entity({
      "name": i.string(),
      "description": i.string().optional(),
      "portions": i.number(),
      "prepTime": i.number().optional(),
      "category": i.string().optional(),
      "imageUrl": i.string().optional(),
      "allergens": i.string().optional(),
      "notes": i.string().optional(),
      "preparationSteps": i.string().optional(),
      "totalCostPerPortion": i.number().optional(),
      "suggestedMargin": i.number().optional(),
      "customMargin": i.number().optional(),
      "sellingPricePerPortion": i.number().optional(),
      "createdAt": i.string().optional()
    }),
    "recipeIngredients": i.entity({
      "amount": i.number(),
      "unit": i.string()
    }),
    "shoppingList": i.entity({
      "amount": i.number(),
      "unit": i.string(),
      "checked": i.boolean(),
      "shop": i.string().optional(),
      "estimatedPrice": i.number().optional(),
      "addedAt": i.string().optional(),
      "priority": i.string().optional()
    }),
    "receipts": i.entity({
      "imageUrl": i.string(),
      "storeName": i.string().optional(),
      "totalAmount": i.number().optional(),
      "purchaseDate": i.string(),
      "processed": i.boolean(),
      "rawOcrText": i.string().optional()
    })
  },
  {
    recipesIngredients: {
      forward: {
        on: "recipes",
        has: "many",
        label: "ingredients"
      },
      reverse: {
        on: "recipeIngredients",
        has: "one",
        label: "recipe"
      }
    },
    ingredientsRecipeIngredients: {
      forward: {
        on: "ingredients",
        has: "many",
        label: "recipeIngredients"
      },
      reverse: {
        on: "recipeIngredients",
        has: "one",
        label: "ingredient"
      }
    },
    ingredientsShoppingList: {
      forward: {
        on: "ingredients",
        has: "many",
        label: "shoppingListItems"
      },
      reverse: {
        on: "shoppingList",
        has: "one",
        label: "ingredient"
      }
    }
  }
);

export default schema;
