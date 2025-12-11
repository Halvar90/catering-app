'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, Edit2, Trash2, Save, X, Plus, FileText } from 'lucide-react';
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
  const [receiptName, setReceiptName] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing receipts
  const { data: receiptsData } = db.useQuery({ receipts: {} });
  const receipts = receiptsData?.receipts || [];

  const handleMultipleFiles = async (files: FileList) => {
    const allItems: ScannedItem[] = [];
    let storeName = '';
    let totalAmount = 0;

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) continue;

        const { url } = await uploadResponse.json();

        // OCR
        const ocrResponse = await fetch('/api/ocr-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url }),
        });

        if (!ocrResponse.ok) continue;

        const { receipt, ingredients } = await ocrResponse.json();

        // Merge items
        if (i === 0) {
          storeName = receipt.storeName || '';
          setReceiptName(`${storeName} - ${new Date().toLocaleDateString('de-DE')}`);
        }
        totalAmount += receipt.totalAmount || 0;

        ingredients.forEach((ing: any) => {
          allItems.push({
            id: crypto.randomUUID(),
            name: ing.name || '',
            quantity: ing.unitSize || 1,
            unit: ing.unitType || 'Stück',
            pricePerUnit: ing.pricePerUnit || 0,
            totalPrice: (ing.pricePerUnit || 0) * (ing.unitSize || 1),
            shop: storeName,
          });
        });
      }

      setReceiptData({
        id: crypto.randomUUID(),
        storeName,
        totalAmount,
        imageUrl: '', // Multiple images
      });
      setScannedItems(allItems);
      setShowReviewModal(true);
      setUploading(false);

    } catch (err) {
      setError('Fehler beim Verarbeiten der Bilder');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleMultipleFiles(files);
    }
  };

  const handleSaveReceipt = async () => {
    if (!receiptData || scannedItems.length === 0) return;

    try {
      setProcessing(true);

      // Save receipt with custom name
      await db.transact([
        db.tx.receipts[receiptData.id].update({
          name: receiptName,
          storeName: receiptData.storeName,
          totalAmount: scannedItems.reduce((sum, item) => sum + item.totalPrice, 0),
          purchaseDate: new Date().toISOString(),
          processed: true,
        }),
      ]);

      // Save all ingredients
      for (const item of scannedItems) {
        await db.transact([
          db.tx.ingredients[item.id].update({
            name: item.name,
            shop: item.shop,
            pricePerUnit: item.pricePerUnit,
            unitSize: item.quantity,
            unitType: item.unit,
            category: 'Sonstiges',
            pricePerKg: item.unit === 'kg' ? item.pricePerUnit / item.quantity : 0,
            lastPurchaseDate: new Date().toISOString(),
          }),
        ]);
      }

      setShowReviewModal(false);
      setSuccess(true);
      setScannedItems([]);
      setReceiptData(null);
      setReceiptName('');
      setProcessing(false);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Fehler beim Speichern');
      setProcessing(false);
    }
  };

  const handleUpdateItem = (id: string, field: keyof ScannedItem, value: any) => {
    setScannedItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
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

  const handleAddItem = () => {
    setScannedItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        quantity: 1,
        unit: 'Stück',
        pricePerUnit: 0,
        totalPrice: 0,
        shop: receiptData?.storeName || '',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 dark:text-white">Kassenbon scannen</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fotografiere oder lade Kassenbons hoch - mehrere Bilder für lange Bons möglich
        </p>
      </div>

      {/* Upload Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Camera className="w-12 h-12 mx-auto mb-4 text-primary-600" />
          <div className="text-center">
            <div className="font-semibold mb-1 dark:text-white">Foto aufnehmen</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Mehrere Bilder möglich</div>
          </div>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || processing}
          className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-primary-500 transition-colors disabled:opacity-50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-primary-600" />
          <div className="text-center">
            <div className="font-semibold mb-1 dark:text-white">Datei hochladen</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Mehrere Bilder wählen</div>
          </div>
        </button>
      </div>

      {/* Status Messages */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-blue-800">Bilder werden hochgeladen und verarbeitet...</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-semibold">Kassenbon erfolgreich gespeichert!</span>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <div className="flex-1">
                <h3 className="text-2xl font-bold dark:text-white mb-2">Kassenbon prüfen</h3>
                <input
                  type="text"
                  value={receiptName}
                  onChange={(e) => setReceiptName(e.target.value)}
                  placeholder="Bonname eingeben..."
                  className="w-full max-w-md px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {scannedItems.length} Artikel erkannt • Gesamt:{' '}
                  <span className="font-bold text-lg text-primary-600">
                    {scannedItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)} €
                  </span>
                </div>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4" />
                  Artikel hinzufügen
                </button>
              </div>

              {scannedItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Keine Artikel erkannt. Klicke auf "Artikel hinzufügen".
                </div>
              ) : (
                scannedItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Zutat
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Menge
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Einheit
                        </label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Preis/Einheit
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.pricePerUnit}
                          onChange={(e) => handleUpdateItem(item.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Laden: <span className="font-medium">{item.shop}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-primary-600">
                          {item.totalPrice.toFixed(2)} €
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-6 flex gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 px-6 py-3 border dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveReceipt}
                disabled={processing || scannedItems.length === 0 || !receiptName}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {processing ? 'Speichere...' : `${scannedItems.length} Zutaten speichern`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Receipts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Letzte Kassenbons ({receipts.length})
        </h3>
        {receipts.length === 0 ? (
          <div className="text-gray-600 dark:text-gray-400 text-sm text-center py-8">
            Noch keine Kassenbons hochgeladen
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.slice(0, 5).map((receipt: any) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div>
                  <div className="font-medium dark:text-white">{receipt.name || receipt.storeName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(receipt.purchaseDate).toLocaleDateString('de-DE')}
                  </div>
                </div>
                <div className="text-lg font-bold text-primary-600">
                  {receipt.totalAmount?.toFixed(2)} €
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
