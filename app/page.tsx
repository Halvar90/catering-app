'use client';

import { useState } from 'react';
import { 
  Camera, 
  ShoppingCart, 
  BookOpen, 
  Package, 
  Receipt,
  Home
} from 'lucide-react';
import ReceiptUpload from '@/components/ReceiptUpload';
import IngredientsList from '@/components/IngredientsList';
import RecipesList from '@/components/RecipesList';
import ShoppingList from '@/components/ShoppingList';
import Inventory from '@/components/Inventory';

type View = 'home' | 'receipts' | 'ingredients' | 'recipes' | 'shopping' | 'inventory';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('home');

  const renderView = () => {
    switch (currentView) {
      case 'receipts':
        return <ReceiptUpload />;
      case 'ingredients':
        return <IngredientsList />;
      case 'recipes':
        return <RecipesList />;
      case 'shopping':
        return <ShoppingList />;
      case 'inventory':
        return <Inventory />;
      default:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-primary-600 mb-2">
                Catering Manager
              </h1>
              <p className="text-gray-600">
                Deine professionelle Catering-Verwaltung
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <QuickActionCard
                icon={<Camera className="w-8 h-8" />}
                title="Kassenbon scannen"
                description="Rechnung fotografieren und automatisch auslesen"
                onClick={() => setCurrentView('receipts')}
                color="bg-blue-500"
              />
              <QuickActionCard
                icon={<Package className="w-8 h-8" />}
                title="Zutaten"
                description="Alle Lebensmittel und Preise verwalten"
                onClick={() => setCurrentView('ingredients')}
                color="bg-green-500"
              />
              <QuickActionCard
                icon={<BookOpen className="w-8 h-8" />}
                title="Rezepte"
                description="Rezepte erstellen und Kosten berechnen"
                onClick={() => setCurrentView('recipes')}
                color="bg-purple-500"
              />
              <QuickActionCard
                icon={<ShoppingCart className="w-8 h-8" />}
                title="Einkaufsliste"
                description="Benötigte Zutaten zusammenstellen"
                onClick={() => setCurrentView('shopping')}
                color="bg-orange-500"
              />
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <h2 className="text-xl font-semibold mb-4">Übersicht</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary-600">0</div>
                  <div className="text-sm text-gray-600">Zutaten</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-600">0</div>
                  <div className="text-sm text-gray-600">Rezepte</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-600">0</div>
                  <div className="text-sm text-gray-600">Shopping Items</div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center space-x-2 text-primary-600"
          >
            <Home className="w-6 h-6" />
            <span className="font-semibold text-lg hidden sm:inline">
              Catering Manager
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderView()}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around py-2">
          <NavButton
            icon={<Home className="w-6 h-6" />}
            label="Home"
            active={currentView === 'home'}
            onClick={() => setCurrentView('home')}
          />
          <NavButton
            icon={<Receipt className="w-6 h-6" />}
            label="Belege"
            active={currentView === 'receipts'}
            onClick={() => setCurrentView('receipts')}
          />
          <NavButton
            icon={<BookOpen className="w-6 h-6" />}
            label="Rezepte"
            active={currentView === 'recipes'}
            onClick={() => setCurrentView('recipes')}
          />
          <NavButton
            icon={<ShoppingCart className="w-6 h-6" />}
            label="Liste"
            active={currentView === 'shopping'}
            onClick={() => setCurrentView('shopping')}
          />
          <NavButton
            icon={<Package className="w-6 h-6" />}
            label="Inventar"
            active={currentView === 'inventory'}
            onClick={() => setCurrentView('inventory')}
          />
        </div>
      </nav>

      {/* Spacer for mobile navigation */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
    >
      <div className={`${color} text-white w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg ${
        active ? 'text-primary-600' : 'text-gray-600'
      }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}
