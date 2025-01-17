import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useMask } from '@react-input/mask';

interface FranchiseFormProps {
  franchise?: {
    id: string;
    name: string;
    cnpj: string;
    royalties_rate: number;
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

export function FranchiseForm({ franchise, onClose, onSave }: FranchiseFormProps) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const cnpjInputRef = useMask({ mask: '##.###.###/####-##', replacement: { '#': /\d/ } });
  const cepInputRef = useMask({ mask: '#####-###', replacement: { '#': /\d/ } });
  const [formData, setFormData] = useState({
    name: franchise?.name || '',
    email: franchise?.email || '',
    cnpj: franchise?.cnpj || '',
    royalties_rate: franchise?.royalties_rate || 10,
    cep: franchise?.cep || '',
    street: franchise?.street || '',
    number: franchise?.number || '',
    complement: franchise?.complement || '',
    neighborhood: franchise?.neighborhood || '',
    city: franchise?.city || '',
    state: franchise?.state || '',
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
    
    try {
      if (franchise) {
        // Atualizar franquia existente
        const { error: franchiseError } = await supabase
          .from('franchises')
          .update({
            name: formData.name,
            email: formData.email,
            cnpj: formData.cnpj,
            royalties_rate: formData.royalties_rate,
            cep: formData.cep,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
          })
          .eq('id', franchise.id);

        if (franchiseError) throw franchiseError;

        setMessage({
          type: 'success',
          text: 'Franquia atualizada com sucesso!'
        });
      } else {
        // Criar novo usuário
        const { data: userData, error: userError } = await supabase.auth.signUp({
          email: formData.email,
          password: '123456789',
          options: {
            data: {
              role: 'franchise'
            }
          }
        });

        if (userError) throw userError;
        if (!userData.user) throw new Error('Erro ao criar usuário');

        // Criar nova franquia
        const { error: franchiseError } = await supabase
          .from('franchises')
          .insert([{
            name: formData.name,
            email: formData.email,
            cnpj: formData.cnpj,
            royalties_rate: formData.royalties_rate,
            cep: formData.cep,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            user_id: userData.user.id
          }]);

        if (franchiseError) {
          // Se houver erro ao criar a franquia, tentar deletar o usuário criado
          await supabase.auth.admin.deleteUser(userData.user.id);
          throw franchiseError;
        }

        setMessage({
          type: 'success',
          text: 'Franquia criada com sucesso! Um email será enviado com as instruções de acesso.'
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar franquia:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar franquia. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {franchise ? 'Editar Franquia' : 'Nova Franquia'}
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
            Nome da Franquia
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
            CNPJ
          </label>
          <input
            ref={cnpjInputRef}
            type="text"
            value={formData.cnpj}
            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Taxa de Royalties (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.royalties_rate}
            onChange={(e) => setFormData({ ...formData, royalties_rate: parseFloat(e.target.value) })}
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