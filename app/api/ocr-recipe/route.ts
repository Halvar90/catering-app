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
    ingredients: [],
    steps: [],
  };

  // Erste Zeile ist der Name
  if (lines.length > 0) {
    recipe.name = lines[0];
  }

  let currentSection = '';
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Portionen erkennen
    if (lowerLine.includes('portion')) {
      const match = line.match(/(\d+)/);
      if (match) recipe.portions = parseInt(match[1]);
      continue;
    }

    // Zeit erkennen
    if (lowerLine.includes('zeit') || lowerLine.includes('min')) {
      const match = line.match(/(\d+)/);
      if (match) recipe.prepTime = parseInt(match[1]);
      continue;
    }

    // Sektionen erkennen
    if (lowerLine.includes('zutaten') || lowerLine.includes('ingredient')) {
      currentSection = 'ingredients';
      continue;
    }
    if (lowerLine.includes('zubereitung') || lowerLine.includes('schritt') || lowerLine.includes('anleitung')) {
      currentSection = 'steps';
      continue;
    }

    // Zutaten parsen (- 500g Mehl)
    if (currentSection === 'ingredients' && (line.startsWith('-') || line.startsWith('•') || /^\d/.test(line))) {
      const cleaned = line.replace(/^[-•]\s*/, '');
      const match = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(\w+)\s+(.+)$/);
      
      if (match) {
        recipe.ingredients.push({
          amount: parseFloat(match[1].replace(',', '.')),
          unit: match[2],
          name: match[3],
        });
      } else {
        // Fallback ohne Menge
        recipe.ingredients.push({
          amount: 1,
          unit: 'Stück',
          name: cleaned,
        });
      }
      continue;
    }

    // Schritte parsen (1. oder numeriert)
    if (currentSection === 'steps' && (line.match(/^\d+\./) || line.match(/^\d+\)/))) {
      const stepText = line.replace(/^\d+[\.)]\s*/, '');
      recipe.steps.push(stepText);
      continue;
    }

    // Wenn kein Match, könnte es ein langer Step ohne Nummer sein
    if (currentSection === 'steps' && line.length > 20) {
      recipe.steps.push(line);
    }
  }

  return recipe;
}
