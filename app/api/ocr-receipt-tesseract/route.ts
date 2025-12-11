import { NextResponse } from 'next/server';
import { calculatePriceConversions } from '@/lib/utils';

/**
 * ALTERNATIVE OCR-LÖSUNG MIT TESSERACT.JS
 * 
 * Diese Version läuft komplett kostenlos im Browser!
 * Keine API-Keys nötig, keine monatlichen Limits.
 * 
 * Um diese zu nutzen:
 * 1. Installiere: npm install tesseract.js
 * 2. Benenne diese Datei um zu: app/api/ocr-receipt-tesseract/route.ts
 * 3. Ändere in ReceiptUpload.tsx die URL zu: '/api/ocr-receipt-tesseract'
 */

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Keine Bild-URL angegeben' },
        { status: 400 }
      );
    }

    // Lade Tesseract.js dynamisch
    const Tesseract = require('tesseract.js');

    // OCR mit Tesseract
    const { data: { text } } = await Tesseract.recognize(
      imageUrl,
      'deu', // Deutsch
      {
        logger: (m: any) => console.log(m), // Optional: Progress logging
      }
    );

    if (!text) {
      throw new Error('Kein Text erkannt');
    }

    // Intelligente Verarbeitung des Textes
    const parsedData = parseReceiptText(text);

    // Verarbeite die Items und erstelle Ingredients
    const ingredients = parsedData.items.map((item: any) => {
      const conversions = calculatePriceConversions(
        item.price,
        item.quantity,
        item.unit
      );

      return {
        id: crypto.randomUUID(),
        name: item.name,
        shop: parsedData.storeName || 'Unbekannt',
        pricePerUnit: item.price,
        unitSize: item.quantity,
        unitType: item.unit,
        ...conversions,
      };
    });

    return NextResponse.json({
      receipt: {
        id: crypto.randomUUID(),
        storeName: parsedData.storeName,
        totalAmount: parsedData.totalAmount,
        rawText: text,
      },
      ingredients,
    });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: 'OCR-Verarbeitung fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler') },
      { status: 500 }
    );
  }
}

// Selbe Parse-Funktion wie in der OCR.space Version
function parseReceiptText(text: string): {
  storeName: string;
  totalAmount: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    unit: string;
  }>;
} {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let storeName = 'Unbekannt';
  const storePatterns = ['REWE', 'EDEKA', 'ALDI', 'LIDL', 'KAUFLAND', 'PENNY', 'NETTO'];
  for (const line of lines.slice(0, 5)) {
    for (const pattern of storePatterns) {
      if (line.toUpperCase().includes(pattern)) {
        storeName = pattern;
        break;
      }
    }
    if (storeName !== 'Unbekannt') break;
  }

  let totalAmount = 0;
  const totalPatterns = ['SUMME', 'GESAMT', 'TOTAL', 'BETRAG', 'EUR'];
  for (const line of lines) {
    if (totalPatterns.some(pattern => line.toUpperCase().includes(pattern))) {
      const priceMatch = line.match(/(\d+[,.]?\d*)/);
      if (priceMatch) {
        totalAmount = parseFloat(priceMatch[1].replace(',', '.'));
      }
    }
  }

  const items: Array<any> = [];
  const itemRegex = /^(.+?)\s+(\d+[,.]?\d*)\s*€?$/;
  const quantityRegex = /(\d+[,.]?\d*)\s*(kg|g|l|ml|stück|stk)/i;

  for (const line of lines) {
    const match = line.match(itemRegex);
    if (match) {
      const [, productText, priceStr] = match;
      const price = parseFloat(priceStr.replace(',', '.'));

      let quantity = 1;
      let unit = 'Stück';
      const qtyMatch = productText.match(quantityRegex);
      if (qtyMatch) {
        quantity = parseFloat(qtyMatch[1].replace(',', '.'));
        unit = normalizeUnit(qtyMatch[2]);
      }

      let name = productText.replace(quantityRegex, '').trim();
      
      const ignoreWords = ['PFAND', 'TÜTE', 'TASCHE', 'BAG'];
      if (ignoreWords.some(word => name.toUpperCase().includes(word))) {
        continue;
      }

      if (name.length > 2 && price > 0) {
        items.push({ name, price, quantity, unit });
      }
    }
  }

  return { storeName, totalAmount, items };
}

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase();
  if (u === 'kg') return 'kg';
  if (u === 'g') return 'g';
  if (u === 'l') return 'l';
  if (u === 'ml') return 'ml';
  if (u === 'stück' || u === 'stk') return 'Stück';
  return unit;
}
