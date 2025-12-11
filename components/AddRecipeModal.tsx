'use client';

import { useState } from 'react';
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { getSuggestedMargin } from '@/lib/utils';

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: any[];
}

interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit: string;
}

export default function AddRecipeModal({ isOpen, onClose, ingredients }: AddRecipeModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Grundinfo
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [portions, setPortions] = useState(4);
  const [prepTime, setPrepTime] = useState(30);
  const [category, setCategory] = useState('Hauptgericht');

  // Step 2: Zutaten
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Step 3: Zubereitung
  const [preparationSteps, setPreparationSteps] = useState(['']);

  const categories = ['Vorspeise', 'Hauptgericht', 'Beilage', 'Dessert', 'Snack', 'Getränk', 'Sonstiges'];

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addIngredient = (ingredientId: string) => {
    if (recipeIngredients.some(ri => ri.ingredientId === ingredientId)) return;
    
    setRecipeIngredients([...recipeIngredients, {
      ingredientId,
      amount: 100,
      unit: 'g',
    }]);
    setSearchTerm('');
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setPreparationSteps([...preparationSteps, '']);
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...preparationSteps];
    updated[index] = value;
    setPreparationSteps(updated);
  };

  const removeStep = (index: number) => {
    setPreparationSteps(preparationSteps.filter((_, i) => i !== index));
  };

  // Kostenberechnung
  const calculateCost = () => {
    let totalCost = 0;
    recipeIngredients.forEach(ri => {
      const ing = ingredients.find(i => i.id === ri.ingredientId);
      if (ing) {
        const pricePerUnit = ing.pricePerUnit / ing.unitSize;
        totalCost += ri.amount * pricePerUnit;
      }
    });
    return totalCost / portions;
  };

  const costPerPortion = calculateCost();
  const suggestedMargin = getSuggestedMargin(costPerPortion);

  const canProceed = () => {
    if (step === 1) return name.trim() !== '';
    if (step === 2) return recipeIngredients.length > 0;
    if (step === 3) return preparationSteps.some(s => s.trim() !== '');
    return true;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const recipeId = crypto.randomUUID();

      // Erstelle Rezept
      const transactions: any[] = [
        db.tx.recipes[recipeId].update({
          name,
          description,
          portions,
          prepTime,
          category,
          createdAt: new Date().toISOString(),
          totalCostPerPortion: costPerPortion,
          suggestedMargin,
          customMargin: suggestedMargin,
          sellingPricePerPortion: costPerPortion * (1 + suggestedMargin / 100),
        }),
      ];

      // Erstelle RecipeIngredients mit Links
      recipeIngredients.forEach(ri => {
        const linkId = crypto.randomUUID();
        transactions.push(
          db.tx.recipeIngredients[linkId].update({
            amount: ri.amount,
            unit: ri.unit,
          }).link({
            recipe: recipeId,
            ingredient: ri.ingredientId,
          })
        );
      });

      await db.transact(transactions);

      // Reset
      setName('');
      setDescription('');
      setPortions(4);
      setPrepTime(30);
      setCategory('Hauptgericht');
      setRecipeIngredients([]);
      setPreparationSteps(['']);
      setStep(1);
      onClose();
    } catch (err) {
      setError('Fehler beim Speichern des Rezepts');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Rezept erstellen</h2>
            <p className="text-sm text-gray-600">Schritt {step} von 4</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  s <= step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    s < step ? 'bg-primary-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Grundinfo */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Grundinformationen</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rezeptname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="z.B. Spaghetti Carbonara"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Kurze Beschreibung des Rezepts..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portionen
                  </label>
                  <input
                    type="number"
                    value={portions}
                    onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zeit (Min)
                  </label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Zutaten */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Zutaten auswählen</h3>

              {/* Suche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zutat hinzufügen
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Zutat suchen..."
                />
                {searchTerm && filteredIngredients.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg">
                    {filteredIngredients.slice(0, 5).map(ing => (
                      <button
                        key={ing.id}
                        onClick={() => addIngredient(ing.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="font-medium">{ing.name}</div>
                        <div className="text-xs text-gray-500">{ing.shop}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ausgewählte Zutaten */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ausgewählte Zutaten ({recipeIngredients.length})
                </label>
                {recipeIngredients.map((ri, idx) => {
                  const ing = ingredients.find(i => i.id === ri.ingredientId);
                  return (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{ing?.name}</div>
                        <div className="text-xs text-gray-500">{ing?.shop}</div>
                      </div>
                      <input
                        type="number"
                        value={ri.amount}
                        onChange={(e) => updateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                        min="0"
                        step="0.01"
                      />
                      <select
                        value={ri.unit}
                        onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="Stück">Stück</option>
                        <option value="EL">EL</option>
                        <option value="TL">TL</option>
                      </select>
                      <button
                        onClick={() => removeIngredient(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Zubereitung */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Zubereitungsschritte</h3>
              
              {preparationSteps.map((step, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {idx + 1}
                  </div>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep(idx, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={2}
                    placeholder={`Schritt ${idx + 1}...`}
                  />
                  {preparationSteps.length > 1 && (
                    <button
                      onClick={() => removeStep(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={addStep}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Schritt hinzufügen
              </button>
            </div>
          )}

          {/* Step 4: Vorschau */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Vorschau & Kostenberechnung</h3>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xl font-bold mb-2">{name}</h4>
                {description && <p className="text-gray-600 mb-4">{description}</p>}
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{portions}</div>
                    <div className="text-sm text-gray-600">Portionen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{prepTime}</div>
                    <div className="text-sm text-gray-600">Minuten</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">{category}</div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h5 className="font-semibold mb-2">Zutaten:</h5>
                  <ul className="space-y-1 text-sm">
                    {recipeIngredients.map((ri, idx) => {
                      const ing = ingredients.find(i => i.id === ri.ingredientId);
                      return (
                        <li key={idx}>• {ri.amount} {ri.unit} {ing?.name}</li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="bg-primary-50 rounded-lg p-4">
                <h5 className="font-semibold mb-3">Kostenberechnung:</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Kosten pro Portion:</span>
                    <span className="font-bold">{costPerPortion.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Empfohlene Marge:</span>
                    <span className="font-bold">{suggestedMargin}%</span>
                  </div>
                  <div className="flex justify-between border-t border-primary-200 pt-2">
                    <span className="font-semibold">Empfohlener Verkaufspreis:</span>
                    <span className="text-xl font-bold text-primary-600">
                      {(costPerPortion * (1 + suggestedMargin / 100)).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Zurück
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Weiter
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Wird gespeichert...' : 'Rezept speichern'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
