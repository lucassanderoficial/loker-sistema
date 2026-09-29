import React, { useState, useEffect } from 'react';
import { DollarSign, Car, Trash2, X, Ban, CheckSquare, History, Calendar, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContractActionsProps {
  contract: {
    id: string;
    client_id: string;
    vehicle_id: string;
    total_amount: number;
    payment_status: string;
  };
  onClose: () => void;
  onAction: () => void;
  availableVehicles: Array<{
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    daily_rate: number;
  }>;
}

type PaymentMethod = 'pix' | 'cash' | 'card' | 'deposit';

export function ContractActions({ contract, onClose, onAction, availableVehicles }: ContractActionsProps) {
  const [loading, setLoading] = useState(false);
  const [discount, setDiscount] = useState<string>('0');
  const [surcharge, setSurcharge] = useState<string>('0');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [action, setAction] = useState<'pay' | 'replace' | 'delete' | 'finish' | 'history' | 'renew' | null>(null);
  const [contractHistory, setContractHistory] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [replacementReason, setReplacementReason] = useState<'troca' | 'oficina'>('troca');
  const [returnPeriod, setReturnPeriod] = useState<'30' | '60' | '90' | '120'>('30');

  useEffect(() => {
    loadContractHistory();
  }, [contract.id]);

  const loadContractHistory = async () => {
    try {
      const { data: history, error } = await supabase
        .from('contract_history')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          period_start,
          period_end,
          created_at
        `)
        .eq('contract_id', contract.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setContractHistory(history || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao carregar histórico do contrato'
      });
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setMessage(null);
    const finalAmount = contract.total_amount - parseFloat(discount || '0') + parseFloat(surcharge || '0');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // If payment method is deposit, create a debit deposit
      if (paymentMethod === 'deposit') {
        const { error: depositError } = await supabase
          .from('deposits')
          .insert([{
            client_id: contract.client_id,
            type: 'debit',
            amount: finalAmount,
            description: 'Pagamento de contrato com caução',
            created_by: user.id
          }]);

        if (depositError) throw depositError;
      }

      // Register payment action with payment method
      const { error: actionError } = await supabase
        .from('contract_actions')
        .insert([{
          contract_id: contract.id,
          action_type: 'payment',
          amount: finalAmount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          created_by: user.id
        }]);

      if (actionError) throw actionError;

      setMessage({
        type: 'success',
        text: 'Pagamento registrado com sucesso!'
      });

      onAction();
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao processar pagamento. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReplacement = async () => {
    setLoading(true);
    setMessage(null);


    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage({ type: 'error', text: 'Usuário não autenticado' });
      setLoading(false);
      return;
    }

    try {
      // Get current contract details
      const { data: currentContract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contract.id)
        .single();

      if (!currentContract) throw new Error('Contrato não encontrado');

      // 1. Finish current contract
      const { error: finishError } = await supabase
        .from('contracts')
        .update({
          status: 'finished',
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (finishError) throw finishError;

      // 2. Update old vehicle status
      const { error: oldVehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: replacementReason === 'oficina' ? 'maintenance' : 'available',
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.vehicle_id);

      if (oldVehicleError) throw oldVehicleError;

      // 3. Create new contract with new vehicle
      const { data: newContract, error: newContractError } = await supabase
        .from('contracts')
        .insert([{
          client_id: currentContract.client_id,
          vehicle_id: newVehicleId,
          deposit_id: currentContract.deposit_id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: currentContract.end_date,
          auto_renew: currentContract.auto_renew,
          daily_rate: availableVehicles.find(v => v.id === newVehicleId)?.daily_rate || 0,
          total_amount: currentContract.total_amount,
          base_amount: currentContract.total_amount,
          due_date: currentContract.due_date,
          payment_status: 'pending',
          status: 'active',
          created_by: user.id
        }])
        .select()
        .single();

      if (newContractError) throw newContractError;

      // 4. Update new vehicle status
      const { error: newVehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'rented',
          updated_at: new Date().toISOString()
        })
        .eq('id', newVehicleId);

      if (newVehicleError) throw newVehicleError;

      // 5. Register replacement action
      const { error: actionError } = await supabase
        .from('contract_actions')
        .insert([{
          contract_id: contract.id,
          action_type: 'vehicle_replace',
          old_vehicle_id: contract.vehicle_id,
          new_vehicle_id: newVehicleId,
          replacement_reason: replacementReason,
          created_by: user.id
        }]);

      if (actionError) throw actionError;

      setMessage({
        type: 'success',
        text: 'Veículo substituído com sucesso! Um novo contrato foi criado.'
      });

      onAction();
    } catch (error: any) {
      console.error('Erro ao substituir veículo:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao substituir veículo. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setMessage(null);

    if (!window.confirm('Tem certeza que deseja excluir este contrato? Esta ação não poderá ser desfeita.')) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Begin deletion process
      const { data: contractData } = await supabase
        .from('contracts')
        .select('deposit_id')
        .eq('id', contract.id)
        .single();

      // Delete all financial transactions related to this contract
      await supabase
        .from('financial_transactions')
        .delete()
        .match({ contract_id: contract.id });

      // Delete contract history
      await supabase
        .from('contract_history')
        .delete()
        .match({ contract_id: contract.id });

      if (contractData?.deposit_id) {
        // Delete the deposit
        const { error: depositError } = await supabase
          .from('deposits')
          .delete()
          .eq('id', contractData.deposit_id);

        if (depositError) throw depositError;
      }

      // Delete the contract
      const { error: contractError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);

      if (contractError) throw contractError;

      setMessage({
        type: 'success',
        text: 'Contrato excluído com sucesso!'
      });

      onAction();
    } catch (error: any) {
      console.error('Erro ao excluir contrato:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao excluir contrato. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Schedule caution return
      const { error } = await supabase.rpc('schedule_caution_return', {
        p_contract_id: contract.id,
        p_return_period: returnPeriod
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Contrato encerrado com sucesso!'
      });

      onAction();
    } catch (error: any) {
      console.error('Erro ao encerrar contrato:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao encerrar contrato. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceRenewal = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Call the force_contract_renewal function
      const { error } = await supabase.rpc('force_contract_renewal', {
        p_contract_id: contract.id
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Contrato renovado com sucesso!'
      });

      onAction();
    } catch (error: any) {
      console.error('Erro ao renovar contrato:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao renovar contrato. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Ações do Contrato</h2>
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

      {!action ? (
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setAction('history')}
            className="p-4 border rounded-lg hover:bg-gray-50"
          >
            <History className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <span className="block font-medium">Histórico</span>
          </button>

          <button
            onClick={() => setAction('finish')}
            className="p-4 border rounded-lg hover:bg-gray-50"
          >
            <CheckSquare className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <span className="block font-medium">Concluir</span>
          </button>
          
          <button
            onClick={() => setAction('pay')}
            disabled={contract.payment_status === 'paid'}
            className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <span className="block font-medium">Pagar</span>
          </button>
          
          <button
            onClick={() => setAction('replace')}
            className="p-4 border rounded-lg hover:bg-gray-50"
          >
            <Car className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <span className="block font-medium">Substituir Veículo</span>
          </button>

          <button
            onClick={() => setAction('delete')}
            className="p-4 border rounded-lg hover:bg-gray-50"
          >
            <Trash2 className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <span className="block font-medium">Excluir</span>
          </button>

          <button
            onClick={() => setAction('renew')}
            disabled={!contract.auto_renew}
            className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <span className="block font-medium">Forçar Renovação</span>
          </button>
        </div>
      ) : action === 'pay' ? (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="pix"
                  checked={paymentMethod === 'pix'}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mr-2"
                />
                PIX
              </label>
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mr-2"
                />
                Dinheiro
              </label>
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mr-2"
                />
                Cartão
              </label>
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="deposit"
                  checked={paymentMethod === 'deposit'}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mr-2"
                />
                Caução
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desconto
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acréscimo
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={surcharge}
                onChange={(e) => setSurcharge(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Valor a pagar</p>
            <p className="text-2xl font-semibold">
              R$ {(contract.total_amount - parseFloat(discount || '0') + parseFloat(surcharge || '0')).toFixed(2)}
            </p>
            {(parseFloat(discount) > 0 || parseFloat(surcharge) > 0) && (
              <div className="mt-2 text-sm">
                {parseFloat(discount) > 0 && (
                  <p className="text-green-600">Desconto: R$ {parseFloat(discount).toFixed(2)}</p>
                )}
                {parseFloat(surcharge) > 0 && (
                  <p className="text-red-600">Acréscimo: R$ {parseFloat(surcharge).toFixed(2)}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setAction(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Voltar
            </button>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </div>
      ) : action === 'replace' ? (
        <div className="space-y-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            <p className="font-medium">Atenção!</p>
            <p className="mt-1">
              Esta ação irá finalizar o contrato atual e criar um novo contrato com o novo veículo.
              O veículo atual será marcado como disponível e o novo veículo como alugado.
              O valor e as datas do contrato serão mantidos, mas o status de pagamento será definido como pendente.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Novo Veículo
            </label>
            <select
              value={newVehicleId}
              onChange={(e) => setNewVehicleId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione um veículo</option>
              {availableVehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} {vehicle.model} ({vehicle.year}) - {vehicle.plate} - R$ {vehicle.daily_rate}/dia
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo da Substituição
            </label>
            <select
              value={replacementReason}
              onChange={(e) => setReplacementReason(e.target.value as 'troca' | 'oficina')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="troca">Troca</option>
              <option value="oficina">Oficina</option>
            </select>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setAction(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Voltar
            </button>
            <button
              onClick={handleReplacement}
              disabled={loading || !newVehicleId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Substituição'}
            </button>
          </div>
        </div>
      ) : action === 'delete' ? (
        <div className="space-y-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            <p className="font-medium">Atenção!</p>
            <p className="mt-1">
              Esta ação irá excluir permanentemente o contrato.
              O veículo será marcado como disponível e o valor da caução
              referente a este contrato será excluído.
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setAction(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Voltar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      ) : action === 'finish' ? (
        <div className="space-y-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            <p className="font-medium">Atenção!</p>
            <p className="mt-1">
              Esta ação irá concluir o contrato e agendar a devolução da caução.
              A auto renovação será desativada e o veículo será marcado como disponível.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prazo para Devolução da Caução
            </label>
            <select
              value={returnPeriod}
              onChange={(e) => setReturnPeriod(e.target.value as '30' | '60' | '90' | '120')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="120">120 dias</option>
            </select>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setAction(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Voltar
            </button>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Conclusão'}
            </button>
          </div>
        </div>
      ) : action === 'history' ? (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <h3 className="text-lg font-medium mb-4">Histórico de Pagamentos</h3>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-4">Data do Pagamento</th>
                  <th className="text-left p-4">Método</th>
                  <th className="text-left p-4">Valor</th>
                  <th className="text-left p-4">Período</th>
                </tr>
              </thead>
              <tbody>
                {contractHistory.map((period) => (
                  <tr key={period.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(period.payment_date).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {period.payment_method}
                      </span>
                    </td>
                    <td className="p-4">R$ {period.amount.toFixed(2)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p>{new Date(period.period_start).toLocaleDateString('pt-BR')} até</p>
                          <p className="text-sm text-gray-500">{new Date(period.period_end).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {contractHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">
                      Nenhum pagamento registrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setAction(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : action === 'renew' ? (
        <div className="space-y-6">
          <div className="bg-blue-50 text-blue-700 p-4 rounded-lg">
            <p className="font-medium">Forçar Renovação</p>
            <p className="mt-1">
              Esta ação irá renovar o contrato manualmente, ignorando as configurações de auto renovação.
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setAction(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Voltar
            </button>
            <button
              onClick={handleForceRenewal}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Renovação'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}