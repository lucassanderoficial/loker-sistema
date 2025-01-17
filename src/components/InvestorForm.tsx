import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useMask } from '@react-input/mask';

interface InvestorFormProps {
  investor?: {
    id: string;
    status: boolean;
    type: 'individual' | 'business';
    name: string;
    document: string;
    email: string;
    phone: string;
    commission_rate: number;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
  onClose: () => void;
  onSave: () => void;
}

export function InvestorForm({ investor, onClose, onSave }: InvestorFormProps) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'individual' | 'business'>(investor?.type || 'individual');
  const documentInputRef = useMask({ 
    mask: type === 'business' ? '##.###.###/####-##' : '###.###.###-##',
    replacement: { '#': /\d/ }
  });
  const phoneInputRef = useMask({
    mask: '(##) #####-####',
    replacement: { '#': /\d/ }
  });
  const cepInputRef = useMask({
    mask: '#####-###',
    replacement: { '#': /\d/ }
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: investor?.name || '',
    email: investor?.email || '',
    document: investor?.document || '',
    phone: investor?.phone || '',
    commission_rate: investor?.commission_rate || 10,
    cep: investor?.cep || '',
    street: investor?.street || '',
    number: investor?.number || '',
    complement: investor?.complement || '',
    neighborhood: investor?.neighborhood || '',
    city: investor?.city || '',
    status: investor?.status ?? true,
    state: investor?.state || '',
  });

  const handleCepBlur = async () => {
    if (formData.cep.replace(/\D/g, '').length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${formData.cep.replace(/\D/g, '')}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const investorData = {
      ...formData,
      type,
      user_id: session?.user.id,
    };

    try {
      if (investor) {
        // Update existing investor
        const { error: investorError } = await supabase
          .from('investors')
          .update(investorData)
          .eq('id', investor.id);

        if (investorError) throw investorError;

        setMessage({
          type: 'success',
          text: 'Investidor atualizado com sucesso!'
        });
      } else {
        // Create new user for investor
        const { data: userData, error: userError } = await supabase.auth.signUp({
          email: formData.email,
          password: '123456789',
          options: {
            data: {
              role: 'investor'
            }
          }
        });

        if (userError) throw userError;
        if (!userData.user) throw new Error('Erro ao criar usuário');

        // Create new investor
        const { error: investorError } = await supabase
          .from('investors')
          .insert([{
            ...investorData,
            user_id: userData.user.id
          }]);

        if (investorError) {
          // If error creating investor, try to delete the created user
          await supabase.auth.admin.deleteUser(userData.user.id);
          throw investorError;
        }

        setMessage({
          type: 'success',
          text: 'Investidor criado com sucesso! Um email será enviado com as instruções de acesso.'
        });
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar investidor:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar investidor. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {investor ? 'Editar Investidor' : 'Novo Investidor'}
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

      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Pessoa
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                className="mr-2"
              />
              Ativo
            </label>
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Pessoa
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="individual"
                checked={type === 'individual'}
                onChange={(e) => setType(e.target.value as 'individual' | 'business')}
                className="mr-2"
              />
              Pessoa Física
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="business"
                checked={type === 'business'}
                onChange={(e) => setType(e.target.value as 'individual' | 'business')}
                className="mr-2"
              />
              Pessoa Jurídica
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome {type === 'business' ? 'Fantasia' : 'Completo'}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {type === 'business' ? 'CNPJ' : 'CPF'}
          </label>
          <input
            ref={documentInputRef}
            type="text"
            value={formData.document}
            onChange={(e) => setFormData({ ...formData, document: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone
          </label>
          <input
            ref={phoneInputRef}
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Taxa de Comissão (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.commission_rate}
            onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CEP
          </label>
          <input
            ref={cepInputRef}
            type="text"
            value={formData.cep}
            onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
            onBlur={handleCepBlur}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endereço
          </label>
          <input
            type="text"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número
          </label>
          <input
            type="text"
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complemento
          </label>
          <input
            type="text"
            value={formData.complement}
            onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bairro
          </label>
          <input
            type="text"
            value={formData.neighborhood}
            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cidade
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={2}
            required
          />
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