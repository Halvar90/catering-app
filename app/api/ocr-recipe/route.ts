import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Keine Bild-URL angegeben' },
        { status: 400 }
      );
    }

    // OCR.space API für Rezept-Text
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

    // Parse Rezept-Format
    const parsedRecipe = parseRecipeText(extractedText);

    return NextResponse.json({
      recipe: parsedRecipe,
      rawText: extractedText,
    });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR fehlgeschlagen' },
      { status: 500 }
    );
  }
}

function parseRecipeText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  const recipe: any = {
    name: '',
    portions: 4,
    prepTime: 30,
    category: 'Sonstiges',
    description: '',
    ingredients: [],
    steps: [],
  };

  // Erste nicht-leere Zeile ist wahrscheinlich der Name
  if (lines.length > 0) {
    recipe.name = lines[0];
  }

  let currentSection = '';
  let stepCounter = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Portionen erkennen (flexibler)
    if (lowerLine.includes('portion') || lowerLine.includes('pers') || lowerLine.includes('serv')) {
      const match = line.match(/(\d+)/);
      if (match) recipe.portions = parseInt(match[1]);
      continue;
    }

    // Zeit erkennen (flexibler)
    if (lowerLine.includes('zeit') || lowerLine.includes('dauer') || lowerLine.match(/\d+\s*min/)) {
      const match = line.match(/(\d+)/);
      if (match) recipe.prepTime = parseInt(match[1]);
      continue;
    }

    // Kategorie erkennen
    if (lowerLine.includes('kategorie') || lowerLine.includes('art')) {
      if (lowerLine.includes('vorspeis')) recipe.category = 'Vorspeise';
      else if (lowerLine.includes('haupt')) recipe.category = 'Hauptgericht';
      else if (lowerLine.includes('dessert') || lowerLine.includes('nachspeis')) recipe.category = 'Dessert';
      else if (lowerLine.includes('snack')) recipe.category = 'Snack';
      continue;
    }

    // Sektionen erkennen (flexibler)
    if (lowerLine.includes('zutaten') || lowerLine.includes('ingredient') || lowerLine === 'ingredients:') {
      currentSection = 'ingredients';
      continue;
    }
    if (lowerLine.includes('zubereitung') || lowerLine.includes('anleitung') || 
        lowerLine.includes('schritt') || lowerLine.includes('instruction') ||
        lowerLine === 'steps:' || lowerLine === 'directions:') {
      currentSection = 'steps';
      stepCounter = 0;
      continue;
    }

    // Beschreibung (vor Zutaten/Schritte)
    if (!currentSection && line.length > 30 && i > 0) {
      recipe.description += (recipe.description ? ' ' : '') + line;
      continue;
    }

    // Zutaten parsen - MEHRERE MUSTER
    if (currentSection === 'ingredients') {
      // Ignoriere Section Header
      if (line.length < 3) continue;

      let cleaned = line;
      let matched = false;

      // Muster 1: "- 500g Mehl" oder "• 500g Mehl"
      if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
        cleaned = line.replace(/^[-•*]\s*/, '');
      }

      // Muster 2: "500 g Mehl"
      const pattern1 = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-ZäöüÄÖÜß]+)\s+(.+)$/);
      if (pattern1) {
        recipe.ingredients.push({
          amount: parseFloat(pattern1[1].replace(',', '.')),
          unit: normalizeUnit(pattern1[2]),
          name: pattern1[3].trim(),
        });
        matched = true;
      }

      // Muster 3: "1/2 Zwiebel" (Bruch)
      if (!matched) {
        const pattern2 = cleaned.match(/^(\d+\/\d+)\s+(.+)$/);
        if (pattern2) {
          const [num, denom] = pattern2[1].split('/').map(Number);
          recipe.ingredients.push({
            amount: num / denom,
            unit: 'Stück',
            name: pattern2[2].trim(),
          });
          matched = true;
        }
      }

      // Muster 4: "2 Eier" (nur Zahl + Text)
      if (!matched) {
        const pattern3 = cleaned.match(/^(\d+)\s+(.+)$/);
        if (pattern3) {
          recipe.ingredients.push({
            amount: parseInt(pattern3[1]),
            unit: 'Stück',
            name: pattern3[2].trim(),
          });
          matched = true;
        }
      }

      // Muster 5: "Salz und Pfeffer" (nur Text, keine Menge)
      if (!matched && cleaned.length > 2) {
        recipe.ingredients.push({
          amount: 1,
          unit: 'nach Geschmack',
          name: cleaned.trim(),
        });
      }
      
      continue;
    }

    // Schritte parsen - MEHRERE MUSTER
    if (currentSection === 'steps') {
      if (line.length < 5) continue; // Zu kurz

      let stepText = line;
      let matched = false;

      // Muster 1: "1. Text" oder "1) Text"
      const pattern1 = line.match(/^(\d+)[\.)]\s*(.+)$/);
      if (pattern1) {
        stepText = pattern1[2];
        matched = true;
      }

      // Muster 2: "Schritt 1: Text"
      const pattern2 = line.match(/^(?:Schritt|Step)\s*\d+:?\s*(.+)$/i);
      if (pattern2) {
        stepText = pattern2[1];
        matched = true;
      }

      // Wenn langer Text ohne Nummer, könnte es ein Step sein
      if (!matched && line.length > 15) {
        matched = true;
      }

      if (matched && stepText.trim().length > 3) {
        recipe.steps.push(stepText.trim());
        stepCounter++;
      }
      
      continue;
    }
  }

  // Falls keine Steps erkannt wurden, versuche alle langen Zeilen nach Zutaten
  if (recipe.steps.length === 0 && recipe.ingredients.length > 0) {
    let foundIngredients = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('zutaten')) foundIngredients = true;
      if (foundIngredients && line.length > 30 && !line.toLowerCase().includes('zutaten')) {
        recipe.steps.push(line);
      }
    }
  }

  return recipe;
}

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase();
  if (u === 'kg' || u === 'kilogramm') return 'kg';
  if (u === 'g' || u === 'gramm') return 'g';
  if (u === 'l' || u === 'liter') return 'l';
  if (u === 'ml' || u === 'milliliter') return 'ml';
  if (u === 'el' || u === 'essl' || u === 'esslöffel') return 'EL';
  if (u === 'tl' || u === 'teel' || u === 'teelöffel') return 'TL';
  if (u === 'stück' || u === 'stk' || u === 'stk.') return 'Stück';
  if (u === 'prise' || u === 'prisen') return 'Prise';
  return unit;
}
