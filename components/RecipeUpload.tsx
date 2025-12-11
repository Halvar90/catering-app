'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, X, Edit2, Trash2, Plus, Save } from 'lucide-react';
import { db } from '@/lib/instantdb';

interface Ingredient {
  id: string;
  amount: number;
  unit: string;
  name: string;
}

interface ParsedRecipe {
  name: string;
  portions: number;
  prepTime: number;
  category: string;
  ingredients: Ingredient[];
  steps: string[];
  description: string;
}

export default function RecipeUpload() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(false);
    setParsedRecipe(null);

    try {
      // Upload zu Vercel Blob
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const { url } = await uploadResponse.json();

      // OCR Processing
      setUploading(false);
      setProcessing(true);

      let recipeData = null;
      try {
        const ocrResponse = await fetch('/api/ocr-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url }),
        });

        if (ocrResponse.ok) {
          const data = await ocrResponse.json();
          recipeData = data.recipe;
        }
      } catch (ocrErr) {
        console.warn('OCR failed:', ocrErr);
      }

      // Construct recipe (either from OCR or empty)
      const recipeWithIds = {
        name: recipeData?.name || '',
        portions: recipeData?.portions || 4,
        prepTime: recipeData?.prepTime || 30,
        category: recipeData?.category || 'Sonstiges',
        description: recipeData?.description || '',
        ingredients: (recipeData?.ingredients || []).map((ing: any) => ({
          ...ing,
          id: crypto.randomUUID(),
        })),
        steps: recipeData?.steps || [],
      };
      
      setParsedRecipe(recipeWithIds);
      setShowReviewModal(true);

    } catch (err) {
      console.error('Process error:', err);
      setError('Fehler beim Verarbeiten. Bitte manuell eingeben.');
      // Fallback to empty recipe
      setParsedRecipe({
        name: '',
        portions: 4,
        prepTime: 30,
        category: 'Sonstiges',
        description: '',
        ingredients: [],
        steps: [],
      });
      setShowReviewModal(true);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleManualEntry = () => {
    setParsedRecipe({
      name: '',
      portions: 4,
      prepTime: 30,
      category: 'Sonstiges',
      description: '',
      ingredients: [],
      steps: [],
    });
    setShowReviewModal(true);
  };

  const saveRecipe = async () => {
    if (!parsedRecipe) return;

    try {
      setProcessing(true);

      const recipeId = crypto.randomUUID();

      // Erstelle Rezept in InstantDB
      await db.transact([
        db.tx.recipes[recipeId].update({
          name: parsedRecipe.name,
          description: parsedRecipe.description,
          portions: parsedRecipe.portions,
          prepTime: parsedRecipe.prepTime,
          category: parsedRecipe.category,
          createdAt: new Date().toISOString(),
          totalCostPerPortion: 0,
          suggestedMargin: 200,
        }),
      ]);

      // Erstelle RecipeIngredients (nicht als echte Ingredients, nur als Referenzen)
      // Hier würde man normalerweise auf vorhandene Ingredients matchen
      for (const ing of parsedRecipe.ingredients) {
        await db.transact([
          db.tx.recipeIngredients[crypto.randomUUID()].update({
            recipeId: recipeId,
            ingredientId: null, // Kann später gemappt werden
            amount: ing.amount,
            unit: ing.unit,
            name: ing.name,
          }),
        ]);
      }

      setSuccess(true);
      setShowReviewModal(false);
      setParsedRecipe(null);
      setProcessing(false);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err) {
      setError('Fehler beim Speichern');
      setProcessing(false);
    }
  };

  const handleUpdateRecipe = (field: keyof ParsedRecipe, value: any) => {
    if (!parsedRecipe) return;
    setParsedRecipe({ ...parsedRecipe, [field]: value });
  };

  const handleUpdateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    if (!parsedRecipe) return;
    setParsedRecipe({
      ...parsedRecipe,
      ingredients: parsedRecipe.ingredients.map(ing =>
        ing.id === id ? { ...ing, [field]: value } : ing
      ),
    });
  };

  const handleDeleteIngredient = (id: string) => {
    if (!parsedRecipe) return;
    setParsedRecipe({
      ...parsedRecipe,
      ingredients: parsedRecipe.ingredients.filter(ing => ing.id !== id),
    });
  };

  const handleAddIngredient = () => {
    if (!parsedRecipe) return;
    setParsedRecipe({
      ...parsedRecipe,
      ingredients: [
        ...parsedRecipe.ingredients,
        { id: crypto.randomUUID(), amount: 1, unit: 'Stück', name: '' },
      ],
    });
  };

  const handleUpdateStep = (index: number, value: string) => {
    if (!parsedRecipe) return;
    const newSteps = [...parsedRecipe.steps];
    newSteps[index] = value;
    setParsedRecipe({ ...parsedRecipe, steps: newSteps });
  };

  const handleDeleteStep = (index: number) => {
    if (!parsedRecipe) return;
    setParsedRecipe({
      ...parsedRecipe,
      steps: parsedRecipe.steps.filter((_, i) => i !== index),
    });
  };

  const handleAddStep = () => {
    if (!parsedRecipe) return;
    setParsedRecipe({
      ...parsedRecipe,
      steps: [...parsedRecipe.steps, ''],
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 dark:text-white">Rezept hochladen</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fotografiere ein Rezept oder lade ein Bild hoch - die Zutaten und Schritte werden automatisch erkannt
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Upload Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || processing}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-12 h-12 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Foto aufnehmen</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || processing}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-12 h-12 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Datei auswählen</span>
          </button>

          <button
            onClick={handleManualEntry}
            disabled={uploading || processing}
            className="col-span-2 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit2 className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manuell erstellen</span>
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />

        {/* Status Messages */}
        {uploading && (
          <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
            <span className="text-blue-700">Bild wird hochgeladen...</span>
          </div>
        )}

        {processing && (
          <div className="flex items-center justify-center p-4 bg-yellow-50 rounded-lg">
            <Loader2 className="w-5 h-5 text-yellow-600 animate-spin mr-2" />
            <span className="text-yellow-700">Rezept wird erkannt...</span>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-700">Rezept erfolgreich gespeichert!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
            <span className="text-red-700 dark:text-red-400">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-5 h-5 text-red-600 dark:text-red-400" />
            </button>
          </div>
        )}

        {/* Hinweis */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>💡 Tipp:</strong> Für beste Ergebnisse sollte das Rezept klar strukturiert sein
          </p>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && parsedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold dark:text-white">Rezept überprüfen</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Prüfe und bearbeite die erkannten Daten vor dem Speichern
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rezeptname
                  </label>
                  <input
                    type="text"
                    value={parsedRecipe.name}
                    onChange={(e) => handleUpdateRecipe('name', e.target.value)}
                    className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Beschreibung (optional)
                  </label>
                  <textarea
                    value={parsedRecipe.description}
                    onChange={(e) => handleUpdateRecipe('description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Portionen
                    </label>
                    <input
                      type="number"
                      value={parsedRecipe.portions}
                      onChange={(e) => handleUpdateRecipe('portions', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Zeit (Min)
                    </label>
                    <input
                      type="number"
                      value={parsedRecipe.prepTime}
                      onChange={(e) => handleUpdateRecipe('prepTime', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kategorie
                    </label>
                    <select
                      value={parsedRecipe.category}
                      onChange={(e) => handleUpdateRecipe('category', e.target.value)}
                      className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option>Vorspeise</option>
                      <option>Hauptgericht</option>
                      <option>Dessert</option>
                      <option>Snack</option>
                      <option>Sonstiges</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg dark:text-white">
                    Zutaten ({parsedRecipe.ingredients.length})
                  </h4>
                  <button
                    onClick={handleAddIngredient}
                    className="flex items-center gap-2 px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Hinzufügen</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {parsedRecipe.ingredients.map((ing) => (
                    <div key={ing.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Menge
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={ing.amount}
                            onChange={(e) =>
                              handleUpdateIngredient(ing.id, 'amount', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded text-sm"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Einheit
                          </label>
                          <input
                            type="text"
                            value={ing.unit}
                            onChange={(e) => handleUpdateIngredient(ing.id, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded text-sm"
                          />
                        </div>

                        <div className="col-span-7">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Zutat
                          </label>
                          <input
                            type="text"
                            value={ing.name}
                            onChange={(e) => handleUpdateIngredient(ing.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded text-sm"
                          />
                        </div>

                        <div className="col-span-1 flex items-end">
                          <button
                            onClick={() => handleDeleteIngredient(ing.id)}
                            className="w-full px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg dark:text-white">
                    Zubereitungsschritte ({parsedRecipe.steps.length})
                  </h4>
                  <button
                    onClick={handleAddStep}
                    className="flex items-center gap-2 px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Hinzufügen</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {parsedRecipe.steps.map((step, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <textarea
                          value={step}
                          onChange={(e) => handleUpdateStep(idx, e.target.value)}
                          rows={2}
                          className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          onClick={() => handleDeleteStep(idx)}
                          className="flex-shrink-0 px-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-6 flex gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 px-6 py-3 border dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold"
              >
                Abbrechen
              </button>
              <button
                onClick={saveRecipe}
                disabled={processing || !parsedRecipe.name}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>{processing ? 'Wird gespeichert...' : 'Rezept speichern'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
