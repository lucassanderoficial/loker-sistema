import React, { useState, useEffect } from 'react';
import { Car, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  daily_rate: number;
  category: 'popular' | 'gold' | 'black' | 'super';
}

interface SystemSettings {
  system_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
}

export function Booking() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    system_name: 'Loker',
    logo_url: '',
    favicon_url: '',
    primary_color: '#2563eb'
  });

  useEffect(() => {
    loadSystemSettings();
    loadVehicles();
  }, [selectedCategory]);

  async function loadSystemSettings() {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (data) {
        setSystemSettings(data);
        document.title = data.system_name;
        // Update favicon
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
          favicon.setAttribute('href', data.favicon_url);
        }
      } else {
        // Use default values if no settings found
        setSystemSettings({
          system_name: 'Loker',
          logo_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=100',
          favicon_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=32',
          primary_color: '#2563eb'
        });
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      // Use default values on error
      setSystemSettings({
        system_name: 'Loker',
        logo_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=100',
        favicon_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=32',
        primary_color: '#2563eb'
      });
    }
  }

  async function loadVehicles() {
    try {
      let query = supabase
        .from('vehicles') 
        .select(`
          id,
          brand,
          model,
          year,
          color,
          daily_rate,
          category
        `)
        .eq('status', 'available')
        .order('category')
        .order('brand');

      if (selectedCategory) {
        query.eq('category', selectedCategory);
      }

      const { data } = await query;
      if (data) {
        setVehicles(data);
      } else {
        setVehicles([]);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  const handleReserve = (vehicle: Vehicle) => {
    const message = encodeURIComponent(`Olá Loker! Estou vindo pelo site, quero locar esse veiculo que vi no booking de vocês:

Dados do Veículo:
Marca: ${vehicle.brand}
Modelo: ${vehicle.model}
Ano: ${vehicle.year}
Cor: ${vehicle.color}
Valor da Diária: R$ ${vehicle.daily_rate.toFixed(2)}`);

    window.open(`https://wa.me/5551980205310?text=${message}`, '_blank');
  };

  const categoryLabels = {
    'popular': 'Popular',
    'gold': 'Gold',
    'black': 'Black',
    'super': 'Super'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {systemSettings.logo_url ? (
                <img 
                  src={systemSettings.logo_url} 
                  alt={systemSettings.system_name}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <Car className="w-12 h-12 text-blue-600" />
              )}
            </div>
            <a
              href="https://wa.me/5551980205310"
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto justify-center"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">(51) 98020-5310</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-80px)]">
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg ${
                selectedCategory === ''
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
              }`}
            >
              Todos
            </button>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSelectedCategory(value)}
                className={`px-4 py-2 rounded-lg border ${
                  selectedCategory === value
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : vehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {vehicle.year} • {vehicle.color}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.category === 'popular' ? 'bg-gray-100 text-gray-800' :
                      vehicle.category === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                      vehicle.category === 'black' ? 'bg-black text-white' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {categoryLabels[vehicle.category]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Diária</p>
                      <p className="text-xl font-semibold text-green-600">
                        R$ {vehicle.daily_rate.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReserve(vehicle)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Reservar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum veículo disponível no momento.</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} {systemSettings.system_name}. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}