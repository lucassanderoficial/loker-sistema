import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Search, CheckCircle, AlertCircle, Clock, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  investor: {
    id: string;
    name: string;
  };
}

interface Maintenance {
  id: string;
  vehicle_id: string;
  description: string;
  amount: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_method?: 'pix' | 'cash' | 'card';
  payment_date?: string;
  paid_by: 'company' | 'investor';
  created_at: string;
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    investor: {
      name: string;
    };
  };
}

const paymentStatusConfig = {
  pending: { label: 'Pendente', icon: Clock, class: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Pago', icon: CheckCircle, class: 'bg-green-100 text-green-800' },
  overdue: { label: 'Vencido', icon: AlertCircle, class: 'bg-red-100 text-red-800' }
};

export function Maintenance() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    description: '',
    amount: '',
    payment_status: 'pending' as 'pending' | 'paid' | 'overdue',
    payment_method: 'pix' as 'pix' | 'cash' | 'card',
    payment_date: new Date().toISOString().split('T')[0],
    paid_by: 'company' as 'company' | 'investor'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load vehicles with investor information
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select(`
          id,
          plate,
          brand,
          model,
          investor:investors(id, name)
        `)
        .order('plate');
      
      setVehicles(vehiclesData || []);

      // Load maintenance records
      const { data: maintenanceData } = await supabase
        .from('maintenance')
        .select(`
          *,
          vehicle:vehicles(
            plate,
            brand,
            model,
            investor:investors(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      setMaintenances(maintenanceData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const maintenanceData = {
          vehicle_id: formData.vehicle_id,
          description: formData.description,
          amount: parseFloat(formData.amount),
          payment_status: formData.payment_status,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          paid_by: formData.paid_by,
          created_by: user.id
      };

      let maintenanceError;
      
      if (editingMaintenance) {
        // Update existing maintenance record
        const { error } = await supabase
          .from('maintenance')
          .update(maintenanceData)
          .eq('id', editingMaintenance.id);
        maintenanceError = error;
      } else {
        // Create new maintenance record
        const { error } = await supabase
          .from('maintenance')
          .insert([maintenanceData]);
        maintenanceError = error;
      }

      if (maintenanceError) throw maintenanceError;

      // If paid by company, create financial transaction
      if (formData.paid_by === 'company' && formData.payment_status === 'paid' && !editingMaintenance) {
        // Check if transaction already exists for this maintenance
        const { data: existingTransactions, error: searchError } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('vehicle_id', formData.vehicle_id)
          .eq('description', `Manutenção - ${formData.description}`);

        if (searchError && searchError.code !== 'PGRST116') {
          throw searchError;
        }

        // Only create transaction if none exists
        if (!existingTransactions || existingTransactions.length === 0) {
          const { error: transactionError } = await supabase
            .from('financial_transactions')
            .insert([{
              type: 'expense',
              category: 'maintenance',
              amount: parseFloat(formData.amount),
              description: `Manutenção - ${formData.description}`,
              date: formData.payment_date,
              vehicle_id: formData.vehicle_id,
              payment_status: 'paid',
              payment_date: formData.payment_date,
              created_by: user.id
            }]);

          if (transactionError) throw transactionError;
        }
      }

      setMessage({
        type: 'success',
        text: editingMaintenance ? 'Manutenção atualizada com sucesso!' : 'Manutenção registrada com sucesso!'
      });

      setFormData({
        vehicle_id: '',
        description: '',
        amount: '',
        payment_status: 'pending',
        payment_method: 'pix',
        payment_date: new Date().toISOString().split('T')[0],
        paid_by: 'company'
      });

      await loadData();
      setShowForm(false);
    } catch (error: any) {
      console.error('Erro ao salvar manutenção:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar manutenção. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (maintenance: Maintenance) => {
    setEditingMaintenance(maintenance);
    setFormData({
      vehicle_id: maintenance.vehicle_id,
      description: maintenance.description,
      amount: maintenance.amount.toString(),
      payment_status: maintenance.payment_status,
      payment_method: maintenance.payment_method || 'pix',
      payment_date: maintenance.payment_date || new Date().toISOString().split('T')[0],
      paid_by: maintenance.paid_by
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta manutenção?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('maintenance')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Manutenção excluída com sucesso!'
      });

      await loadData();
    } catch (error: any) {
      console.error('Erro ao excluir manutenção:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao excluir manutenção'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (maintenance: Maintenance) => {
    setEditingMaintenance(maintenance);
    setFormData({
      ...formData,
      vehicle_id: maintenance.vehicle_id,
      description: maintenance.description,
      amount: maintenance.amount.toString(),
      payment_status: 'paid',
      payment_method: 'pix',
      payment_date: new Date().toISOString().split('T')[0],
      paid_by: maintenance.paid_by
    });
    setShowForm(true);
  };

  const filteredMaintenances = maintenances.filter(maintenance =>
    maintenance.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    maintenance.vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    maintenance.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    maintenance.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Wrench className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Manutenções</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nova Manutenção
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por veículo ou descrição..."
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
                <th className="text-left p-4">Data</th>
                <th className="text-left p-4">Veículo</th>
                <th className="text-left p-4">Investidor</th>
                <th className="text-left p-4">Descrição</th>
                <th className="text-left p-4">Valor</th>
                <th className="text-left p-4">Pagamento</th>
                <th className="text-left p-4">Método</th>
                <th className="text-left p-4">Pago por</th>
                <th className="text-center p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaintenances.map((maintenance) => {
                const PaymentIcon = paymentStatusConfig[maintenance.payment_status].icon;
                
                return (
                  <tr key={maintenance.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      {new Date(maintenance.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">
                          {maintenance.vehicle.brand} {maintenance.vehicle.model}
                        </p>
                        <p className="text-sm text-gray-500">{maintenance.vehicle.plate}</p>
                      </div>
                    </td>
                    <td className="p-4">{maintenance.vehicle.investor.name}</td>
                    <td className="p-4">{maintenance.description}</td>
                    <td className="p-4">R$ {maintenance.amount.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        paymentStatusConfig[maintenance.payment_status].class
                      }`}>
                        <PaymentIcon className="w-4 h-4" />
                        {paymentStatusConfig[maintenance.payment_status].label}
                      </span>
                    </td>
                    <td className="p-4">
                      {maintenance.payment_method ? (
                        <span className="capitalize">{maintenance.payment_method}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        maintenance.paid_by === 'company'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {maintenance.paid_by === 'company' ? 'Locadora' : 'Investidor'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {maintenance.payment_status !== 'paid' && (
                          <button
                            onClick={() => handlePay(maintenance)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Pagar"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(maintenance)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(maintenance.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredMaintenances.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-gray-500">
                    Nenhuma manutenção encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {editingMaintenance ? 'Editar Manutenção' : 'Nova Manutenção'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMaintenance(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {message && (
                <div className={`p-4 rounded-lg mb-6 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-4">
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
                        {vehicle.plate} - {vehicle.brand} {vehicle.model} ({vehicle.investor.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status do Pagamento
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Vencido</option>
                  </select>
                </div>

                {formData.payment_status === 'paid' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Método de Pagamento
                      </label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="pix">PIX</option>
                        <option value="cash">Dinheiro</option>
                        <option value="card">Cartão</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data do Pagamento
                      </label>
                      <input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pago por
                  </label>
                  <select
                    value={formData.paid_by}
                    onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="company">Locadora</option>
                    <option value="investor">Investidor</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMaintenance(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : editingMaintenance ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}