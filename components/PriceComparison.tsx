'use client';

import { useState } from 'react';
import { TrendingDown, Store, Search } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatPrice } from '@/lib/utils';

export default function PriceComparison() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isLoading, error, data } = db.useQuery({
    ingredients: {},
  });

  const ingredients = data?.ingredients || [];

  // Gruppiere Zutaten nach Namen (normalisiert)
  const groupedIngredients = ingredients.reduce((acc: any, ing: any) => {
    // Normalisiere Namen (lowercase, trim)
    const normalizedName = ing.name.toLowerCase().trim();
    
    if (!acc[normalizedName]) {
      acc[normalizedName] = [];
    }
    acc[normalizedName].push(ing);
    return acc;
  }, {});

  // Filtere nach Suchbegriff
  const filteredGroups = Object.entries(groupedIngredients).filter(([name]) =>
    name.includes(searchTerm.toLowerCase())
  );

  // Sortiere nach größter Ersparnis
  const sortedGroups = filteredGroups
    .map(([name, items]: [string, any]) => {
      if (items.length < 2) return null;

      // Vergleiche pricePerKg (oder andere normalisierte Preise)
      const withPrices = items.filter((i: any) => i.pricePerKg);
      if (withPrices.length < 2) return null;

      const prices = withPrices.map((i: any) => i.pricePerKg);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const savings = maxPrice - minPrice;
      const savingsPercent = ((savings / maxPrice) * 100).toFixed(0);

      const cheapest = withPrices.find((i: any) => i.pricePerKg === minPrice);
      const expensive = withPrices.find((i: any) => i.pricePerKg === maxPrice);

      return {
        name: items[0].name,
        items: withPrices,
        cheapest,
        expensive,
        savings,
        savingsPercent: parseInt(savingsPercent),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.savings - a.savings);

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
        <h2 className="text-2xl font-bold mb-2 dark:text-white">Preisvergleich</h2>
        <p className="text-gray-600 dark:text-gray-400">Finde die günstigsten Läden für deine Zutaten</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Zutat suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Results */}
      {sortedGroups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm
              ? 'Keine Ergebnisse gefunden'
              : 'Füge die gleiche Zutat aus verschiedenen Läden hinzu, um Preise zu vergleichen.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={(e) => {
                  const content = e.currentTarget.nextElementSibling;
                  if (content) {
                    content.classList.toggle('hidden');
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <h3 className="font-semibold text-lg dark:text-white">{group.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {group.items.length} Läden • Spare bis zu {group.savingsPercent}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    {formatPrice(group.savings)}
                  </div>
                </div>
              </button>

              {/* Expandierter Inhalt */}
              <div className="hidden border-t border-gray-200 dark:border-gray-700">
                <div className="p-4 space-y-3">
                  {group.items
                    .sort((a: any, b: any) => a.pricePerKg - b.pricePerKg)
                    .map((item: any, itemIdx: number) => {
                      const isCheapest = item.id === group.cheapest.id;
                      const isExpensive = item.id === group.expensive.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg flex items-center justify-between ${
                            isCheapest
                              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-800'
                              : 'bg-gray-50 dark:bg-gray-700'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              <span className="font-medium dark:text-white">{item.shop}</span>
                              {isCheapest && (
                                <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                  Günstigster
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {formatPrice(item.pricePerUnit)} für {item.unitSize}
                              {item.unitType}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold dark:text-white">
                              {formatPrice(item.pricePerKg)}/kg
                            </div>
                            {!isCheapest && (
                              <div className="text-xs text-red-600 dark:text-red-400">
                                +{formatPrice(item.pricePerKg - group.cheapest.pricePerKg)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Empfehlung */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-3">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>💡 Tipp:</strong> Kaufe {group.name} bei{' '}
                      <strong>{group.cheapest.shop}</strong> und spare{' '}
                      {formatPrice(group.savings)} pro kg gegenüber {group.expensive.shop}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hinweis */}
      {sortedGroups.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Hinweis:</strong> Preise basieren auf deinen gespeicherten Zutaten. 
            Aktualisiere regelmäßig die Preise für genaue Vergleiche.
          </p>
        </div>
      )}
    </div>
  );
}
