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

    // OPTION 1: OpenAI GPT-4o (Beste Qualität für Handschrift)
    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "Du bist ein Experte für das Erkennen von Rezepten, auch handschriftlichen. Extrahiere die Daten als JSON."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extrahiere das Rezept aus diesem Bild. Gib NUR ein JSON-Objekt zurück mit folgender Struktur: { name: string, portions: number, prepTime: number (in Minuten), category: 'Vorspeise' | 'Hauptgericht' | 'Dessert' | 'Snack', description: string, ingredients: { amount: number, unit: string, name: string }[], steps: string[] }. Normalisiere Einheiten auf metrisch (g, kg, ml, l, Stück) wo möglich. Wenn etwas nicht lesbar ist, rate sinnvoll." },
                  { type: "image_url", image_url: { url: imageUrl } }
                ]
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 1000
          })
        });

        if (openaiResponse.ok) {
          const data = await openaiResponse.json();
          const content = data.choices[0].message.content;
          const parsedRecipe = JSON.parse(content);
          
          return NextResponse.json({
            recipe: parsedRecipe,
            rawText: "Via OpenAI GPT-4o erkannt",
            source: "openai"
          });
        }
      } catch (e) {
        console.error("OpenAI Fallback failed, trying OCR.space", e);
      }
    }

    // OPTION 2: OCR.space (Fallback / Kostenlos)
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
      source: "ocr.space"
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
    recipe.name = lines[0].replace(/[:.]\s*$/, ''); // Entferne Doppelpunkte am Ende
  }

  let currentSection = '';
  
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
      // Verbessert: Erlaubt auch Komma als Dezimaltrenner und OCR-Fehler wie 'g' als '9'
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
      
      // Entferne Nummerierung am Anfang (1., 1), a), etc.)
      stepText = stepText.replace(/^(\d+[.)]|\w\))\s*/, '');
      
      recipe.steps.push(stepText);
    }
  }

  return recipe;
}

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().replace('.', '');
  if (u === 'kg' || u === 'kilo' || u === 'kilogramm') return 'kg';
  if (u === 'g' || u === 'gr' || u === 'gramm') return 'g';
  if (u === 'l' || u === 'liter') return 'l';
  if (u === 'ml' || u === 'milliliter') return 'ml';
  if (u === 'el' || u === 'essl' || u === 'esslöffel' || u === 'tbsp') return 'EL';
  if (u === 'tl' || u === 'teel' || u === 'teelöffel' || u === 'tsp') return 'TL';
  if (u === 'stück' || u === 'stk' || u === 'st') return 'Stück';
  if (u === 'prise' || u === 'pr' || u === 'prisen') return 'Prise';
  if (u === 'dose' || u === 'dosen') return 'Dose';
  if (u === 'bund' || u === 'bd') return 'Bund';
  if (u === 'zehe' || u === 'zehen') return 'Zehe';
  return unit;
}
