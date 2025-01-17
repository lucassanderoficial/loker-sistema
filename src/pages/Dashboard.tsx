import React, { useState, useEffect } from 'react';
import { Car, Calendar, Users, DollarSign, Wrench, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  total_vehicles: number;
  rented_vehicles: number;
  available_vehicles: number;
  maintenance_vehicles: number;
  total_clients: number;
  total_investors: number;
  monthly_revenue: number;
  monthly_growth: number;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  year: number;
  color: string;
  status: 'available' | 'rented' | 'maintenance';
  category: 'popular' | 'gold' | 'black' | 'super';
  daily_rate: number;
  client?: {
    name: string;
    phone: string;
  };
  investor: {
    name: string;
  };
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_vehicles: 0,
    rented_vehicles: 0,
    available_vehicles: 0,
    maintenance_vehicles: 0,
    total_clients: 0,
    total_investors: 0,
    monthly_revenue: 0,
    monthly_growth: 0
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // Get vehicle stats
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select(`
          *,
          client:contracts(
            client:clients(name, phone)
          ),
          investor:investors(name)
        `);

      const vehicles = vehiclesData || [];
      const vehicleCounts = vehicles.reduce((acc, v) => ({
        ...acc,
        [v.status]: (acc[v.status] || 0) + 1
      }), {} as Record<string, number>);

      // Get total clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', true);

      // Get total investors
      const { count: investorsCount } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true })
        .eq('status', true);

      // Get monthly revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: currentMonthTransactions } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('date', startOfMonth.toISOString());

      const { data: lastMonthTransactions } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('date', new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - 1, 1).toISOString())
        .lt('date', startOfMonth.toISOString());

      const currentMonthRevenue = currentMonthTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const lastMonthRevenue = lastMonthTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const monthlyGrowth = lastMonthRevenue ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      setStats({
        total_vehicles: vehicles.length,
        rented_vehicles: vehicleCounts['rented'] || 0,
        available_vehicles: vehicleCounts['available'] || 0,
        maintenance_vehicles: vehicleCounts['maintenance'] || 0,
        total_clients: clientsCount || 0,
        total_investors: investorsCount || 0,
        monthly_revenue: currentMonthRevenue,
        monthly_growth: monthlyGrowth
      });

      setVehicles(vehicles);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || vehicle.status === statusFilter;
    const matchesCategory = !categoryFilter || vehicle.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const statusLabels = {
    available: { label: 'Disponível', class: 'bg-green-100 text-green-800' },
    rented: { label: 'Alugado', class: 'bg-blue-100 text-blue-800' },
    maintenance: { label: 'Oficina', class: 'bg-yellow-100 text-yellow-800' }
  };

  const categoryLabels = {
    popular: { label: 'Popular', class: 'bg-gray-100 text-gray-800' },
    gold: { label: 'Gold', class: 'bg-yellow-100 text-yellow-800' },
    black: { label: 'Black', class: 'bg-black text-white' },
    super: { label: 'Super', class: 'bg-purple-100 text-purple-800' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm">Total de Veículos</h3>
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-semibold">{stats.total_vehicles}</p>
          <span className="text-sm text-green-600">
            {stats.available_vehicles} disponíveis
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm">Veículos Alugados</h3>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-semibold">{stats.rented_vehicles}</p>
          <span className="text-sm text-blue-600">
            {((stats.rented_vehicles / stats.total_vehicles) * 100).toFixed(1)}% da frota
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm">Em Manutenção</h3>
            <Wrench className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-semibold">{stats.maintenance_vehicles}</p>
          <span className="text-sm text-yellow-600">
            {((stats.maintenance_vehicles / stats.total_vehicles) * 100).toFixed(1)}% da frota
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm">Receita Mensal</h3>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-semibold">
            R$ {stats.monthly_revenue.toFixed(2)}
          </p>
          <span className={`text-sm ${stats.monthly_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.monthly_growth >= 0 ? '+' : ''}{stats.monthly_growth.toFixed(1)}% este mês
          </span>
        </div>
      </div>

      {/* Vehicle Lists */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-6">Lista de Veículos</h2>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="w-full sm:flex-1">
              <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por placa, marca ou modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none focus:outline-none ml-2 w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os Status</option>
                {Object.entries(statusLabels).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas as Categorias</option>
                {Object.entries(categoryLabels).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Categoria</th>
                <th className="text-left p-4">Placa</th>
                <th className="text-left p-4">Veículo</th>
                <th className="text-left p-4">Ano</th>
                <th className="text-left p-4">Cor</th>
                <th className="text-left p-4">Diária</th>
                <th className="text-left p-4">Cliente</th>
                <th className="text-left p-4">Investidor</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusLabels[vehicle.status].class
                    }`}>
                      {statusLabels[vehicle.status].label}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      categoryLabels[vehicle.category].class
                    }`}>
                      {categoryLabels[vehicle.category].label}
                    </span>
                  </td>
                  <td className="p-4">{vehicle.plate}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{vehicle.brand}</p>
                      <p className="text-sm text-gray-500">{vehicle.model}</p>
                    </div>
                  </td>
                  <td className="p-4">{vehicle.year}</td>
                  <td className="p-4">{vehicle.color}</td>
                  <td className="p-4">R$ {vehicle.daily_rate.toFixed(2)}</td>
                  <td className="p-4">
                    {vehicle.client ? (
                      <div>
                        <p className="font-medium">{vehicle.client.name}</p>
                        <p className="text-sm text-gray-500">{vehicle.client.phone}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">{vehicle.investor.name}</td>
                </tr>
              ))}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-gray-500">
                    Nenhum veículo encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}