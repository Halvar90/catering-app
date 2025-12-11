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
        purchaseDate: parsedData.purchaseDate,
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
  purchaseDate: string | null;
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
  const storePatterns = ['REWE', 'EDEKA', 'ALDI', 'LIDL', 'KAUFLAND', 'PENNY', 'NETTO', 'DM', 'ROSSMANN', 'MÜLLER'];
  for (const line of lines.slice(0, 10)) {
    for (const pattern of storePatterns) {
      if (line.toUpperCase().includes(pattern)) {
        storeName = pattern;
        break;
      }
    }
    if (storeName !== 'Unbekannt') break;
  }

  // Erkenne Datum
  let purchaseDate: string | null = null;
  // Patterns: DD.MM.YYYY, DD.MM.YY, YYYY-MM-DD
  const datePatterns = [
    /(\d{2})\.(\d{2})\.(\d{4})/,
    /(\d{2})\.(\d{2})\.(\d{2})/,
    /(\d{4})-(\d{2})-(\d{2})/
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          let day, month, year;
          if (pattern.source.includes('d{4}-')) {
             // YYYY-MM-DD
             year = parseInt(match[1]);
             month = parseInt(match[2]) - 1;
             day = parseInt(match[3]);
          } else {
             // DD.MM.YYYY or DD.MM.YY
             day = parseInt(match[1]);
             month = parseInt(match[2]) - 1;
             year = parseInt(match[3]);
             if (year < 100) year += 2000; // Assume 20xx
          }
          
          const date = new Date(year, month, day);
          // Basic validation
          if (!isNaN(date.getTime()) && year > 2000 && year < 2100) {
             purchaseDate = date.toISOString();
             break;
          }
        } catch (e) {
          // Ignore invalid dates
        }
      }
    }
    if (purchaseDate) break;
  }

  // Erkenne Gesamtbetrag (SUMME, GESAMT, TOTAL, etc.)
  let totalAmount = 0;
  const totalPatterns = ['SUMME', 'GESAMT', 'TOTAL', 'BETRAG', 'ZAHLUNG', 'ZU ZAHLEN'];
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (totalPatterns.some(pattern => upper.includes(pattern))) {
      const priceMatch = line.match(/(\d+[,.]?\d{2})\s*€?/);
      if (priceMatch) {
        totalAmount = parseFloat(priceMatch[1].replace(',', '.'));
      }
    }
  }

  // Extrahiere Artikel (verbessert für LIDL-Format)
  const items: Array<any> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ignoriere Header/Footer
    if (line.toUpperCase().includes('LIDL') || 
        line.toUpperCase().includes('MINDENERSTR') ||
        line.toUpperCase().includes('SUMME') ||
        line.toUpperCase().includes('ZAHLUNG') ||
        line.toUpperCase().includes('RÜCKGELD') ||
        line.toUpperCase().includes('UST') ||
        line.toUpperCase().includes('KARTE') ||
        line.toUpperCase().includes('DATUM') ||
        line.length < 3) {
      continue;
    }

    // LIDL Format: "K.champignons 1,99 x 2 3,98 A"
    // oder: "Passionsfrucht 2,49 A"
    const pricePattern = /^(.+?)\s+(\d+[,.]?\d*)\s*(?:x\s*(\d+))?\s+(\d+[,.]?\d+)\s*[A-Z]?$/;
    const match = line.match(pricePattern);
    
    if (match) {
      const [, productName, pricePerUnitStr, quantityStr, totalPriceStr] = match;
      
      const quantity = quantityStr ? parseFloat(quantityStr) : 1;
      const pricePerUnit = parseFloat(pricePerUnitStr.replace(',', '.'));
      const totalPrice = parseFloat(totalPriceStr.replace(',', '.'));
      
      // Produktname bereinigen
      let name = productName.trim();
      
      // Ignoriere typische Nicht-Lebensmittel & LIDL Plus Rabatt
      const ignoreWords = ['PFAND', 'TÜTE', 'TASCHE', 'BAG', 'RABATT', 'PLUS'];
      if (ignoreWords.some(word => name.toUpperCase().includes(word))) {
        continue;
      }

      // Erkenne Einheit aus Name (z.B. "0,048 kg" -> 0.048 kg)
      let unit = 'Stück';
      let extractedQuantity = quantity;
      
      const weightMatch = name.match(/(\d+[,.]?\d*)\s*(kg|g)/i);
      if (weightMatch) {
        extractedQuantity = parseFloat(weightMatch[1].replace(',', '.'));
        unit = weightMatch[2].toLowerCase() === 'kg' ? 'kg' : 'g';
        // Name bereinigen
        name = name.replace(weightMatch[0], '').trim();
      }

      if (name.length > 2 && totalPrice > 0) {
        items.push({ 
          name, 
          price: totalPrice, 
          quantity: extractedQuantity * quantity, 
          unit 
        });
      }
    } else {
      // Fallback: Einfaches Format "Produktname Preis€"
      const simpleMatch = line.match(/^(.+?)\s+(\d+[,.]?\d+)\s*€?$/);
      if (simpleMatch) {
        const [, name, priceStr] = simpleMatch;
        const price = parseFloat(priceStr.replace(',', '.'));
        
        const ignoreWords = ['PFAND', 'TÜTE', 'RABATT', 'PLUS', 'SUMME', 'DATUM', 'UHRZEIT'];
        if (!ignoreWords.some(word => name.toUpperCase().includes(word)) && name.length > 2) {
          items.push({ name: name.trim(), price, quantity: 1, unit: 'Stück' });
        }
      }
    }
  }

  return {
    storeName,
    totalAmount,
    purchaseDate,
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
