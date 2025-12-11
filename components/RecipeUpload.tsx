'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, X } from 'lucide-react';
import { db } from '@/lib/instantdb';

interface ParsedRecipe {
  name: string;
  portions: number;
  prepTime: number;
  ingredients: Array<{
    amount: number;
    unit: string;
    name: string;
  }>;
  steps: string[];
}

export default function RecipeUpload() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(false);
      setParsedRecipe(null);

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

      const ocrResponse = await fetch('/api/ocr-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json();
        throw new Error(errorData.error || 'OCR fehlgeschlagen');
      }

      const { recipe } = await ocrResponse.json();
      setParsedRecipe(recipe);
      setProcessing(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      setUploading(false);
      setProcessing(false);
    }
  };

  const saveRecipe = async () => {
    if (!parsedRecipe) return;

    try {
      setProcessing(true);

      // Erstelle Rezept in InstantDB
      await db.transact([
        db.tx.recipes[crypto.randomUUID()].update({
          name: parsedRecipe.name,
          description: '',
          portions: parsedRecipe.portions,
          prepTime: parsedRecipe.prepTime,
          category: 'Sonstiges',
          createdAt: new Date().toISOString(),
          totalCostPerPortion: 0,
          suggestedMargin: 200,
        }),
      ]);

      setSuccess(true);
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          📄 Rezept hochladen
        </h2>

        {/* Upload Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || processing}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-12 h-12 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Foto aufnehmen</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || processing}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-12 h-12 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Datei auswählen</span>
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
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        )}

        {/* Parsed Recipe Preview */}
        {parsedRecipe && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-bold mb-4">{parsedRecipe.name}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-gray-600">Portionen:</span>
                <span className="ml-2 font-semibold">{parsedRecipe.portions}</span>
              </div>
              <div>
                <span className="text-gray-600">Zeit:</span>
                <span className="ml-2 font-semibold">{parsedRecipe.prepTime} Min</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Zutaten:</h4>
              <ul className="space-y-1">
                {parsedRecipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="text-sm">
                    • {ing.amount} {ing.unit} {ing.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Zubereitung:</h4>
              <ol className="space-y-2">
                {parsedRecipe.steps.map((step, idx) => (
                  <li key={idx} className="text-sm">
                    {idx + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={saveRecipe}
              disabled={processing}
              className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Wird gespeichert...' : 'Rezept speichern'}
            </button>
          </div>
        )}

        {/* Hinweis */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Tipp:</strong> Für beste Ergebnisse sollte das Rezept diesem Format folgen:
          </p>
          <pre className="mt-2 text-xs text-blue-700 bg-white p-2 rounded">
{`[Rezeptname]
Portionen: 4
Zeit: 30 Min

Zutaten:
- 500g Mehl
- 2 Eier
- 1L Milch

Zubereitung:
1. Schritt eins
2. Schritt zwei`}
          </pre>
        </div>
      </div>
    </div>
  );
}
