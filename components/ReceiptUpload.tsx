'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle } from 'lucide-react';
import { db } from '@/lib/instantdb';

export default function ReceiptUpload() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(false);

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

      const ocrResponse = await fetch('/api/ocr-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!ocrResponse.ok) {
        throw new Error('OCR fehlgeschlagen');
      }

      const { receipt, ingredients } = await ocrResponse.json();

      // Speichere Receipt in DB
      db.transact([
        db.tx.receipts[receipt.id].update({
          imageUrl: url,
          storeName: receipt.storeName,
          totalAmount: receipt.totalAmount,
          purchaseDate: new Date().toISOString(),
          processed: true,
          rawOcrText: receipt.rawText,
        }),
      ]);

      // Speichere Ingredients
      for (const ingredient of ingredients) {
        db.transact([
          db.tx.ingredients[ingredient.id].update({
            ...ingredient,
            lastPurchaseDate: new Date().toISOString(),
            receiptImageUrl: url,
          }),
        ]);
      }

      setProcessing(false);
      setSuccess(true);

      // Reset nach 3 Sekunden
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      setUploading(false);
      setProcessing(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Kassenbon scannen</h2>
        <p className="text-gray-600">
          Fotografiere oder lade einen Kassenbon hoch, um automatisch alle Zutaten zu erfassen
        </p>
      </div>

      {/* Upload Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kamera */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || processing}
          className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary-500 transition-colors disabled:opacity-50"
        >
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileSelect}
          />
          <Camera className="w-12 h-12 mx-auto mb-4 text-primary-600" />
          <div className="text-center">
            <div className="font-semibold mb-1">Foto aufnehmen</div>
            <div className="text-sm text-gray-600">Kassenbon fotografieren</div>
          </div>
        </button>

        {/* Datei Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || processing}
          className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary-500 transition-colors disabled:opacity-50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileSelect}
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-primary-600" />
          <div className="text-center">
            <div className="font-semibold mb-1">Datei hochladen</div>
            <div className="text-sm text-gray-600">Bild vom Gerät auswählen</div>
          </div>
        </button>
      </div>

      {/* Status Messages */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-blue-800">Bild wird hochgeladen...</span>
        </div>
      )}

      {processing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
          <div>
            <div className="text-yellow-800 font-semibold">Kassenbon wird analysiert...</div>
            <div className="text-sm text-yellow-700">
              Das kann einen Moment dauern. Zutaten und Preise werden automatisch erkannt.
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-semibold">
            Kassenbon erfolgreich verarbeitet! Zutaten wurden zur Datenbank hinzugefügt.
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-semibold">Fehler</div>
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Recent Receipts Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Letzte Kassenbons</h3>
        <div className="text-gray-600 text-sm text-center py-8">
          Noch keine Kassenbons hochgeladen
        </div>
      </div>
    </div>
  );
}
