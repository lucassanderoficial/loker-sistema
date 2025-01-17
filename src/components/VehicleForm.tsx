import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMask } from '@react-input/mask';
import { fetchVehicleData } from '../services/vehicleApi';

interface Franchise {
  id: string;
  name: string;
}

interface Investor {
  id: string;
  name: string;
  status: boolean;
}

interface VehicleFormProps {
  vehicle?: {
    id: string;
    category: 'popular' | 'gold' | 'black' | 'super';
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
  } | null;
  onClose: () => void;
  onSave: () => void;
}

const statusOptions = [
  { value: 'available', label: 'Disponível' },
  { value: 'rented', label: 'Alugado' },
  { value: 'maintenance', label: 'Oficina' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'for_sale', label: 'A venda' },
  { value: 'sold', label: 'Vendido' },
];

const categoryOptions = [
  { value: 'popular', label: 'Popular' },
  { value: 'gold', label: 'Gold' },
  { value: 'black', label: 'Black' },
  { value: 'super', label: 'Super' },
];

export function VehicleForm({ vehicle, onClose, onSave }: VehicleFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const plateInputRef = useMask({ mask: 'aaa-#*##', replacement: { a: /[A-Za-z]/, '#': /\d/, '*': /[A-Za-z0-9]/ } });
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [formData, setFormData] = useState({
    category: vehicle?.category || 'popular',
    plate: vehicle?.plate || '',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    color: vehicle?.color || '',
    chassis: vehicle?.chassis || '',
    renavam: vehicle?.renavam || '',
    daily_rate: vehicle?.daily_rate || 0,
    franchise_id: vehicle?.franchise_id || '',
    investor_id: vehicle?.investor_id || '',
    status: vehicle?.status || 'available',
  });

  useEffect(() => {
    loadFranchises();
    loadInvestors();
  }, []);

  async function loadFranchises() {
    const { data, error } = await supabase
      .from('franchises')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Erro ao carregar franquias:', error);
      return;
    }

    setFranchises(data || []);
  }

  async function loadInvestors() {
    const { data, error } = await supabase
      .from('investors')
      .select('id, name, status')
      .eq('status', true)
      .order('name');

    if (error) {
      console.error('Erro ao carregar investidores:', error);
      return;
    }

    setInvestors(data || []);
  }

  const handleFetchVehicleData = async (plate: string) => {
    setLoading(true);
    setMessage(null);
    const cleanPlate = plate.replace(/[^A-Za-z0-9]/g, '');

    if (cleanPlate.length !== 7) {
      setMessage({
        type: 'error',
        text: 'Placa inválida. Por favor, insira uma placa válida com 7 caracteres.'
      });
      setLoading(false);
      return;
    }

    try {
      const data = await fetchVehicleData(plate);
      
      setFormData(prev => ({
        ...prev,
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color || prev.color,
        chassis: data.chassis || prev.chassis,
        renavam: data.renavam || prev.renavam,
      }));
      
      setMessage({
        type: 'success',
        text: `Dados do veículo ${data.brand} ${data.model} encontrados com sucesso!`
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível consultar os dados do veículo.'
      });
      
      // Mantém a placa mas limpa os outros campos
      const currentPlate = formData.plate;
      setFormData(prev => ({
        ...prev,
        plate: currentPlate,
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        chassis: '',
        renavam: ''
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (vehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update(formData)
          .eq('id', vehicle.id);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Veículo atualizado com sucesso!'
        });
      } else {
        // Create new vehicle
        const { error } = await supabase
          .from('vehicles')
          .insert([formData]);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Veículo cadastrado com sucesso!'
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar veículo:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar veículo. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {vehicle ? 'Editar Veículo' : 'Novo Veículo'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Placa
          </label>
          <input
            ref={plateInputRef}
            type="text"
            value={formData.plate}
            onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
            onBlur={() => {
              if (formData.plate.replace(/[^A-Za-z0-9]/g, '').length === 7) {
                handleFetchVehicleData(formData.plate);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Marca
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modelo
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ano
          </label>
          <input
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cor
          </label>
          <input
            type="text"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor da Diária
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.daily_rate}
            onChange={(e) => setFormData({ ...formData, daily_rate: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chassi
          </label>
          <input
            type="text"
            value={formData.chassis}
            onChange={(e) => setFormData({ ...formData, chassis: e.target.value.toUpperCase() })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Renavam
          </label>
          <input
            type="text"
            value={formData.renavam}
            onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Franquia
          </label>
          <select
            value={formData.franchise_id}
            onChange={(e) => setFormData({ ...formData, franchise_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecione uma franquia</option>
            {franchises.map(franchise => (
              <option key={franchise.id} value={franchise.id}>
                {franchise.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Investidor
          </label>
          <select
            value={formData.investor_id}
            onChange={(e) => setFormData({ ...formData, investor_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecione um investidor</option>
            {investors.map(investor => (
              <option key={investor.id} value={investor.id}>
                {investor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}