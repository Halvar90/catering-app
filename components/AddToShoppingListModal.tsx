'use client';

import { useState } from 'react';
import { X, ShoppingCart, Plus, Minus } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatPrice } from '@/lib/utils';

interface Recipe {
  id: string;
  name: string;
  portions: number;
}

interface RecipeIngredient {
  amount: number;
  unit: string;
  ingredient: {
    id: string;
    name: string;
    pricePerUnit: number;
    unitSize: number;
    unitType: string;
    shop: string;
  };
}

interface AddToShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  recipeIngredients: RecipeIngredient[];
}

export default function AddToShoppingListModal({ 
  isOpen, 
  onClose, 
  recipe, 
  recipeIngredients 
}: AddToShoppingListModalProps) {
  const [portions, setPortions] = useState(recipe?.portions || 4);
  const [adding, setAdding] = useState(false);

  if (!isOpen || !recipe) return null;

  // Berechne skalierte Mengen
  const scaledIngredients = recipeIngredients.map((ri) => {
    const scaleFactor = portions / recipe.portions;
    const newAmount = ri.amount * scaleFactor;
    
    // Schätze Preis
    const pricePerUnit = ri.ingredient.pricePerUnit / ri.ingredient.unitSize;
    const estimatedPrice = newAmount * pricePerUnit;

    return {
      ...ri,
      scaledAmount: newAmount,
      estimatedPrice,
    };
  });

  const totalEstimated = scaledIngredients.reduce((sum, ing) => sum + ing.estimatedPrice, 0);

  const handleAddToList = async () => {
    try {
      setAdding(true);

      const transactions = scaledIngredients.map((ing) =>
        db.tx.shoppingList[crypto.randomUUID()].update({
          amount: ing.scaledAmount,
          unit: ing.unit,
          checked: false,
          shop: ing.ingredient.shop,
          estimatedPrice: ing.estimatedPrice,
          addedAt: new Date().toISOString(),
          priority: 'normal',
        }).link({
          ingredient: ing.ingredient.id,
        })
      );

      await db.transact(transactions);

      onClose();
    } catch (error) {
      console.error('Fehler beim Hinzufügen zur Einkaufsliste:', error);
      alert('Fehler beim Hinzufügen zur Einkaufsliste');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Zur Einkaufsliste</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{recipe.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Portionen Eingabe */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Für wie viele Portionen möchtest du einkaufen?
            </label>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setPortions(Math.max(1, portions - 1))}
                className="p-2 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                value={portions}
                onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-center text-2xl font-bold px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
              />
              <button
                onClick={() => setPortions(portions + 1)}
                className="p-2 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
              Original: {recipe.portions} Portionen
            </p>
          </div>

          {/* Zutaten Liste */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
              Benötigte Zutaten:
            </h3>
            {scaledIngredients.map((ing, idx) => (
              <div 
                key={idx}
                className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-white">
                    {ing.ingredient.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {ing.scaledAmount.toFixed(2)} {ing.unit}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    📍 {ing.ingredient.shop}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600 dark:text-primary-400">
                    {formatPrice(ing.estimatedPrice)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Zusammenfassung */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-800 dark:text-white">
                Geschätzte Gesamtkosten:
              </span>
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {formatPrice(totalEstimated)}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              * Basierend auf gespeicherten Preisen
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={adding}
            >
              Abbrechen
            </button>
            <button
              onClick={handleAddToList}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              disabled={adding}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{adding ? 'Wird hinzugefügt...' : 'Zur Einkaufsliste'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
