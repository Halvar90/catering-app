// Preisberechnungen für verschiedene Einheiten
export function calculatePriceConversions(
  pricePerUnit: number,
  unitSize: number,
  unitType: string
) {
  const conversions: {
    pricePerKg?: number;
    pricePerLiter?: number;
    pricePerPiece?: number;
    pricePerHundredGram?: number;
  } = {};

  switch (unitType.toLowerCase()) {
    case 'g':
    case 'gramm':
    case 'gram':
      conversions.pricePerKg = (pricePerUnit / unitSize) * 1000;
      conversions.pricePerHundredGram = (pricePerUnit / unitSize) * 100;
      break;
    case 'kg':
    case 'kilogramm':
      conversions.pricePerKg = pricePerUnit / unitSize;
      conversions.pricePerHundredGram = (pricePerUnit / unitSize) / 10;
      break;
    case 'ml':
    case 'milliliter':
      conversions.pricePerLiter = (pricePerUnit / unitSize) * 1000;
      break;
    case 'l':
    case 'liter':
      conversions.pricePerLiter = pricePerUnit / unitSize;
      break;
    case 'stück':
    case 'stuck':
    case 'piece':
    case 'pcs':
      conversions.pricePerPiece = pricePerUnit / unitSize;
      break;
  }

  return conversions;
}

// Rezeptkosten berechnen
export function calculateRecipeCost(
  ingredients: Array<{
    amount: number;
    unit: string;
    ingredient: {
      pricePerKg?: number;
      pricePerLiter?: number;
      pricePerPiece?: number;
      pricePerHundredGram?: number;
      unitType: string;
    };
  }>
): number {
  let totalCost = 0;

  for (const item of ingredients) {
    const { amount, unit, ingredient } = item;
    let itemCost = 0;

    // Konvertiere Einheiten und berechne Kosten
    switch (unit.toLowerCase()) {
      case 'g':
      case 'gramm':
        if (ingredient.pricePerKg) {
          itemCost = (amount / 1000) * ingredient.pricePerKg;
        } else if (ingredient.pricePerHundredGram) {
          itemCost = (amount / 100) * ingredient.pricePerHundredGram;
        }
        break;
      case 'kg':
        if (ingredient.pricePerKg) {
          itemCost = amount * ingredient.pricePerKg;
        }
        break;
      case 'ml':
        if (ingredient.pricePerLiter) {
          itemCost = (amount / 1000) * ingredient.pricePerLiter;
        }
        break;
      case 'l':
        if (ingredient.pricePerLiter) {
          itemCost = amount * ingredient.pricePerLiter;
        }
        break;
      case 'stück':
      case 'stuck':
      case 'piece':
        if (ingredient.pricePerPiece) {
          itemCost = amount * ingredient.pricePerPiece;
        }
        break;
    }

    totalCost += itemCost;
  }

  return totalCost;
}

// Margin-Berechnung
export function calculateSellingPrice(
  costPerPortion: number,
  marginPercent: number
): number {
  return costPerPortion * (1 + marginPercent / 100);
}

// Empfohlene Margin basierend auf Kosten (Industrie-Standard)
export function getSuggestedMargin(costPerPortion: number): number {
  if (costPerPortion < 2) return 300; // 300% für günstige Items
  if (costPerPortion < 5) return 250; // 250%
  if (costPerPortion < 10) return 200; // 200%
  return 150; // 150% für teurere Items
}

// Formatierung
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Einheiten normalisieren
export function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  const unitMap: Record<string, string> = {
    'g': 'g',
    'gramm': 'g',
    'gram': 'g',
    'kg': 'kg',
    'kilogramm': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'l': 'l',
    'liter': 'l',
    'stück': 'Stück',
    'stuck': 'Stück',
    'piece': 'Stück',
    'pcs': 'Stück',
  };
  return unitMap[normalized] || unit;
}

// Allergene extrahieren (aus Text oder Array)
export function parseAllergens(allergensString: string): string[] {
  if (!allergensString) return [];
  return allergensString
    .split(',')
    .map(a => a.trim())
    .filter(a => a.length > 0);
}

// MHD-Warnung
export function getExpiryWarning(expiryDate: string): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number;
} {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    isExpired: daysUntilExpiry < 0,
    isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
    daysUntilExpiry,
  };
}
