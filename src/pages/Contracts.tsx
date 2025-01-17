import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, CheckCircle, XCircle, AlertCircle, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ContractForm } from '../components/ContractForm';
import { ContractActions } from '../components/ContractActions';

interface Contract {
  id: string;
  client: {
    name: string;
    document: string;
  };
  vehicle: {
    plate: string;
    brand: string;
    model: string;
  };
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  daily_rate: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date: string | null;
  due_date: string;
  status: 'active' | 'finished' | 'cancelled';
}

const paymentStatusConfig = {
  pending: { label: 'Pendente', icon: AlertCircle, class: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Pago', icon: CheckCircle, class: 'bg-green-100 text-green-800' },
  overdue: { label: 'Atrasado', icon: AlertCircle, class: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelado', icon: XCircle, class: 'bg-gray-100 text-gray-800' }
};

const contractStatusConfig = {
  active: { label: 'Ativo', class: 'bg-green-100 text-green-800' },
  finished: { label: 'Finalizado', class: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Cancelado', class: 'bg-gray-100 text-gray-800' }
};

export function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadAvailableVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, plate, brand, model, year, daily_rate')
      .eq('status', 'available')
      .order('brand');
    
    setAvailableVehicles(data || []);
  };

  async function loadContracts() {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        client:clients(name, document),
        vehicle:vehicles(plate, brand, model)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar contratos:', error);
      return;
    }

    setContracts(data || []);
  }

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client.document.includes(searchTerm) ||
      contract.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPayment = paymentFilter === 'all' || contract.payment_status === paymentFilter;
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesPayment && matchesStatus;
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Contratos</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Contrato
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, documento ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:outline-none ml-2 w-full"
              />
            </div>
            
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os Pagamentos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Atrasado</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="finished">Finalizado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4">Cliente</th>
                <th className="text-left p-4">Veículo</th>
                <th className="text-left p-4">Período</th>
                <th className="text-left p-4">Valor</th>
                <th className="text-left p-4">Vencimento</th>
                <th className="text-left p-4">Pagamento</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Auto Renovação</th>
                <th className="text-center p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => {
                const PaymentIcon = paymentStatusConfig[contract.payment_status].icon;
                
                return <tr key={contract.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{contract.client.name}</p>
                      <p className="text-sm text-gray-500">{contract.client.document}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{contract.vehicle.brand} {contract.vehicle.model}</p>
                      <p className="text-sm text-gray-500">{contract.vehicle.plate}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p>{new Date(contract.start_date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-sm text-gray-500">
                        até {new Date(contract.end_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">R$ {contract.total_amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        R$ {contract.daily_rate.toFixed(2)}/dia
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    {new Date(contract.due_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      paymentStatusConfig[contract.payment_status].class
                    }`}>
                      <PaymentIcon className="w-4 h-4" />
                      {paymentStatusConfig[contract.payment_status].label}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      contractStatusConfig[contract.status].class
                    }`}>
                      {contractStatusConfig[contract.status].label}
                    </span>
                  </td>
                  <td className="p-4">
                    {contract.auto_renew ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <XCircle className="w-4 h-4" />
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <button
                        onClick={async () => {
                          setSelectedContract(contract);
                          await loadAvailableVehicles();
                          setShowActions(true);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Ações"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>;
              })}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-gray-500">
                    Nenhum contrato encontrado
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
            <ContractForm
              onClose={() => setShowForm(false)}
              onSave={async () => {
                await loadContracts();
                setShowForm(false);
              }}
            />
          </div>
        </div>
      )}

      {showActions && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full">
            <ContractActions
              contract={selectedContract}
              availableVehicles={availableVehicles}
              onClose={() => {
                setShowActions(false);
                setSelectedContract(null);
              }}
              onAction={async () => {
                await loadContracts();
                setShowActions(false);
                setSelectedContract(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}