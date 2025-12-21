'use client';

import { useState } from 'react';
import { Plus, Calculator, Edit2, Trash2, ChefHat, FileDown, X, ShoppingCart } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatPrice, getSuggestedMargin, calculateSellingPrice } from '@/lib/utils';
import { exportRecipeToPDF, exportCostCalculationPDF } from '@/lib/export';
import AddRecipeModal from './AddRecipeModal';
import AddToShoppingListModal from './AddToShoppingListModal';

export default function RecipesList() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [selectedRecipeForShopping, setSelectedRecipeForShopping] = useState<any>(null);

  const { isLoading, error, data } = db.useQuery({
    recipes: {
      $: {
        order: {
          serverCreatedAt: 'desc',
        },
      },
    },
    ingredients: {},
  });

  const recipes = data?.recipes || [];
  const ingredients = data?.ingredients || [];

  const handleEdit = (recipe: any) => {
    // We need to fetch the recipe ingredients to pass them to the modal
    // Since we can't easily fetch them synchronously here, we might rely on the modal to fetch them 
    // OR we pass what we have. 
    // Ideally, the modal should handle fetching its own dependencies if given an ID, 
    // but our current modal expects `initialData` with `recipeIngredients`.
    // Let's fetch them first or pass the recipe and let the modal handle it?
    // The modal I wrote expects `initialData` to have `recipeIngredients`.
    // But `selectedRecipe` in `RecipeDetailModal` fetches them.
    // Let's use a small trick: The `RecipeDetailModal` already has the ingredients loaded.
    // We can pass them from there.
    
    // However, `handleEdit` is called from `RecipeDetailModal`.
    // So we can pass the full object from there.
    setEditingRecipe(recipe);
    setShowAddModal(true);
    setSelectedRecipe(null); // Close detail modal
  };

  const handleDelete = (recipeId: string) => {
    if (window.confirm('Möchtest du dieses Rezept wirklich löschen?')) {
      db.transact([db.tx.recipes[recipeId].delete()]);
      setSelectedRecipe(null);
    }
  };

  const handleAddToShoppingList = (recipe: any, recipeIngredients: any[]) => {
    setSelectedRecipeForShopping({ ...recipe, recipeIngredients });
    setShowShoppingModal(true);
    setSelectedRecipe(null); // Close detail modal
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingRecipe(null);
  };

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
        <h2 className="text-2xl font-bold dark:text-white">Rezepte</h2>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2 dark:text-white">Noch keine Rezepte</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
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
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddToShoppingList={handleAddToShoppingList}
        />
      )}

      {/* Add Recipe Modal */}
      <AddRecipeModal 
        isOpen={showAddModal} 
        onClose={handleCloseModal}
        ingredients={ingredients}
        initialData={editingRecipe}
      />

      {/* Add to Shopping List Modal */}
      <AddToShoppingListModal
        isOpen={showShoppingModal}
        onClose={() => {
          setShowShoppingModal(false);
          setSelectedRecipeForShopping(null);
        }}
        recipe={selectedRecipeForShopping}
        recipeIngredients={selectedRecipeForShopping?.recipeIngredients || []}
      />
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
      className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
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
        <h3 className="font-semibold text-lg mb-2 dark:text-white">{recipe.name}</h3>
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <div>{recipe.portions} Portionen</div>
          {recipe.prepTime && <div>{recipe.prepTime} Min.</div>}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
            <div className="flex justify-between items-center">
              <span>Kosten/Portion:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {formatPrice(costPerPortion)}
              </span>
            </div>
            <div className="flex justify-between items-center text-green-600 dark:text-green-400 font-semibold">
              <span>Verkauf:</span>
              <span>{formatPrice(sellingPrice)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipeDetailModal({ 
  recipe, 
  onClose, 
  onEdit, 
  onDelete, 
  onAddToShoppingList 
}: { 
  recipe: any; 
  onClose: () => void; 
  onEdit: (r: any) => void; 
  onDelete: (id: string) => void;
  onAddToShoppingList: (recipe: any, ingredients: any[]) => void;
}) {
  const [customMargin, setCustomMargin] = useState(
    recipe.customMargin || recipe.suggestedMargin || getSuggestedMargin(recipe.totalCostPerPortion || 0)
  );

  // Get recipe ingredients
  const { data } = db.useQuery({
    recipeIngredients: {
      $: {
        where: {
          recipeId: recipe.id,
        },
      },
      ingredient: {},
    },
  });

  const recipeIngredients = data?.recipeIngredients || [];

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

  const handleEditClick = () => {
      // Pass the recipe AND the loaded ingredients WITH IDs to the edit handler
      onEdit({
          ...recipe,
          recipeIngredients: recipeIngredients.map(ri => ({
              id: ri.id, // CRITICAL: Include link ID for deletion
              ingredientId: ri.ingredient?.id,
              amount: ri.amount,
              unit: ri.unit
          }))
      });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold dark:text-white">{recipe.name}</h2>
              {recipe.description && (
                <p className="text-gray-600 dark:text-gray-300 mt-2">{recipe.description}</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2 dark:text-white">
              <Calculator className="w-5 h-5" />
              <span>Kostenberechnung</span>
            </h3>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Portionen:</span>
                <span className="font-semibold">{recipe.portions}</span>
              </div>
              <div className="flex justify-between">
                <span>Kosten pro Portion:</span>
                <span className="font-semibold">{formatPrice(costPerPortion)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 dark:border-gray-600 pt-2 dark:text-white">
                <span>Gesamtkosten:</span>
                <span>{formatPrice(costPerPortion * recipe.portions)}</span>
              </div>
            </div>
          </div>

          {/* Margin Calculator */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border-2 border-primary-200 dark:border-primary-800">
            <h3 className="font-semibold mb-4 text-primary-800 dark:text-primary-300">
              Profit-Margin Rechner
            </h3>

            {/* Suggested Margin */}
            <div className="mb-4 p-3 bg-white dark:bg-gray-700 rounded border border-primary-200 dark:border-primary-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Empfohlene Marge:</span>
                <span className="font-semibold text-primary-600 dark:text-primary-400">{suggestedMargin}%</span>
              </div>
              <button
                onClick={() => setCustomMargin(suggestedMargin)}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-1"
              >
                Übernehmen
              </button>
            </div>

            {/* Custom Margin Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Deine Marge (%)
                </label>
                <input
                  type="number"
                  value={customMargin}
                  onChange={(e) => setCustomMargin(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="dark:text-gray-300">Verkaufspreis/Portion:</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatPrice(sellingPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="dark:text-gray-300">Gewinn/Portion:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatPrice(profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="dark:text-gray-300">Gesamtgewinn ({recipe.portions} Portionen):</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
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
            <button 
              onClick={() => exportRecipeToPDF(recipe, recipeIngredients)}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
            >
              <FileDown className="w-5 h-5" />
              <span>PDF Export</span>
            </button>
            <button 
              onClick={() => exportCostCalculationPDF(recipe, recipeIngredients)}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <Calculator className="w-5 h-5" />
              <span>Kalkulation PDF</span>
            </button>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={() => onAddToShoppingList(recipe, recipeIngredients)}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 flex items-center justify-center space-x-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Zur Einkaufsliste</span>
            </button>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={handleEditClick}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2"
            >
              <Edit2 className="w-5 h-5" />
              <span>Bearbeiten</span>
            </button>
            <button 
              onClick={() => onDelete(recipe.id)}
              className="flex-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-5 h-5" />
              <span>Löschen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
