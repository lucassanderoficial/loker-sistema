import React, { useState, useEffect } from 'react';
import { Car, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VehicleForm } from '../components/VehicleForm';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  chassis: string;
  renavam: string;
  daily_rate: number;
  franchise_id: string;
  investor_id: string;
  status: 'available' | 'rented' | 'maintenance' | 'insurance' | 'for_sale' | 'sold';
  franchise: {
    name: string;
  };
  investor: {
    name: string;
  };
}

const statusLabels = {
  available: { label: 'Disponível', class: 'bg-green-100 text-green-800' },
  rented: { label: 'Alugado', class: 'bg-blue-100 text-blue-800' },
  maintenance: { label: 'Oficina', class: 'bg-yellow-100 text-yellow-800' },
  insurance: { label: 'Seguro', class: 'bg-purple-100 text-purple-800' },
  for_sale: { label: 'A venda', class: 'bg-orange-100 text-orange-800' },
  sold: { label: 'Vendido', class: 'bg-gray-100 text-gray-800' },
};

export function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        franchise:franchises(name),
        investor:investors(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar veículos:', error);
      return;
    }

    setVehicles(data || []);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este veículo?')) {
      return;
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir veículo:', error);
      return;
    }

    await loadVehicles();
  }

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Car className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Veículos</h1>
        </div>
        <button
          onClick={() => {
            setEditingVehicle(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Veículo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96">
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Placa</th>
                <th className="text-left p-4">Marca/Modelo</th>
                <th className="text-left p-4">Ano</th>
                <th className="text-left p-4">Cor</th>
                <th className="text-left p-4">Diária</th>
                <th className="text-left p-4">Franquia</th>
                <th className="text-left p-4">Investidor</th>
                <th className="text-center p-4">Ações</th>
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
                  <td className="p-4">{vehicle.plate}</td>
                  <td className="p-4">{vehicle.brand} {vehicle.model}</td>
                  <td className="p-4">{vehicle.year}</td>
                  <td className="p-4">{vehicle.color}</td>
                  <td className="p-4">R$ {vehicle.daily_rate.toFixed(2)}</td>
                  <td className="p-4">{vehicle.franchise.name}</td>
                  <td className="p-4">{vehicle.investor.name}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <VehicleForm
              vehicle={editingVehicle}
              onClose={() => {
                setShowForm(false);
                setEditingVehicle(null);
              }}
              onSave={async () => {
                await loadVehicles();
                setShowForm(false);
                setEditingVehicle(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}