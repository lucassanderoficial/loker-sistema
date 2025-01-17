import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Pencil, Trash2, CheckCircle, Clock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Client {
  id: string;
  name: string;
  document: string;
}

interface TrafficFine {
  id: string;
  vehicle_id: string;
  client_id: string;
  fine_date: string;
  amount: number;
  description: string;
  payment_status: 'pending' | 'paid';
  payment_date: string | null;
  vehicle: {
    plate: string;
    brand: string;
    model: string;
  };
  client: {
    name: string;
    document: string;
  };
}

const paymentStatusConfig = {
  pending: { label: 'Pendente', icon: Clock, class: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Pago', icon: CheckCircle, class: 'bg-green-100 text-green-800' }
};

export function TrafficFines() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFine, setEditingFine] = useState<TrafficFine | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    client_id: '',
    fine_date: new Date().toISOString().split('T')[0],
    amount: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load fines
      const { data: finesData } = await supabase
        .from('traffic_fines')
        .select(`
          *,
          vehicle:vehicles(plate, brand, model),
          client:clients(name, document)
        `)
        .order('fine_date', { ascending: false });
      
      setFines(finesData || []);

      // Load vehicles
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, plate, brand, model')
        .order('plate');
      
      setVehicles(vehiclesData || []);

      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, document')
        .eq('status', true)
        .order('name');
      
      setClients(clientsData || []);
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

      const dataToSave = {
        ...formData,
        amount: parseFloat(formData.amount),
        created_by: user.id
      };

      if (editingFine) {
        // Update existing fine
        const { error } = await supabase
          .from('traffic_fines')
          .update(dataToSave)
          .eq('id', editingFine.id);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Multa atualizada com sucesso!'
        });
      } else {
        // Create new fine
        const { error } = await supabase
          .from('traffic_fines')
          .insert([dataToSave]);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Multa registrada com sucesso!'
        });
      }

      setFormData({
        vehicle_id: '',
        client_id: '',
        fine_date: new Date().toISOString().split('T')[0],
        amount: '',
        description: ''
      });
      setEditingFine(null);
      await loadData();
    } catch (error: any) {
      console.error('Erro ao salvar multa:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar multa. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (fineId: string) => {
    try {
      const { error } = await supabase.rpc('pay_traffic_fine', {
        p_fine_id: fineId
      });

      if (error) throw error;

      await loadData();
      
      setMessage({
        type: 'success',
        text: 'Pagamento registrado com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao registrar pagamento'
      });
    }
  };

  const filteredFines = fines.filter(fine =>
    fine.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fine.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fine.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Multas</h1>
        </div>
        <button
          onClick={() => {
            setEditingFine(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nova Multa
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por placa, cliente ou descrição..."
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
                <th className="text-left p-4">Cliente</th>
                <th className="text-left p-4">Descrição</th>
                <th className="text-left p-4">Valor</th>
                <th className="text-left p-4">Status</th>
                <th className="text-center p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredFines.map((fine) => (
                <tr key={fine.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    {new Date(fine.fine_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {fine.vehicle.plate} - {fine.vehicle.brand} {fine.vehicle.model}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{fine.client.name}</p>
                      <p className="text-sm text-gray-500">{fine.client.document}</p>
                    </div>
                  </td>
                  <td className="p-4">{fine.description}</td>
                  <td className="p-4">
                    <span className="font-medium">
                      R$ {fine.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4">
                    {(() => {
                      const status = paymentStatusConfig[fine.payment_status];
                      const StatusIcon = status.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
                          <StatusIcon className="w-4 h-4" />
                          {status.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      {fine.payment_status === 'pending' && (
                        <button
                          onClick={() => handlePayment(fine.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Marcar como pago"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingFine(fine);
                          setFormData({
                            vehicle_id: fine.vehicle_id,
                            client_id: fine.client_id,
                            fine_date: fine.fine_date,
                            amount: fine.amount.toString(),
                            description: fine.description
                          });
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Tem certeza que deseja excluir esta multa?')) {
                            try {
                              const { error } = await supabase
                                .from('traffic_fines')
                                .delete()
                                .eq('id', fine.id);

                              if (error) throw error;
                              
                              await loadData();
                              
                              setMessage({
                                type: 'success',
                                text: 'Multa excluída com sucesso!'
                              });
                            } catch (error: any) {
                              console.error('Erro ao excluir multa:', error);
                              setMessage({
                                type: 'error',
                                text: error.message || 'Erro ao excluir multa'
                              });
                            }
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFines.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">
                    Nenhuma multa encontrada
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
                  {editingFine ? 'Editar Multa' : 'Nova Multa'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingFine(null);
                  }}
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
                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>

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
                    Data da Multa
                  </label>
                  <input
                    type="date"
                    value={formData.fine_date}
                    onChange={(e) => setFormData({ ...formData, fine_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingFine(null);
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
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}