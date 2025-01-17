import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Search, ArrowUpCircle, ArrowDownCircle, X, Calendar, RefreshCw, Pencil, Trash2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  name: string;
  document: string;
}

const categoryLabels = {
  rent: 'Aluguel',
  deposit: 'Caução',
  maintenance: 'Manutenção',
  insurance: 'Seguro',
  tax: 'Impostos',
  fuel: 'Combustível',
  commission: 'Comissão',
  other: 'Outros'
};

const recurrenceLabels = {
  none: 'Não',
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual'
};

const paymentStatusConfig = {
  pending: { label: 'Pendente', icon: Clock, class: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Pago', icon: CheckCircle, class: 'bg-green-100 text-green-800' },
  overdue: { label: 'Vencido', icon: AlertTriangle, class: 'bg-red-100 text-red-800' }
};

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  vehicle?: {
    plate: string;
    brand: string;
    model: string;
  };
  is_recurring: boolean;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_end_date?: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date?: string;
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface VehicleSummary {
  vehicle_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  daily_rate: number;
  total_contracts: number;
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transactions_by_category: Array<{
    category: string;
    total_amount: number;
  }>;
}

export function Financial() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleSummaries, setVehicleSummaries] = useState<VehicleSummary[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().split('-').slice(0, 2).join('-'));
  const [view, setView] = useState<'list' | 'summary'>('list');
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'other',
    client_id: '',
    amount: '0',
    description: '',
    date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    is_recurring: false,
    recurrence_type: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  });

  useEffect(() => {
    loadData();
    loadClients();
  }, [selectedVehicle]);

  async function loadClients() {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, name, document')
        .eq('status', true)
        .order('name');
      
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }

  async function loadData() {
    try {
      // Load transactions
      const { data: transactionsData } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          vehicle:vehicles(plate, brand, model)
        `)
        .order('date', { ascending: false });
      
      setTransactions(transactionsData || []);

      // Load vehicles
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, plate, brand, model')
        .order('plate');
      
      setVehicles(vehiclesData || []);

      // Load vehicle summaries
      const { data: summariesData } = await supabase
        .from('vehicle_financial_summary')
        .select('*');
      
      setVehicleSummaries(summariesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validate required fields
    if (!formData.date) {
      setMessage({
        type: 'error',
        text: 'A data é obrigatória'
      });
      setLoading(false);
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage({
        type: 'error',
        text: 'O valor deve ser maior que zero'
      });
      setLoading(false);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      // Prepare data for submission
      const dataToSend = {
        client_id: formData.type === 'income' ? formData.client_id : null,
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        vehicle_id: formData.vehicle_id || null,
        is_recurring: formData.is_recurring,
        recurrence_type: formData.is_recurring ? formData.recurrence_type : 'none',
        status: 'active',
        created_by: user.id
      };

      // Validate recurrence data
      if (formData.is_recurring && formData.recurrence_end_date) {
        const startDate = new Date(formData.date);
        const endDate = new Date(formData.recurrence_end_date);
        
        if (endDate <= startDate) {
          setMessage({
            type: 'error',
            text: 'A data final deve ser posterior à data inicial'
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('financial_transactions')
        .insert([dataToSend]);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Transação registrada com sucesso!'
      });

      setFormData({
        type: 'expense',
        category: 'other',
        client_id: '',
        amount: '0',
        description: '',
        date: new Date().toISOString().split('T')[0],
        vehicle_id: '',
        is_recurring: false,
        recurrence_type: formData.is_recurring ? 'daily' : 'none'
      });

      await loadData();
    } catch (error: any) {
      console.error('Erro ao salvar transação:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar transação. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (transactionId: string) => {
    try {
      const { error } = await supabase.rpc('update_transaction_payment_status', {
        p_transaction_id: transactionId
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

  const filteredTransactions = transactions.filter(transaction =>
    (transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedVehicle || transaction.vehicle_id === selectedVehicle) &&
    transaction.date.startsWith(selectedMonth)
  );

  const totals = filteredTransactions.reduce((acc, curr) => ({
    income: acc.income + (curr.type === 'income' ? curr.amount : 0),
    expense: acc.expense + (curr.type === 'expense' ? curr.amount : 0)
  }), { income: 0, expense: 0 });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Financeiro</h1>
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => setView('list')}
                className={`text-sm ${view === 'list' ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Transações
              </button>
              <button
                onClick={() => setView('summary')}
                className={`text-sm ${view === 'summary' ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Resumo por Veículo
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nova Transação
        </button>
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm">Receitas</h3>
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-semibold text-green-600">
                R$ {totals.income.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm">Despesas</h3>
                <ArrowDownCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-semibold text-red-600">
                R$ {totals.expense.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm">Saldo</h3>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className={`text-2xl font-semibold ${
                totals.income - totals.expense >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                R$ {(totals.income - totals.expense).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 flex-1">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por descrição ou placa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none focus:outline-none ml-2 flex-1"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-gray-600 ml-2"
                    />
                  </div>
                  <select
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                  >
                    <option value="">Todos os veículos</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-4">Data</th>
                    <th className="text-left p-4">Tipo</th>
                    <th className="text-left p-4">Categoria</th>
                    <th className="text-left p-4">Descrição</th>
                    <th className="text-left p-4">Veículo</th>
                    <th className="text-left p-4">Valor</th>
                    <th className="text-left p-4">Recorrência</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-center p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="p-4">
                        {transaction.type === 'income' ? (
                          <span className="inline-flex items-center text-green-600">
                            <ArrowUpCircle className="w-5 h-5 mr-1" />
                            Receita
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600">
                            <ArrowDownCircle className="w-5 h-5 mr-1" />
                            Despesa
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {categoryLabels[transaction.category as keyof typeof categoryLabels]}
                        </span>
                      </td>
                      <td className="p-4">{transaction.description}</td>
                      <td className="p-4">
                        {transaction.vehicle ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {transaction.vehicle.plate} - {transaction.vehicle.brand} {transaction.vehicle.model}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4">
                        <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          R$ {transaction.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4">
                        {transaction.is_recurring ? (
                          <div className="flex items-center gap-1 text-blue-600">
                            <RefreshCw className="w-4 h-4" />
                            <span className="text-sm">{recurrenceLabels[transaction.recurrence_type as keyof typeof recurrenceLabels]}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4">
                        {(() => {
                          const status = paymentStatusConfig[transaction.payment_status];
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
                          {transaction.payment_status !== 'paid' && (
                            <button
                              onClick={() => handlePayment(transaction.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Marcar como pago"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setFormData({
                                ...transaction,
                                amount: transaction.amount.toString()
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
                              if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
                                try {
                                  const { error } = await supabase
                                    .from('financial_transactions')
                                    .delete()
                                    .eq('id', transaction.id);

                                  if (error) throw error;
                                  
                                  await loadData();
                                  
                                  setMessage({
                                    type: 'success',
                                    text: 'Transação excluída com sucesso!'
                                  });
                                } catch (error: any) {
                                  console.error('Erro ao excluir transação:', error);
                                  setMessage({
                                    type: 'error',
                                    text: error.message || 'Erro ao excluir transação'
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
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        Nenhuma transação encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {vehicleSummaries.map(summary => (
            <div key={summary.vehicle_id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    {summary.brand} {summary.model}
                  </h2>
                  <p className="text-gray-500">{summary.plate}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {summary.category} - {summary.year}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Diária</p>
                  <p className="text-lg font-semibold">
                    R$ {summary.daily_rate.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total de Contratos</p>
                  <p className="text-lg font-semibold">{summary.total_contracts}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Receitas</p>
                  <p className="text-lg font-semibold text-green-600">
                    R$ {summary.total_income.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Despesas</p>
                  <p className="text-lg font-semibold text-red-600">
                    R$ {summary.total_expenses.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Saldo</p>
                  <p className={`text-lg font-semibold ${
                    summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    R$ {summary.net_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Transações por Categoria
                </h3>
                <div className="space-y-2">
                  {summary.transactions_by_category.map((category, index) => (
                    <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">{category.category}</span>
                      <span className="text-sm font-medium">
                        R$ {category.total_amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Nova Transação</h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
                    Tipo
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="income"
                        checked={formData.type === 'income'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                        className="mr-2"
                      />
                      Receita
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="expense"
                        checked={formData.type === 'expense'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                        className="mr-2"
                      />
                      Despesa
                    </label>
                  </div>
                </div>

                {formData.type === 'income' && (
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
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || '0'}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Veículo (opcional)
                  </label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                      className="mr-2"
                    />
                    Transação Recorrente
                  </label>
                </div>

                {formData.is_recurring && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Recorrência
                      </label>
                      <select
                        value={formData.recurrence_type}
                        onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required={formData.is_recurring}
                      >
                        {Object.entries(recurrenceLabels)
                          .filter(([value]) => value !== 'none')
                          .map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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