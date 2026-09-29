import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Client {
  id: string;
  name: string;
  document: string;
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  category: 'popular' | 'gold' | 'black' | 'super';
  daily_rate: number;
}

interface ContractFormProps {
  onClose: () => void;
  onSave: () => void;
}

export function ContractForm({ onClose, onSave }: ContractFormProps) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>('');

  const [formData, setFormData] = useState({
    client_id: '',
    vehicle_id: '',
    start_date: new Date().toISOString().split('T')[0],
    auto_renew: false,
    deposit_amount: '',
  });

  useEffect(() => {
    loadClients();
    if (selectedCategory) {
      loadVehicles();
    }
  }, [selectedCategory]);

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, name, document')
      .eq('status', true)
      .order('name');
    
    setClients(data || []);
  }

  async function loadVehicles() {
    const { data } = await supabase
      .from('vehicles')
      .select('id, plate, brand, model, year, category, daily_rate')
      .eq('category', selectedCategory)
      .eq('status', 'available')
      .order('brand');
    
    setVehicles(data || []);
  }

  const calculateDates = (startDate: string) => {
    if (!startDate) return null;
    
    const start = new Date(startDate + 'T00:00:00');
    start.setHours(0, 0, 0, 0);
    
    if (formData.auto_renew) {
      // Para auto renovação, calcular até o próximo domingo
      const end = new Date(start.getTime());
      while (end.getDay() !== 0) { // 0 = Domingo
        end.setDate(end.getDate() + 1);
      }
      end.setHours(0, 0, 0, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        dueDate: getNextMonday(end).toISOString().split('T')[0]
      };
    } else {
      // Para contratos sem renovação, usar a data de devolução
      if (!returnDate) return null;
      
      const end = new Date(returnDate + 'T00:00:00');
      end.setHours(0, 0, 0, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        dueDate: end.toISOString().split('T')[0]
      };
    }
  };

  const getNextMonday = (date: Date) => {
    const next = new Date(date);
    while (next.getDay() !== 1) { // 1 = Segunda-feira
      next.setDate(next.getDate() + 1);
    }
    return next;
  };

  const calculateTotalAmount = (startDate: string, vehicle_id: string) => {
    if (!startDate || !vehicle_id) return 0;
    
    const start = new Date(startDate + 'T00:00:00');
    start.setHours(0, 0, 0, 0);
    
    if (formData.auto_renew) {
      // Para auto renovação, calcular até o próximo domingo
      const end = new Date(start.getTime());
      while (end.getDay() !== 0) { // 0 = Domingo
        end.setDate(end.getDate() + 1);
      }
      end.setHours(0, 0, 0, 0);
      // Calcular o número de dias
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const vehicle = vehicles.find(v => v.id === vehicle_id);
      return vehicle ? days * vehicle.daily_rate : 0;
    } else {
      // Para contratos sem renovação, usar a data de devolução
      if (!returnDate) return 0;
      
      const end = new Date(returnDate + 'T00:00:00');
      end.setHours(0, 0, 0, 0);
      // Calcular o número de dias
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const vehicle = vehicles.find(v => v.id === vehicle_id);
      return vehicle ? days * vehicle.daily_rate : 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Calculate dates
      const dates = calculateDates(formData.start_date);
      const totalAmount = calculateTotalAmount(formData.start_date, formData.vehicle_id);

      // Create deposit record
      const { data: depositData, error: depositError } = await supabase
        .from('deposits')
        .insert([{
          client_id: formData.client_id,
          type: 'credit',
          amount: parseFloat(depositAmount),
          description: 'Caução para contrato de locação',
          created_by: user.id
        }])
        .select()
        .single();

      if (depositError) throw depositError;

      // Create contract
      const { error: contractError } = await supabase
        .from('contracts')
        .insert([{
          client_id: formData.client_id,
          vehicle_id: formData.vehicle_id,
          deposit_id: depositData.id,
          start_date: dates.start,
          end_date: dates.end,
          auto_renew: formData.auto_renew,
          daily_rate: vehicles.find(v => v.id === formData.vehicle_id)?.daily_rate || 0,
          total_amount: totalAmount,
          base_amount: totalAmount,
          due_date: dates.dueDate,
          created_by: user.id
        }]);

      if (contractError) throw contractError;

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'rented' })
        .eq('id', formData.vehicle_id);

      if (vehicleError) throw vehicleError;

      setMessage({
        type: 'success',
        text: 'Contrato criado com sucesso!'
      });

      onSave();
    } catch (error: any) {
      console.error('Erro ao criar contrato:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao criar contrato. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Novo Contrato</h2>
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

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria do Veículo
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecione uma categoria</option>
            <option value="popular">Popular</option>
            <option value="gold">Gold</option>
            <option value="black">Black</option>
            <option value="super">Super</option>
          </select>
        </div>

        {selectedCategory && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Veículo
            </label>
            <select
              value={formData.vehicle_id}
              onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione um veículo</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} {vehicle.model} ({vehicle.year}) - {vehicle.plate} - R$ {vehicle.daily_rate}/dia
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente
          </label>
          <select
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecione um cliente</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name} - {client.document}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Início
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor da Caução
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_renew}
              onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
              className="mr-2"
            />
            Auto Renovação
          </label>
          <p className="text-sm text-gray-500 mt-1">
            O contrato será renovado automaticamente toda segunda-feira
          </p>
        </div>

        {!formData.auto_renew && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Devolução
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              min={formData.start_date}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={!formData.auto_renew}
            />
          </div>
        )}

        {formData.vehicle_id && formData.start_date && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Resumo do Contrato</h3>
            {calculateDates(formData.start_date) && <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Período:</span>{' '}
                {new Date(formData.start_date).toLocaleDateString('pt-BR')} até{' '}
                {formData.auto_renew ? (
                  <>{new Date(calculateDates(formData.start_date).end).toLocaleDateString('pt-BR')}</>
                ) : (
                  returnDate && <>{new Date(returnDate).toLocaleDateString('pt-BR')}</>
                )}
                {formData.auto_renew && (
                  <span className="text-blue-600 ml-2">(Renovação automática toda segunda-feira)</span>
                )}
              </p>
              <p>
                <span className="text-gray-500">Valor Total:</span>{' '}
                R$ {calculateTotalAmount(formData.start_date, formData.vehicle_id).toFixed(2)}
                {formData.auto_renew && (
                  <span className="text-sm text-gray-500 ml-2">(7 dias por semana)</span>
                )}
              </p>
              <p>
                <span className="text-gray-500">Vencimento:</span>{' '}
                {new Date(calculateDates(formData.start_date).dueDate).toLocaleDateString('pt-BR')}
                {formData.auto_renew && (
                  <span className="text-sm text-gray-500 ml-2">(Toda segunda-feira)</span>
                )}
              </p>
            </div>}
          </div>
        )}
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
          {loading ? 'Salvando...' : 'Criar Contrato'}
        </button>
      </div>
    </form>
  );
}