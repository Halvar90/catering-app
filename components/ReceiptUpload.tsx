'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Loader2, Plus, Trash2, CheckCircle, X, AlertCircle, FileText, Save, Pencil } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { tx } from '@instantdb/react';

interface ScannedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  shop: string;
}

interface ReceiptData {
  id: string;
  storeName: string;
  totalAmount: number;
  purchaseDate: string;
  imageUrl?: string;
}

export default function ReceiptUpload() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptName, setReceiptName] = useState('');
  const [progress, setProgress] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing receipts
  const { data: receiptsData } = db.useQuery({ receipts: {} });
  const receipts = receiptsData?.receipts || [];

  // Fetch ingredients for editing
  const { data: editIngredientsData } = db.useQuery(
    editingId ? { ingredients: { $: { where: { receiptId: editingId } } } } : {}
  );

  useEffect(() => {
    if (editingId && editIngredientsData?.ingredients) {
      const items = editIngredientsData.ingredients.map((ing: any) => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.unitSize,
        unit: ing.unitType,
        pricePerUnit: ing.pricePerUnit,
        totalPrice: ing.pricePerUnit * ing.unitSize,
        shop: ing.shop,
      }));
      setScannedItems(items);
    }
  }, [editIngredientsData, editingId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleMultipleFiles(files);
    }
  };

  const handleMultipleFiles = async (files: FileList) => {
    setUploading(true);
    setError(null);
    setSuccess(false);
    setScannedItems([]);
    setReceiptData(null);
    setProgress('Starte Upload...');

    const allItems: ScannedItem[] = [];
    let lastReceiptData: ReceiptData | null = null;
    let errorCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Verarbeite Bild ${i + 1} von ${files.length}...`);

        try {
          // 1. Upload
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) throw new Error('Upload fehlgeschlagen');
          const { url } = await uploadResponse.json();

          // 2. OCR Processing
          setProgress(`Analysiere Text auf Bild ${i + 1}...`);
          const ocrResponse = await fetch('/api/ocr-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url }),
          });

          if (!ocrResponse.ok) {
            const errData = await ocrResponse.json();
            console.warn(`OCR failed for file ${i + 1}:`, errData);
            throw new Error(errData.error || 'OCR fehlgeschlagen');
          }

          const data = await ocrResponse.json();
          
          if (data.ingredients && Array.isArray(data.ingredients)) {
            allItems.push(...data.ingredients);
          }

          // Use the receipt data from the first successful scan, or update if needed
          if (!lastReceiptData && data.receipt) {
            lastReceiptData = {
              ...data.receipt,
              purchaseDate: data.receipt.purchaseDate || new Date().toISOString(),
              imageUrl: url // Keep the first image URL as main reference
            };
          }

        } catch (err) {
          console.error(`Error processing file ${i}:`, err);
          errorCount++;
          // Continue with next file
        }
      }

      // Set results
      setScannedItems(allItems);
      if (lastReceiptData) {
        setReceiptData(lastReceiptData);
        setReceiptName(`${lastReceiptData.storeName} - ${new Date().toLocaleDateString()}`);
      } else {
        // Fallback if no receipt data found
        setReceiptName(`Kassenbon - ${new Date().toLocaleDateString()}`);
        setReceiptData({
          id: crypto.randomUUID(),
          storeName: 'Unbekannt',
          totalAmount: 0,
          purchaseDate: new Date().toISOString(),
          imageUrl: ''
        });
      }

      if (errorCount === files.length) {
        setError('Keine Daten konnten erkannt werden. Bitte manuell eingeben.');
      } else if (errorCount > 0) {
        setError(`${errorCount} von ${files.length} Bildern konnten nicht verarbeitet werden.`);
      }

      // Always show modal to allow manual entry/correction
      setShowReviewModal(true);

    } catch (err) {
      console.error('Global processing error:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      setShowReviewModal(true); // Show modal anyway
    } finally {
      setUploading(false);
      setProgress('');
      // Reset inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleEditReceipt = (receipt: any) => {
    setEditingId(receipt.id);
    setReceiptData({
      id: receipt.id,
      storeName: receipt.storeName,
      totalAmount: receipt.totalAmount,
      purchaseDate: receipt.purchaseDate,
      imageUrl: receipt.imageUrl,
    });
    setReceiptName(receipt.name);
    setShowReviewModal(true);
  };

  const handleDeleteReceipt = async (id: string) => {
    if (confirm('Möchten Sie diesen Bon wirklich löschen?')) {
      try {
        await db.transact([tx.receipts[id].delete()]);
      } catch (err) {
        console.error('Delete error:', err);
        setError('Fehler beim Löschen');
      }
    }
  };

  const handleSaveReceipt = async () => {
    if (!receiptName) {
      setError('Bitte einen Namen für den Bon eingeben');
      return;
    }

    setProcessing(true);
    try {
      const receiptId = receiptData?.id || crypto.randomUUID();
      
      // 1. Save Receipt
      const txs = [
        tx.receipts[receiptId].update({
          name: receiptName,
          storeName: receiptData?.storeName || 'Unbekannt',
          totalAmount: scannedItems.reduce((sum, item) => sum + item.totalPrice, 0),
          purchaseDate: receiptData?.purchaseDate || new Date().toISOString(),
          processed: true,
          imageUrl: receiptData?.imageUrl || '',
        })
      ];

      // 2. Handle Ingredients
      // If editing, find items to delete
      if (editingId && editIngredientsData?.ingredients) {
        const currentIds = new Set(scannedItems.map(i => i.id));
        const toDelete = editIngredientsData.ingredients.filter((i: any) => !currentIds.has(i.id));
        toDelete.forEach((i: any) => {
          txs.push(tx.ingredients[i.id].delete());
        });
      }

      // Update/Create ingredients
      scannedItems.forEach(item => {
        txs.push(
          tx.ingredients[item.id].update({
            name: item.name,
            shop: item.shop,
            pricePerUnit: item.pricePerUnit,
            unitSize: item.quantity,
            unitType: item.unit,
            category: 'Sonstiges',
            pricePerKg: item.unit === 'kg' ? item.pricePerUnit / item.quantity : 0,
            lastPurchaseDate: new Date().toISOString(),
            receiptId: receiptId,
          })
        );
      });

      await db.transact(txs);

      setSuccess(true);
      setShowReviewModal(false);
      setScannedItems([]);
      setReceiptData(null);
      setEditingId(null);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setError('Fehler beim Speichern');
    } finally {
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
          className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-primary-500 transition-colors disabled:opacity-50 relative"
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
          className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-primary-500 transition-colors disabled:opacity-50 relative"
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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-blue-800 dark:text-blue-300">{progress || 'Verarbeite...'}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-300 font-semibold">Kassenbon erfolgreich gespeichert!</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <div className="text-red-800 dark:text-red-300 font-semibold">Hinweis</div>
            <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <div className="flex-1">
                <h3 className="text-2xl font-bold dark:text-white mb-2">Kassenbon prüfen</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={receiptName}
                    onChange={(e) => setReceiptName(e.target.value)}
                    placeholder="Bonname eingeben..."
                    className="w-full max-w-md px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Laden</label>
                      <input
                        type="text"
                        value={receiptData?.storeName || ''}
                        onChange={(e) => setReceiptData(prev => prev ? { ...prev, storeName: e.target.value } : null)}
                        className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kaufdatum</label>
                      <input
                        type="date"
                        value={receiptData?.purchaseDate ? new Date(receiptData.purchaseDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => setReceiptData(prev => prev ? { ...prev, purchaseDate: new Date(e.target.value).toISOString() } : null)}
                        className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                      />
                    </div>
                  </div>
                </div>
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
                <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <p className="mb-2">Keine Artikel automatisch erkannt.</p>
                  <button onClick={handleAddItem} className="text-primary-600 hover:underline">
                    Artikel manuell hinzufügen
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scannedItems.map((item) => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-4">
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

                        <div className="md:col-span-2">
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

                        <div className="md:col-span-2">
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

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Preis (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.pricePerUnit}
                            onChange={(e) => handleUpdateItem(item.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg"
                          />
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-6 flex justify-end gap-3 z-10">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveReceipt}
                disabled={processing || scannedItems.length === 0}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Speichern
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
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-primary-600">
                    {receipt.totalAmount?.toFixed(2)} €
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditReceipt(receipt)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReceipt(receipt.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
