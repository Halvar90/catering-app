'use client';

import { useState } from 'react';
import { Plus, Calculator, Edit2, Trash2, ChefHat } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatPrice, getSuggestedMargin, calculateSellingPrice } from '@/lib/utils';

export default function RecipesList() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  const { isLoading, error, data } = db.useQuery({
    recipes: {
      $: {
        order: {
          serverCreatedAt: 'desc',
        },
      },
    },
  });

  const recipes = data?.recipes || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rezepte</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          <span>Rezept erstellen</span>
        </button>
      </div>

      {/* Recipes Grid */}
      {recipes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Noch keine Rezepte</h3>
          <p className="text-gray-600 mb-6">
            Erstelle dein erstes Rezept und berechne automatisch die Kosten
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Erstes Rezept erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe: any) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      )}

      {/* Recipe Detail Modal with Margin Calculator */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}

function RecipeCard({ recipe, onClick }: { recipe: any; onClick: () => void }) {
  const costPerPortion = recipe.totalCostPerPortion || 0;
  const margin = recipe.customMargin || recipe.suggestedMargin || 0;
  const sellingPrice = calculateSellingPrice(costPerPortion, margin);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
    >
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
          <ChefHat className="w-16 h-16 text-white opacity-50" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{recipe.name}</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div>{recipe.portions} Portionen</div>
          {recipe.prepTime && <div>{recipe.prepTime} Min.</div>}
          <div className="pt-2 border-t border-gray-200 mt-2">
            <div className="flex justify-between items-center">
              <span>Kosten/Portion:</span>
              <span className="font-semibold text-gray-800">
                {formatPrice(costPerPortion)}
              </span>
            </div>
            <div className="flex justify-between items-center text-green-600 font-semibold">
              <span>Verkauf:</span>
              <span>{formatPrice(sellingPrice)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipeDetailModal({ recipe, onClose }: { recipe: any; onClose: () => void }) {
  const [customMargin, setCustomMargin] = useState(
    recipe.customMargin || recipe.suggestedMargin || getSuggestedMargin(recipe.totalCostPerPortion || 0)
  );

  const costPerPortion = recipe.totalCostPerPortion || 0;
  const suggestedMargin = getSuggestedMargin(costPerPortion);
  const sellingPrice = calculateSellingPrice(costPerPortion, customMargin);
  const profit = sellingPrice - costPerPortion;

  const handleSaveMargin = () => {
    db.transact([
      db.tx.recipes[recipe.id].update({
        customMargin,
        sellingPricePerPortion: sellingPrice,
      }),
    ]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{recipe.name}</h2>
              {recipe.description && (
                <p className="text-gray-600 mt-2">{recipe.description}</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <Calculator className="w-5 h-5" />
              <span>Kostenberechnung</span>
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Portionen:</span>
                <span className="font-semibold">{recipe.portions}</span>
              </div>
              <div className="flex justify-between">
                <span>Kosten pro Portion:</span>
                <span className="font-semibold">{formatPrice(costPerPortion)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span>Gesamtkosten:</span>
                <span>{formatPrice(costPerPortion * recipe.portions)}</span>
              </div>
            </div>
          </div>

          {/* Margin Calculator */}
          <div className="bg-primary-50 rounded-lg p-4 border-2 border-primary-200">
            <h3 className="font-semibold mb-4 text-primary-800">
              Profit-Margin Rechner
            </h3>

            {/* Suggested Margin */}
            <div className="mb-4 p-3 bg-white rounded border border-primary-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Empfohlene Marge:</span>
                <span className="font-semibold text-primary-600">{suggestedMargin}%</span>
              </div>
              <button
                onClick={() => setCustomMargin(suggestedMargin)}
                className="text-sm text-primary-600 hover:text-primary-700 mt-1"
              >
                Übernehmen
              </button>
            </div>

            {/* Custom Margin Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Deine Marge (%)
                </label>
                <input
                  type="number"
                  value={customMargin}
                  onChange={(e) => setCustomMargin(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                  step="10"
                />
              </div>

              {/* Range Slider */}
              <input
                type="range"
                value={customMargin}
                onChange={(e) => setCustomMargin(Number(e.target.value))}
                min="0"
                max="500"
                step="10"
                className="w-full"
              />

              {/* Results */}
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span>Verkaufspreis/Portion:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatPrice(sellingPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Gewinn/Portion:</span>
                  <span className="font-semibold text-green-600">
                    {formatPrice(profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Gesamtgewinn ({recipe.portions} Portionen):</span>
                  <span className="font-semibold text-green-600">
                    {formatPrice(profit * recipe.portions)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSaveMargin}
                className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 mt-4"
              >
                Marge speichern
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 flex items-center justify-center space-x-2">
              <Edit2 className="w-5 h-5" />
              <span>Bearbeiten</span>
            </button>
            <button className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 flex items-center justify-center space-x-2">
              <Trash2 className="w-5 h-5" />
              <span>Löschen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
