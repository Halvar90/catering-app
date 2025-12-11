'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { calculatePriceConversions } from '@/lib/utils';

interface AddIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddIngredientModal({ isOpen, onClose }: AddIngredientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Sonstiges',
    shop: '',
    pricePerUnit: '',
    unitSize: '',
    unitType: 'g',
    currentStock: '',
    minStock: '',
    expiryDate: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Gemüse',
    'Obst',
    'Fleisch',
    'Fisch',
    'Milchprodukte',
    'Getreide',
    'Gewürze',
    'Öle & Fette',
    'Backwaren',
    'Sonstiges',
  ];

  const units = ['g', 'kg', 'ml', 'l', 'Stück'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.shop || !formData.pricePerUnit || !formData.unitSize) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const price = parseFloat(formData.pricePerUnit);
      const size = parseFloat(formData.unitSize);

      // Preiskonversionen berechnen
      const conversions = calculatePriceConversions(price, size, formData.unitType);

      // Neue Zutat erstellen
      await db.transact([
        db.tx.ingredients[crypto.randomUUID()].update({
          name: formData.name,
          category: formData.category,
          shop: formData.shop,
          pricePerUnit: price,
          unitSize: size,
          unitType: formData.unitType,
          ...conversions,
          currentStock: formData.currentStock ? parseFloat(formData.currentStock) : 0,
          minStock: formData.minStock ? parseFloat(formData.minStock) : 0,
          expiryDate: formData.expiryDate || null,
          notes: formData.notes || null,
          lastPurchaseDate: new Date().toISOString(),
        }),
      ]);

      // Reset und schließen
      setFormData({
        name: '',
        category: 'Sonstiges',
        shop: '',
        pricePerUnit: '',
        unitSize: '',
        unitType: 'g',
        currentStock: '',
        minStock: '',
        expiryDate: '',
        notes: '',
      });
      onClose();
    } catch (err) {
      setError('Fehler beim Speichern der Zutat');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Zutat hinzufügen</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name - Pflicht */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="z.B. Tomaten"
              required
            />
          </div>

          {/* Kategorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategorie
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Geschäft - Pflicht */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Geschäft <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shop}
              onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="z.B. REWE, EDEKA"
              required
            />
          </div>

          {/* Preis und Menge */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preis (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.pricePerUnit}
                onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="2.99"
                required
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Menge <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unitSize}
                onChange={(e) => setFormData({ ...formData, unitSize: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="500"
                required
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Einheit <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unitType}
                onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inventar-Felder (Optional) */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Inventar (Optional)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aktueller Bestand
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mindestbestand
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mindesthaltbarkeitsdatum
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="Zusätzliche Informationen..."
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Wird gespeichert...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
