'use client';

import { BarChart3, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';
import { db } from '@/lib/instantdb';
import { formatPrice } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#f15b45', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const { isLoading, data } = db.useQuery({
    ingredients: {},
    recipes: {},
    shoppingList: {},
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const ingredients = data?.ingredients || [];
  const recipes = data?.recipes || [];
  const shoppingList = data?.shoppingList || [];

  // Statistiken
  const totalIngredients = ingredients.length;
  const totalRecipes = recipes.length;
  const avgMargin = recipes.length > 0
    ? recipes.reduce((sum: number, r: any) => sum + (r.customMargin || 0), 0) / recipes.length
    : 0;
  
  const totalShoppingCost = shoppingList.reduce(
    (sum: number, item: any) => sum + (item.estimatedPrice || 0),
    0
  );

  // Top 5 Zutaten nach Häufigkeit
  const ingredientCount = ingredients.reduce((acc: any, ing: any) => {
    if (!acc[ing.name]) {
      acc[ing.name] = { name: ing.name, count: 0 };
    }
    acc[ing.name].count += 1;
    return acc;
  }, {});

  const topIngredients = Object.values(ingredientCount)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  // Zutaten nach Kategorie
  const categoryData = ingredients.reduce((acc: any, ing: any) => {
    const cat = ing.category || 'Sonstiges';
    if (!acc[cat]) {
      acc[cat] = 0;
    }
    acc[cat] += 1;
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  // Laden nach Anzahl Zutaten
  const shopData = ingredients.reduce((acc: any, ing: any) => {
    const shop = ing.shop;
    if (!acc[shop]) {
      acc[shop] = 0;
    }
    acc[shop] += 1;
    return acc;
  }, {});

  const shopChartData = Object.entries(shopData)
    .map(([name, count]) => ({ name, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-gray-600">Übersicht über deine Catering-Verwaltung</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<ShoppingBag className="w-6 h-6" />}
          title="Zutaten"
          value={totalIngredients}
          color="bg-blue-500"
        />
        <MetricCard
          icon={<BarChart3 className="w-6 h-6" />}
          title="Rezepte"
          value={totalRecipes}
          color="bg-purple-500"
        />
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Ø Marge"
          value={`${avgMargin.toFixed(0)}%`}
          color="bg-green-500"
        />
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Einkauf"
          value={formatPrice(totalShoppingCost)}
          color="bg-orange-500"
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Zutaten */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top 5 Zutaten</h3>
          {topIngredients.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topIngredients}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f15b45" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Noch keine Daten verfügbar
            </div>
          )}
        </div>

        {/* Kategorien */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Zutaten nach Kategorie</h3>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Noch keine Daten verfügbar
            </div>
          )}
        </div>

        {/* Läden */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Top 5 Läden (nach Zutatenanzahl)</h3>
          {shopChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={shopChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="Anzahl Zutaten" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Noch keine Daten verfügbar
            </div>
          )}
        </div>
      </div>

      {/* Rezept-Statistiken */}
      {recipes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Rezept-Übersicht</h3>
          <div className="space-y-3">
            {recipes.slice(0, 5).map((recipe: any) => (
              <div
                key={recipe.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{recipe.name}</div>
                  <div className="text-sm text-gray-600">
                    {recipe.portions} Portionen • {recipe.category || 'Sonstiges'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary-600">
                    {formatPrice(recipe.totalCostPerPortion || 0)}/Portion
                  </div>
                  <div className="text-xs text-gray-500">
                    Marge: {recipe.customMargin || 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalIngredients === 0 && totalRecipes === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Noch keine Daten</h3>
          <p className="text-gray-600 mb-4">
            Füge Zutaten und Rezepte hinzu, um Statistiken zu sehen
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, title, value, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}
