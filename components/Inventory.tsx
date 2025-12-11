'use client';

import { useState } from 'react';
import { Package, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatDate, getExpiryWarning } from '@/lib/utils';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'expiring' | 'low'>('all');

  const { isLoading, error, data } = db.useQuery({
    ingredients: {},
  });

  const ingredients = data?.ingredients || [];

  // Filter ingredients with inventory info
  const inventoryItems = ingredients.filter(
    (ing: any) => ing.currentStock !== undefined && ing.currentStock !== null
  );

  // Apply filters
  const filteredItems = inventoryItems
    .filter((ing: any) =>
      ing.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((ing: any) => {
      if (filterBy === 'expiring' && ing.expiryDate) {
        const warning = getExpiryWarning(ing.expiryDate);
        return warning.isExpiringSoon || warning.isExpired;
      }
      if (filterBy === 'low') {
        return (
          ing.minStock !== undefined &&
          ing.currentStock !== undefined &&
          ing.currentStock <= ing.minStock
        );
      }
      return true;
    });

  // Count warnings
  const expiringCount = inventoryItems.filter((ing: any) => {
    if (!ing.expiryDate) return false;
    const warning = getExpiryWarning(ing.expiryDate);
    return warning.isExpiringSoon || warning.isExpired;
  }).length;

  const lowStockCount = inventoryItems.filter(
    (ing: any) =>
      ing.minStock !== undefined &&
      ing.currentStock !== undefined &&
      ing.currentStock <= ing.minStock
  ).length;

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
      <div>
        <h2 className="text-2xl font-bold mb-2">Inventar</h2>
        <p className="text-gray-600">
          Verwalte deinen Bestand und behalte MHD im Blick
        </p>
      </div>

      {/* Warnings */}
      {(expiringCount > 0 || lowStockCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expiringCount > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-700 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">MHD-Warnung</span>
              </div>
              <p className="text-sm text-red-600">
                {expiringCount} {expiringCount === 1 ? 'Artikel läuft' : 'Artikel laufen'} bald ab
              </p>
              <button
                onClick={() => setFilterBy('expiring')}
                className="mt-2 text-sm text-red-700 font-semibold hover:underline"
              >
                Anzeigen →
              </button>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-700 mb-2">
                <Package className="w-5 h-5" />
                <span className="font-semibold">Niedriger Bestand</span>
              </div>
              <p className="text-sm text-yellow-600">
                {lowStockCount} {lowStockCount === 1 ? 'Artikel ist' : 'Artikel sind'} fast leer
              </p>
              <button
                onClick={() => setFilterBy('low')}
                className="mt-2 text-sm text-yellow-700 font-semibold hover:underline"
              >
                Anzeigen →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Zutaten suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex space-x-2">
          <FilterButton
            active={filterBy === 'all'}
            onClick={() => setFilterBy('all')}
          >
            Alle
          </FilterButton>
          <FilterButton
            active={filterBy === 'expiring'}
            onClick={() => setFilterBy('expiring')}
          >
            Bald ablaufend
          </FilterButton>
          <FilterButton
            active={filterBy === 'low'}
            onClick={() => setFilterBy('low')}
          >
            Niedriger Bestand
          </FilterButton>
        </div>
      </div>

      {/* Inventory List */}
      {inventoryItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Inventar leer</h3>
          <p className="text-gray-600">
            Füge Bestandsinformationen zu deinen Zutaten hinzu
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {filteredItems.map((item: any) => (
            <InventoryItem key={item.id} item={item} />
          ))}
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-gray-600">
              Keine Artikel gefunden
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InventoryItem({ item }: { item: any }) {
  const hasExpiry = item.expiryDate !== undefined;
  const expiryWarning = hasExpiry ? getExpiryWarning(item.expiryDate) : null;
  const hasLowStock =
    item.minStock !== undefined &&
    item.currentStock !== undefined &&
    item.currentStock <= item.minStock;

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-semibold text-lg">{item.name}</h4>
            {/* Status Badges */}
            {expiryWarning?.isExpired && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                ABGELAUFEN
              </span>
            )}
            {expiryWarning?.isExpiringSoon && !expiryWarning.isExpired && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                LÄUFT AB
              </span>
            )}
            {hasLowStock && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                NIEDRIG
              </span>
            )}
          </div>

          <div className="mt-2 space-y-2">
            {/* Stock Info */}
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-600">Bestand:</span>
              <span
                className={`font-semibold ${
                  hasLowStock ? 'text-orange-600' : 'text-gray-800'
                }`}
              >
                {item.currentStock} {item.unitType}
              </span>
              {item.minStock !== undefined && (
                <span className="text-gray-500">
                  (Min: {item.minStock} {item.unitType})
                </span>
              )}
            </div>

            {/* Expiry Date */}
            {hasExpiry && (
              <div className="flex items-center space-x-2 text-sm">
                {expiryWarning?.isExpired ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-semibold">
                      Abgelaufen seit {Math.abs(expiryWarning.daysUntilExpiry)} Tagen
                    </span>
                  </>
                ) : expiryWarning?.isExpiringSoon ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-yellow-600 font-semibold">
                      MHD in {expiryWarning.daysUntilExpiry} Tagen ({formatDate(item.expiryDate)})
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600">
                      MHD: {formatDate(item.expiryDate)}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="text-sm text-gray-600 italic">"{item.notes}"</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 text-sm font-medium">
            Bearbeiten
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
