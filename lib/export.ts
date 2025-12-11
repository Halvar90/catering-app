import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { formatPrice } from './utils';

// PDF Export für Rezept
export function exportRecipeToPDF(recipe: any, ingredients: any[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text(recipe.name, 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Portionen: ${recipe.portions}`, 20, 35);
  doc.text(`Zubereitungszeit: ${recipe.prepTime} Min`, 20, 42);
  doc.text(`Kategorie: ${recipe.category || 'Sonstiges'}`, 20, 49);
  
  // Kosten
  doc.setFontSize(14);
  doc.text('Kostenberechnung:', 20, 65);
  doc.setFontSize(11);
  doc.text(`Kosten pro Portion: ${formatPrice(recipe.totalCostPerPortion || 0)}`, 20, 73);
  doc.text(`Marge: ${recipe.customMargin || 0}%`, 20, 80);
  doc.text(`Verkaufspreis: ${formatPrice(recipe.sellingPricePerPortion || 0)}`, 20, 87);
  
  // Zutaten
  doc.setFontSize(14);
  doc.text('Zutaten:', 20, 105);
  doc.setFontSize(10);
  let yPos = 113;
  ingredients.forEach((ing: any, idx: number) => {
    doc.text(`${idx + 1}. ${ing.amount} ${ing.unit} ${ing.name}`, 25, yPos);
    yPos += 7;
  });
  
  doc.save(`${recipe.name}.pdf`);
}

// Excel Export für Einkaufsliste
export function exportShoppingListToExcel(items: any[]) {
  const data = items.map(item => ({
    'Zutat': item.ingredient?.name || '',
    'Menge': item.amount,
    'Einheit': item.unit,
    'Geschäft': item.ingredient?.shop || '',
    'Geschätzter Preis': item.estimatedPrice?.toFixed(2) || '0.00',
    'Erledigt': item.checked ? 'Ja' : 'Nein',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Einkaufsliste');
  
  XLSX.writeFile(wb, `Einkaufsliste_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Excel Export für Zutatenliste
export function exportIngredientsToExcel(ingredients: any[]) {
  const data = ingredients.map(ing => ({
    'Name': ing.name,
    'Kategorie': ing.category || '',
    'Geschäft': ing.shop,
    'Preis': ing.pricePerUnit.toFixed(2),
    'Menge': ing.unitSize,
    'Einheit': ing.unitType,
    'Preis/kg': ing.pricePerKg?.toFixed(2) || '-',
    'Bestand': ing.currentStock || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Zutaten');
  
  XLSX.writeFile(wb, `Zutaten_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// PDF Export für Kostenberechnung
export function exportCostCalculationPDF(recipe: any, recipeIngredients: any[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Kostenberechnung', 20, 20);
  doc.setFontSize(14);
  doc.text(recipe.name, 20, 30);
  
  // Header für Tabelle
  doc.setFontSize(10);
  doc.text('Zutat', 20, 45);
  doc.text('Menge', 80, 45);
  doc.text('Einzelpreis', 120, 45);
  doc.text('Gesamt', 160, 45);
  
  let yPos = 52;
  let total = 0;
  
  recipeIngredients.forEach((ri: any) => {
    const ing = ri.ingredient;
    const cost = (ing.pricePerUnit / ing.unitSize) * ri.amount;
    total += cost;
    
    doc.text(ing.name.substring(0, 25), 20, yPos);
    doc.text(`${ri.amount} ${ri.unit}`, 80, yPos);
    doc.text(formatPrice(ing.pricePerUnit / ing.unitSize), 120, yPos);
    doc.text(formatPrice(cost), 160, yPos);
    yPos += 7;
  });
  
  // Summen
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 7;
  
  doc.setFontSize(11);
  doc.text('Gesamtkosten:', 120, yPos);
  doc.text(formatPrice(total), 160, yPos);
  
  yPos += 10;
  doc.text(`Kosten pro Portion (${recipe.portions}):`, 120, yPos);
  doc.text(formatPrice(total / recipe.portions), 160, yPos);
  
  yPos += 10;
  doc.text(`Marge ${recipe.customMargin || 0}%:`, 120, yPos);
  doc.text(formatPrice((total / recipe.portions) * (recipe.customMargin || 0) / 100), 160, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.text('Verkaufspreis/Portion:', 120, yPos);
  doc.text(formatPrice(recipe.sellingPricePerPortion || 0), 160, yPos);
  
  doc.save(`Kostenkalkulation_${recipe.name}.pdf`);
}
