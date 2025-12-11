'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, Edit2, Trash2, Save, X } from 'lucide-react';
import { db } from '@/lib/instantdb';

interface ScannedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  shop: string;
}

export default function ReceiptUpload() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
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

      // Zeige Review Modal mit gescannten Daten
      setReceiptData({ ...receipt, imageUrl: url });
      setScannedItems(
        ingredients.map((ing: any) => ({
          id: ing.id,
          name: ing.name,
          quantity: ing.unitSize || 1,
          unit: ing.unitType || 'Stück',
          pricePerUnit: ing.pricePerUnit || 0,
          totalPrice: ing.pricePerUnit * (ing.unitSize || 1) || 0,
          shop: receipt.storeName || '',
        }))
      );
      setShowReviewModal(true);
      setProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleSaveIngredients = async () => {
    try {
      // Speichere Receipt in DB
      await db.transact([
        db.tx.receipts[receiptData.id].update({
          imageUrl: receiptData.imageUrl,
          storeName: receiptData.storeName,
          totalAmount: receiptData.totalAmount,
          purchaseDate: new Date().toISOString(),
          processed: true,
          rawOcrText: receiptData.rawText,
        }),
      ]);

      // Speichere alle bearbeiteten Ingredients
      for (const item of scannedItems) {
        await db.transact([
          db.tx.ingredients[item.id].update({
            name: item.name,
            shop: item.shop,
            pricePerUnit: item.pricePerUnit,
            unitSize: item.quantity,
            unitType: item.unit,
            category: 'Sonstiges',
            pricePerKg: item.pricePerUnit / item.quantity,
            lastPurchaseDate: new Date().toISOString(),
            receiptImageUrl: receiptData.imageUrl,
          }),
        ]);
      }

      setShowReviewModal(false);
      setSuccess(true);
      setScannedItems([]);
      setReceiptData(null);

      // Reset nach 3 Sekunden
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  const handleUpdateItem = (id: string, field: keyof ScannedItem, value: any) => {
    setScannedItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate totalPrice if quantity or pricePerUnit changed
          if (field === 'quantity' || field === 'pricePerUnit') {
            updated.totalPrice = updated.quantity * updated.pricePerUnit;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== id));
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
        <h2 className="text-2xl font-bold mb-2 dark:text-white">Kassenbon scannen</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fotografiere oder lade einen Kassenbon hoch, um automatisch alle Zutaten zu erfassen
        </p>
      </div>

      {/* Upload Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kamera */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || processing}
          className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-primary-500 transition-colors disabled:opacity-50"
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
            <div className="font-semibold mb-1 dark:text-white">Foto aufnehmen</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Kassenbon fotografieren</div>
          </div>
        </button>

        {/* Datei Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || processing}
          className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-primary-500 transition-colors disabled:opacity-50"
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
            <div className="font-semibold mb-1 dark:text-white">Datei hochladen</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Bild vom Gerät auswählen</div>
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

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold dark:text-white">Gescannte Zutaten prüfen</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {receiptData?.storeName && `${receiptData.storeName} • `}
                  {scannedItems.length} Artikel erkannt
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {scannedItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Keine Zutaten erkannt. Bitte versuche es mit einem anderen Bild.
                </div>
              ) : (
                scannedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Name */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Zutat
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Shop */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Laden
                        </label>
                        <input
                          type="text"
                          value={item.shop}
                          onChange={(e) => handleUpdateItem(item.id, 'shop', e.target.value)}
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Delete */}
                      <div className="flex items-end">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="w-full px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">Löschen</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Menge
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Einheit
                        </label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Price Per Unit */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Preis/Einheit
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.pricePerUnit}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'pricePerUnit', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    {/* Total Price Display */}
                    <div className="text-right">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Gesamt: </span>
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {item.totalPrice.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))
              )}
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
                onClick={handleSaveIngredients}
                disabled={scannedItems.length === 0}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>{scannedItems.length} Zutaten speichern</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Receipts Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4 dark:text-white">Letzte Kassenbons</h3>
        <div className="text-gray-600 dark:text-gray-400 text-sm text-center py-8">
          Noch keine Kassenbons hochgeladen
        </div>
      </div>
    </div>
  );
}
