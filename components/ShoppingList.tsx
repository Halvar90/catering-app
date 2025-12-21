'use client';

import { useState, useEffect } from 'react';
import { Check, Plus, Trash2, ShoppingCart, Store, ArrowUpDown, FileDown, X } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatPrice } from '@/lib/utils';
import { exportShoppingListToExcel } from '@/lib/export';

type SortOption = 'shop' | 'priority' | 'name' | 'price';

export default function ShoppingList() {
  const [sortBy, setSortBy] = useState<SortOption>('shop');

  // Load sort preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('shoppingListSort') as SortOption;
    if (saved) setSortBy(saved);
  }, []);

  // Save sort preference
  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    localStorage.setItem('shoppingListSort', option);
  };

  const { isLoading, error, data } = db.useQuery({
    shoppingList: {
      ingredient: {},
    },
  });

  let items = data?.shoppingList || [];

  // Sort items
  if (sortBy === 'name') {
    items = [...items].sort((a: any, b: any) => 
      (a.ingredient?.name || '').localeCompare(b.ingredient?.name || '')
    );
  } else if (sortBy === 'price') {
    items = [...items].sort((a: any, b: any) => 
      (b.estimatedPrice || 0) - (a.estimatedPrice || 0)
    );
  } else if (sortBy === 'priority') {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    items = [...items].sort((a: any, b: any) => 
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - 
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 1)
    );
  }

  // Group by shop (default)
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
    if (!window.confirm('Möchtest du wirklich alle erledigten Artikel löschen?')) {
      return;
    }

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold dark:text-white">Einkaufsliste</h2>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportShoppingListToExcel(items)}
            disabled={items.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            <span>Excel Export</span>
          </button>
          
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="shop">Nach Laden</option>
              <option value="priority">Nach Priorität</option>
              <option value="name">Alphabetisch</option>
              <option value="price">Nach Preis</option>
            </select>
          </div>
        </div>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2 dark:text-white">Einkaufsliste leer</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Füge Zutaten aus Rezepten hinzu oder erstelle manuell Einträge
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByShop).map(([shop, shopItems]: [string, any]) => (
            <div key={shop} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* Shop Header */}
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2">
                  <Store className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="font-semibold dark:text-white">{shop}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {shopItems.filter((i: any) => i.checked).length}/{shopItems.length}
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
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
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    const distance = e.targetTouches[0].clientX - touchStart;
    setSwipeOffset(distance);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && !item.checked) {
      onToggle();
    } else if (isLeftSwipe) {
      setIsDeleting(true);
      setTimeout(() => {
        onDelete();
      }, 300);
    }

    setSwipeOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div
      className={`relative overflow-hidden ${isDeleting ? 'opacity-0 transition-opacity duration-300' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe Indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div className={`text-green-500 transition-opacity ${swipeOffset > 20 ? 'opacity-100' : 'opacity-0'}`}>
          ✓ Abhaken
        </div>
        <div className={`text-red-500 transition-opacity ${swipeOffset < -20 ? 'opacity-100' : 'opacity-0'}`}>
          ✗ Löschen
        </div>
      </div>

      {/* Item */}
      <div
        className={`relative p-4 flex items-center space-x-4 bg-white dark:bg-gray-800 transition-transform ${
          item.checked ? 'opacity-50' : ''
        }`}
        style={{
          transform: `translateX(${Math.max(-100, Math.min(100, swipeOffset))}px)`,
        }}
      >
        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center ${
            item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'
          }`}
        >
          {item.checked && <Check className="w-5 h-5 text-white" />}
        </button>

        <div className="flex-1">
          <div className={`font-semibold dark:text-white ${item.checked ? 'line-through' : ''}`}>
            {item.ingredient?.name || 'Unbekannt'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {item.amount} {item.unit}
            {item.estimatedPrice && (
              <span className="ml-2">• {formatPrice(item.estimatedPrice)}</span>
            )}
          </div>
        </div>

        <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
