'use client';

import { useState } from 'react';
import { Check, Plus, Trash2, ShoppingCart, Store } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatPrice } from '@/lib/utils';

export default function ShoppingList() {
  const { isLoading, error, data } = db.useQuery({
    shoppingList: {
      ingredient: {},
    },
  });

  const items = data?.shoppingList || [];

  // Group by shop
  const groupedByShop = items.reduce((acc: any, item: any) => {
    const shop = item.ingredient?.shop || 'Unbekannt';
    if (!acc[shop]) {
      acc[shop] = [];
    }
    acc[shop].push(item);
    return acc;
  }, {});

  // Calculate totals
  const totalItems = items.length;
  const checkedItems = items.filter((item: any) => item.checked).length;
  const totalCost = items.reduce(
    (sum: number, item: any) => sum + (item.estimatedPrice || 0),
    0
  );

  const handleToggleCheck = (itemId: string, currentState: boolean) => {
    db.transact([
      db.tx.shoppingList[itemId].update({
        checked: !currentState,
      }),
    ]);
  };

  const handleDeleteItem = (itemId: string) => {
    db.transact([db.tx.shoppingList[itemId].delete()]);
  };

  const handleClearChecked = () => {
    const checkedIds = items
      .filter((item: any) => item.checked)
      .map((item: any) => item.id);

    db.transact(
      checkedIds.map((id: string) => db.tx.shoppingList[id].delete())
    );
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
        <h2 className="text-2xl font-bold">Einkaufsliste</h2>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700">
          <Plus className="w-5 h-5" />
          <span>Hinzufügen</span>
        </button>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg p-6 shadow-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold">{totalItems}</div>
            <div className="text-sm opacity-90">Artikel</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{checkedItems}</div>
            <div className="text-sm opacity-90">Erledigt</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{formatPrice(totalCost)}</div>
            <div className="text-sm opacity-90">Geschätzt</div>
          </div>
        </div>
        {checkedItems > 0 && (
          <button
            onClick={handleClearChecked}
            className="w-full mt-4 bg-white text-primary-600 py-2 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Erledigte entfernen ({checkedItems})
          </button>
        )}
      </div>

      {/* Shopping List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Einkaufsliste leer</h3>
          <p className="text-gray-600 mb-6">
            Füge Zutaten aus Rezepten hinzu oder erstelle manuell Einträge
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByShop).map(([shop, shopItems]: [string, any]) => (
            <div key={shop} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Shop Header */}
              <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Store className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold">{shop}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {shopItems.filter((i: any) => i.checked).length}/{shopItems.length}
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-200">
                {shopItems.map((item: any) => (
                  <ShoppingListItem
                    key={item.id}
                    item={item}
                    onToggle={() => handleToggleCheck(item.id, item.checked)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShoppingListItem({
  item,
  onToggle,
  onDelete,
}: {
  item: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`p-4 flex items-center space-x-4 swipeable ${
        item.checked ? 'bg-gray-50' : 'hover:bg-gray-50'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
          item.checked
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-primary-500'
        }`}
      >
        {item.checked && <Check className="w-5 h-5 text-white" />}
      </button>

      {/* Item Info */}
      <div className={`flex-1 ${item.checked ? 'opacity-50' : ''}`}>
        <div className={`font-semibold ${item.checked ? 'line-through' : ''}`}>
          {item.ingredient?.name || 'Unbekannt'}
        </div>
        <div className="text-sm text-gray-600">
          {item.amount} {item.unit}
          {item.estimatedPrice && (
            <span className="ml-2">• {formatPrice(item.estimatedPrice)}</span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
