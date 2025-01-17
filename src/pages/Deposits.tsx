import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Search, ArrowUpCircle, ArrowDownCircle, X, ChevronRight, Trash2, Archive, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  name: string;
  document: string;
  type: 'individual' | 'business';
}

interface Deposit {
  id: string;
  client_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
  client: {
    name: string;
  };
}

interface DepositBalance {
  client_id: string;
  balance: number;
}

export function Deposits() {
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [balances, setBalances] = useState<DepositBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    type: 'credit' as 'credit' | 'debit',
    amount: '',
    description: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este cliente da lista de cauções?')) {
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      // Call the function to delete all deposits for this client
      const { error } = await supabase.rpc('delete_deposits_for_client', {
        p_client_id: clientId
      });
      
      if (error) throw error;

      // Update the clients list
      setClients(prevClients => prevClients.filter(c => c.id !== clientId));
      // Update balances
      setBalances(prevBalances => prevBalances.filter(b => b.client_id !== clientId));
      // Update deposits
      setDeposits(prevDeposits => prevDeposits.filter(d => d.client_id !== clientId));

      setMessage({
        type: 'success',
        text: 'Cliente removido com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao excluir cliente. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) {
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      // Delete the deposit using a transaction to ensure data consistency
      const { data, error } = await supabase.rpc('delete_deposit', {
        p_deposit_id: id
      });

      if (error) throw error;

      // Update deposits list immediately after successful deletion
      setDeposits(prevDeposits => prevDeposits.filter(deposit => deposit.id !== id));

      setMessage({
        type: 'success',
        text: 'Transação excluída com sucesso!'
      });
      
      // Reload balances after successful deletion
      const { data: balancesData } = await supabase
        .from('deposit_balances')
        .select('*');
      
      setBalances(balancesData || []);
    } catch (error: any) {
      console.error('Erro ao excluir transação:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao excluir transação. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, document, type')
        .order('name');
      
      setClients(clientsData || []);

      // Load deposits with client information
      const { data: depositsData } = await supabase
        .from('deposits')
        .select(`
          *,
          client:clients(name)
        `)
        .eq('archived', showArchived)
        .order('created_at', { ascending: false });
      
      setDeposits(depositsData || []);

      // Load balances
      const { data: balancesData } = await supabase
        .from('deposit_balances')
        .select('*');
      
      setBalances(balancesData || []);
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

      const { error } = await supabase
        .from('deposits')
        .insert([{
          client_id: formData.client_id,
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          created_by: user.id
        }]);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Caução registrado com sucesso!'
      });

      setFormData({
        client_id: '',
        type: 'credit',
        amount: '',
        description: ''
      });

      await loadData();
    } catch (error: any) {
      console.error('Erro ao salvar caução:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar caução. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveDeposit = async (id: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.rpc('archive_deposit', {
        p_deposit_id: id
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Caução arquivada com sucesso!'
      });
      
      await loadData();
    } catch (error: any) {
      console.error('Erro ao arquivar caução:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao arquivar caução. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDeposit = async (id: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.rpc('restore_deposit', {
        p_deposit_id: id
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Caução restaurada com sucesso!'
      });
      
      await loadData();
    } catch (error: any) {
      console.error('Erro ao restaurar caução:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao restaurar caução. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getClientBalance = (clientId: string) => {
    const balance = balances.find(b => b.client_id === clientId);
    return balance ? balance.balance : 0;
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Wallet className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Cauções</h1>
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => {
                  setShowArchived(false);
                  loadData();
                }}
                className={`text-sm ${!showArchived ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Ativos
              </button>
              <button
                onClick={() => {
                  setShowArchived(true);
                  loadData();
                }}
                className={`text-sm ${showArchived ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Arquivados
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nova Caução
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96 mb-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:outline-none ml-2 w-full"
              />
            </div>
            {selectedClient && (
              <button
                onClick={() => setSelectedClient(null)}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
              >
                ← Voltar para lista de clientes
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            {selectedClient ? (
              // Visualização detalhada do cliente
              <div>
                {/* Cabeçalho com informações do cliente */}
                <div className="p-6 border-b">
                  {(() => {
                    const client = clients.find(c => c.id === selectedClient);
                    const balance = getClientBalance(selectedClient);
                    return (
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-semibold">{client?.name}</h2>
                          <p className="text-gray-500">{client?.document}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {client?.type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 mb-1">Saldo Atual</p>
                          <span className={`text-xl font-semibold ${
                            balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            R$ {balance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Lista de transações */}
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4">Data</th>
                      <th className="text-left p-4">Tipo</th>
                      <th className="text-left p-4">Valor</th>
                      <th className="text-left p-4">Descrição</th>
                      <th className="text-center p-4" colSpan={2}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits
                      .filter(d => d.client_id === selectedClient)
                      .map((deposit) => (
                        <tr key={deposit.id} className="border-t hover:bg-gray-50">
                          <td className="p-4">
                            {new Date(deposit.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4">
                            {deposit.type === 'credit' ? (
                              <span className="inline-flex items-center text-green-600">
                                <ArrowUpCircle className="w-5 h-5 mr-1" />
                                Crédito
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-red-600">
                                <ArrowDownCircle className="w-5 h-5 mr-1" />
                                Débito
                              </span>
                            )}
                          </td>
                          <td className="p-4">R$ {deposit.amount.toFixed(2)}</td>
                          <td className="p-4">
                            {deposit.description}
                          </td>
                          <td className="p-4" colSpan={2}>
                            <div className="flex justify-center gap-2">
                              {!showArchived ? (
                                <button
                                  onClick={() => handleArchiveDeposit(deposit.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Arquivar"
                                >
                                  <Archive className="w-5 h-5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestoreDeposit(deposit.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Restaurar"
                                >
                                  <RefreshCw className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTransaction(deposit.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Excluir"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {deposits.filter(d => d.client_id === selectedClient).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500">
                          Nenhuma transação encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              // Lista de clientes
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-4">Cliente</th>
                    <th className="text-left p-4">Documento</th>
                    <th className="text-left p-4">Tipo</th>
                    <th className="text-left p-4">Saldo</th>
                    <th className="text-center p-4" colSpan={2}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const balance = getClientBalance(client.id);
                    return (
                      <tr key={client.id} className="border-t hover:bg-gray-50">
                        <td className="p-4">{client.name}</td>
                        <td className="p-4">{client.document}</td>
                        <td className="p-4">
                          {client.type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            balance >= 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            R$ {balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setSelectedClient(client.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1"
                            >
                              Ver detalhes
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Excluir"
                              disabled={loading}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        Nenhum cliente encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Nova Caução</h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  <X className="w-6 h-6" />
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
                    Cliente
                  </label>
                  {selectedClient ? (
                    <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      {clients.find(c => c.id === selectedClient)?.name}
                    </div>
                  ) : (
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
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="credit"
                        checked={formData.type === 'credit'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'credit' | 'debit' })}
                        className="mr-2"
                      />
                      Crédito
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="debit"
                        checked={formData.type === 'debit'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'credit' | 'debit' })}
                        className="mr-2"
                      />
                      Débito
                    </label>
                  </div>
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