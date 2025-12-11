import { NextResponse } from 'next/server';
import { calculatePriceConversions } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Keine Bild-URL angegeben' },
        { status: 400 }
      );
    }

    // OCR.space API aufrufen (kostenlos)
    const formData = new FormData();
    formData.append('url', imageUrl);
    formData.append('language', 'ger'); // Deutsch
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 ist besser für Deutsch

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': process.env.OCR_API_KEY!,
      },
      body: formData,
    });

    if (!ocrResponse.ok) {
      throw new Error('OCR.space API Fehler');
    }

    const ocrData = await ocrResponse.json();

    if (ocrData.IsErroredOnProcessing) {
      throw new Error(ocrData.ErrorMessage?.[0] || 'OCR Fehler');
    }

    const extractedText = ocrData.ParsedResults?.[0]?.ParsedText || '';

    if (!extractedText) {
      throw new Error('Kein Text erkannt');
    }

    // Intelligente Verarbeitung des Textes
    const parsedData = parseReceiptText(extractedText);

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
        rawText: extractedText,
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

// Intelligente Parsing-Funktion für Kassenbon-Text
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

  // Erkenne Laden-Namen (meist in den ersten Zeilen)
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

  // Erkenne Gesamtbetrag (SUMME, GESAMT, TOTAL, etc.)
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

  // Extrahiere Artikel (Zeilen mit Preis am Ende)
  const items: Array<any> = [];
  const itemRegex = /^(.+?)\s+(\d+[,.]?\d*)\s*€?$/;
  const quantityRegex = /(\d+[,.]?\d*)\s*(kg|g|l|ml|stück|stk)/i;

  for (const line of lines) {
    const match = line.match(itemRegex);
    if (match) {
      const [, productText, priceStr] = match;
      const price = parseFloat(priceStr.replace(',', '.'));

      // Versuche Menge zu extrahieren
      let quantity = 1;
      let unit = 'Stück';
      const qtyMatch = productText.match(quantityRegex);
      if (qtyMatch) {
        quantity = parseFloat(qtyMatch[1].replace(',', '.'));
        unit = normalizeUnit(qtyMatch[2]);
      }

      // Produktname bereinigen
      let name = productText.replace(quantityRegex, '').trim();
      
      // Ignoriere typische Nicht-Lebensmittel
      const ignoreWords = ['PFAND', 'TÜTE', 'TASCHE', 'BAG'];
      if (ignoreWords.some(word => name.toUpperCase().includes(word))) {
        continue;
      }

      if (name.length > 2 && price > 0) {
        items.push({ name, price, quantity, unit });
      }
    }
  }

  return {
    storeName,
    totalAmount,
    items,
  };
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
