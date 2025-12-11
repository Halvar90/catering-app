import { NextResponse } from 'next/server';
import { calculatePriceConversions } from '@/lib/utils';
import { createWorker } from 'tesseract.js';
import Client from '@veryfi/veryfi-sdk';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Keine Bild-URL angegeben' },
        { status: 400 }
      );
    }

    let extractedText = '';
    let source = 'ocr.space';
    let veryfiResult = null;

    // 0. Versuch: Veryfi (wenn Credentials vorhanden - bevorzugt)
    if (process.env.VERYFI_CLIENT_ID && process.env.VERYFI_CLIENT_SECRET && process.env.VERYFI_USERNAME && process.env.VERYFI_API_KEY) {
      try {
        const veryfiClient = new Client(
          process.env.VERYFI_CLIENT_ID,
          process.env.VERYFI_CLIENT_SECRET,
          process.env.VERYFI_USERNAME,
          process.env.VERYFI_API_KEY
        );
        
        // Veryfi verarbeitet die URL direkt
        const response = await veryfiClient.process_document_from_url(imageUrl);

        if (response) {
          veryfiResult = response;
          source = 'veryfi';
        }
      } catch (e) {
        console.warn('Veryfi failed, falling back to other providers', e);
      }
    }

    // Wenn Veryfi erfolgreich war, verarbeiten wir die strukturierten Daten direkt
    if (veryfiResult) {
      const storeName = veryfiResult.vendor?.name || 'Unbekannt';
      const totalAmount = veryfiResult.total || 0;
      const purchaseDate = veryfiResult.date ? new Date(veryfiResult.date).toISOString() : null;
      
      const ingredients = (veryfiResult.line_items || []).map((item: any) => {
        const name = item.description || 'Unbekannter Artikel';
        const totalLinePrice = item.total || 0;
        const quantity = item.quantity || 1;
        // Veryfi liefert manchmal Einheiten, sonst Default
        const unit = item.unit || 'Stück'; 

        const conversions = calculatePriceConversions(
          totalLinePrice,
          quantity,
          unit
        );

        return {
          id: crypto.randomUUID(),
          name: name,
          shop: storeName,
          pricePerUnit: totalLinePrice / quantity,
          unitSize: quantity,
          unitType: unit,
          ...conversions,
        };
      });

      return NextResponse.json({
        receipt: {
          id: crypto.randomUUID(),
          storeName,
          totalAmount,
          purchaseDate,
          rawText: veryfiResult.ocr_text || '',
          source,
        },
        ingredients,
      });
    }

    // 1. Versuch: OCR.space (wenn API Key vorhanden)
    if (process.env.OCR_API_KEY) {
      try {
        const formData = new FormData();
        formData.append('url', imageUrl);
        formData.append('language', 'ger');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2');

        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: {
            'apikey': process.env.OCR_API_KEY,
          },
          body: formData,
        });

        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          if (!ocrData.IsErroredOnProcessing) {
            extractedText = ocrData.ParsedResults?.[0]?.ParsedText || '';
          }
        }
      } catch (e) {
        console.warn('OCR.space failed, falling back to Tesseract', e);
      }
    }

    // 2. Versuch: Tesseract.js (Fallback oder wenn kein Key)
    if (!extractedText) {
      source = 'tesseract';
      try {
        const worker = await createWorker('deu');
        const ret = await worker.recognize(imageUrl);
        extractedText = ret.data.text;
        await worker.terminate();
      } catch (e) {
        console.error('Tesseract failed:', e);
        throw new Error('OCR fehlgeschlagen');
      }
    }

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
        pricePerUnit: item.price / item.quantity,
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
        source,
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

  // Extrahiere Artikel
  const items: Array<any> = [];
  let pendingName = ''; // Für mehrzeilige Artikel
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ignoriere Header/Footer/Metadaten
    if (line.toUpperCase().includes('LIDL') || 
        line.toUpperCase().includes('MINDENERSTR') ||
        line.toUpperCase().includes('SUMME') ||
        line.toUpperCase().includes('ZAHLUNG') ||
        line.toUpperCase().includes('RÜCKGELD') ||
        line.toUpperCase().includes('UST') ||
        line.toUpperCase().includes('KARTE') ||
        line.toUpperCase().includes('DATUM') ||
        line.toUpperCase().includes('EUR/KG') || // Ignoriere Preiszeilen ohne Artikel
        line.length < 3) {
      continue;
    }

    // Ignoriere Rabatte
    if (line.toUpperCase().includes('RABATT') || line.toUpperCase().includes('PREISVORTEIL')) {
      continue;
    }

    // Regex Strategien
    let matched = false;

    // 1. LIDL Format: "Name Preis x Menge Total A"
    // Bsp: "K.champignons 1,99 x 2 3,98 A"
    const lidlMultiMatch = line.match(/^(.+?)\s+(\d+[,.]\d{2})\s*x\s*(\d+(?:[,.]\d+)?)\s+(\d+[,.]\d{2})\s*[A-Z]?$/);
    if (lidlMultiMatch) {
      const [, name, pricePerUnit, quantity, total] = lidlMultiMatch;
      addItem(items, name, parseFloat(total.replace(',', '.')), parseFloat(quantity.replace(',', '.')), 'Stück');
      matched = true;
      pendingName = '';
    }

    // 2. LIDL Format: "Name Total A" (Einzelartikel)
    // Bsp: "Passionsfrucht 2,49 A"
    // Achtung: Muss unterscheiden von "Name 123" (PLU Code)
    if (!matched) {
      const lidlSingleMatch = line.match(/^(.+?)\s+(\d+[,.]\d{2})\s*[A-Z]?$/);
      if (lidlSingleMatch) {
        const [, name, total] = lidlSingleMatch;
        // Prüfe ob Name nur Zahlen enthält (PLU)
        if (!/^\d+$/.test(name.trim())) {
          addItem(items, name, parseFloat(total.replace(',', '.')), 1, 'Stück');
          matched = true;
          pendingName = '';
        }
      }
    }

    // 3. Mehrzeilige Artikel (Name auf Zeile 1, Preis auf Zeile 2 oder 3)
    // Bsp: "Ingwer Bio" -> "0,048 kg x 4,90 EUR/kg" -> "0,24 A"
    if (!matched) {
      // Ist es eine Preiszeile?
      const priceLineMatch = line.match(/(\d+[,.]\d{2})\s*[A-Z]$/); // Endet auf Preis + A/B
      if (priceLineMatch && pendingName) {
        const total = parseFloat(priceLineMatch[1].replace(',', '.'));
        
        // Versuche Menge aus vorheriger Zeile oder aktueller Zeile zu lesen
        // Hier vereinfacht: Wenn wir einen pendingName haben und jetzt einen Preis finden, nehmen wir es an
        // Menge extrahieren ist schwer über Zeilen hinweg ohne Kontext
        
        // Check if current line has quantity info like "0,048 kg x ..."
        // Aber oft steht das in der Zeile DAVOR oder in DIESER Zeile
        
        // Einfacher Fall: Wir nehmen den Preis und pendingName
        addItem(items, pendingName, total, 1, 'Stück'); // Menge 1 als Fallback, Einheit Stück
        matched = true;
        pendingName = '';
      } else if (!line.match(/\d+[,.]\d{2}/)) {
        // Zeile hat KEINEN Preis -> Könnte ein Name sein
        // Aber nur wenn nicht zu kurz und keine Metadaten
        if (line.length > 3 && !line.includes('EUR')) {
          pendingName = line;
          matched = true; // Wir haben es "verarbeitet" (gebuffert)
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

function addItem(items: any[], name: string, price: number, quantity: number, unit: string) {
  // Clean name
  let cleanName = name.trim();
  
  // Extrahiere Menge aus Name wenn möglich (z.B. "Bio Möhren 1kg")
  const weightMatch = cleanName.match(/(\d+[,.]?\d*)\s*(kg|g|l|ml)/i);
  if (weightMatch) {
    const weight = parseFloat(weightMatch[1].replace(',', '.'));
    const weightUnit = weightMatch[2].toLowerCase();
    // Wenn quantity 1 ist, überschreiben wir es mit dem Gewicht
    if (quantity === 1) {
      quantity = weight;
      unit = weightUnit;
    }
    cleanName = cleanName.replace(weightMatch[0], '').trim();
  }

  // Filter bad names
  const ignoreWords = ['PFAND', 'TÜTE', 'TASCHE', 'RABATT', 'SUMME', 'EUR'];
  if (ignoreWords.some(w => cleanName.toUpperCase().includes(w))) return;

  items.push({
    name: cleanName,
    price,
    quantity,
    unit
  });
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
