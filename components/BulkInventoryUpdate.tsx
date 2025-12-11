'use client';

import { useState } from 'react';
import { db } from '@/lib/instantdb';
import { Package } from 'lucide-react';

interface BulkInventoryUpdateProps {
  ingredients: any[];
  onClose: () => void;
}

export default function BulkInventoryUpdate({ ingredients, onClose }: BulkInventoryUpdateProps) {
  const [updates, setUpdates] = useState<Record<string, number>>(
    ingredients.reduce((acc, ing) => ({
      ...acc,
      [ing.id]: ing.currentStock || 0
    }), {})
  );
  const [saving, setSaving] = useState(false);

  const handleUpdate = (id: string, value: string) => {
    const num = parseFloat(value) || 0;
    setUpdates(prev => ({ ...prev, [id]: num }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.transact(
        ingredients.map(ing => 
          db.tx.ingredients[ing.id].update({ currentStock: updates[ing.id] })
        )
      );
      onClose();
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Fehler beim Speichern');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold dark:text-white">Bestandsupdate ({ingredients.length})</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">×</button>
        </div>

        <div className="space-y-2 mb-6">
          {ingredients.map(ing => (
            <div key={ing.id} className="flex items-center gap-3 p-2 border dark:border-gray-700 rounded">
              <span className="flex-1 dark:text-gray-200">{ing.name}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{ing.unitType}</span>
              <input
                type="number"
                step="0.1"
                value={updates[ing.id]}
                onChange={(e) => handleUpdate(ing.id, e.target.value)}
                className="w-24 p-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Speichere...' : 'Alle speichern'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 border dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
