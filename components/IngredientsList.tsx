'use client';

import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Store, FileDown } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatPrice } from '@/lib/utils';
import { exportIngredientsToExcel } from '@/lib/export';
import AddIngredientModal from './AddIngredientModal';

export default function IngredientsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);

  // Query ingredients from InstantDB
  const { isLoading, error, data } = db.useQuery({
    ingredients: {},
  });

  const ingredients = data?.ingredients || [];

  // Filter ingredients
  const filteredIngredients = ingredients.filter((ing: any) =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ing.shop.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by shop
  const groupedByShop = filteredIngredients.reduce((acc: any, ing: any) => {
    if (!acc[ing.shop]) {
      acc[ing.shop] = [];
    }
    acc[ing.shop].push(ing);
    return acc;
  }, {});

  const handleDelete = (id: string) => {
    if (window.confirm('Möchtest du diese Zutat wirklich löschen?')) {
      db.transact([db.tx.ingredients[id].delete()]);
    }
  };

  const handleEdit = (ingredient: any) => {
    setEditingIngredient(ingredient);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingIngredient(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">Fehler beim Laden der Zutaten</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">Zutatendatenbank</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportIngredientsToExcel(ingredients)}
            disabled={ingredients.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50"
          >
            <FileDown className="w-5 h-5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            <span>Neue Zutat</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Zutaten oder Läden suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Ingredients grouped by shop */}
      {ingredients.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2 dark:text-white">Noch keine Zutaten</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Scanne deinen ersten Kassenbon oder füge Zutaten manuell hinzu
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Erste Zutat hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByShop).map(([shop, items]: [string, any]) => (
            <div key={shop} className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center space-x-2">
                <Store className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold dark:text-white">{shop}</h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">({items.length})</span>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((ingredient: any) => (
                  <IngredientItem 
                    key={ingredient.id} 
                    ingredient={ingredient} 
                    onEdit={() => handleEdit(ingredient)}
                    onDelete={() => handleDelete(ingredient.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Ingredient Modal */}
      <AddIngredientModal 
        isOpen={showAddModal} 
        onClose={handleCloseModal}
        initialData={editingIngredient}
      />
    </div>
  );
}

function IngredientItem({ ingredient, onEdit, onDelete }: { ingredient: any; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-lg dark:text-white">{ingredient.name}</h4>
          <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="font-medium">
                {formatPrice(ingredient.pricePerUnit)} für {ingredient.unitSize}
                {ingredient.unitType}
              </span>
            </div>
            {ingredient.pricePerKg && (
              <div>Pro kg: {formatPrice(ingredient.pricePerKg)}</div>
            )}
            {ingredient.pricePerHundredGram && (
              <div>Pro 100g: {formatPrice(ingredient.pricePerHundredGram)}</div>
            )}
            {ingredient.pricePerLiter && (
              <div>Pro Liter: {formatPrice(ingredient.pricePerLiter)}</div>
            )}
            {ingredient.pricePerPiece && (
              <div>Pro Stück: {formatPrice(ingredient.pricePerPiece)}</div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={onEdit}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
