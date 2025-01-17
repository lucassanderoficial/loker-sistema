import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMask } from '@react-input/mask';

interface ClientFormProps {
  client?: {
    id: string;
    type: 'individual' | 'business';
    status: boolean;
    name: string;
    document: string;
    email: string;
    phone: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cnh_number?: string;
    cnh_category?: string;
    cnh_expiration_date?: string;
    marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated';
    occupation?: string;
    business_name?: string;
    business_contact_name?: string;
    business_contact_phone?: string;
  } | null;
  onClose: () => void;
  onSave: () => void;
}

const maritalStatusOptions = [
  { value: 'single', label: 'Solteiro(a)' },
  { value: 'married', label: 'Casado(a)' },
  { value: 'divorced', label: 'Divorciado(a)' },
  { value: 'widowed', label: 'Viúvo(a)' },
  { value: 'separated', label: 'Separado(a)' },
];

export function ClientForm({ client, onClose, onSave }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [type, setType] = useState<'individual' | 'business'>(client?.type || 'individual');

  // Configurar máscaras de input com regex mais permissivo para números
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
  
  const cnhInputRef = useMask({
    mask: '###########',
    replacement: { '#': /\d/ }
  });
  
  const businessPhoneInputRef = useMask({
    mask: '(##) #####-####',
    replacement: { '#': /\d/ }
  });

  const [formData, setFormData] = useState({
    type: client?.type || 'individual',
    status: client?.status ?? true,
    name: client?.name || '',
    document: client?.document || '',
    email: client?.email || '',
    phone: client?.phone || '',
    cep: client?.cep || '',
    street: client?.street || '',
    number: client?.number || '',
    complement: client?.complement || '',
    neighborhood: client?.neighborhood || '',
    city: client?.city || '',
    state: client?.state || '',
    cnh_number: client?.cnh_number || '',
    cnh_category: client?.cnh_category || '',
    cnh_expiration_date: client?.cnh_expiration_date || '',
    marital_status: client?.marital_status || 'single',
    occupation: client?.occupation || '',
    business_name: client?.business_name || '',
    business_contact_name: client?.business_contact_name || '',
    business_contact_phone: client?.business_contact_phone || '',
  });

  const handleCepBlur = async () => {
    const cleanCep = formData.cep.replace(/\D/g, '');
    
    if (cleanCep.length === 8) {
      try {
        setMessage({
          type: 'success',
          text: 'Buscando endereço...'
        });

        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro.toUpperCase(),
            neighborhood: data.bairro.toUpperCase(),
            city: data.localidade.toUpperCase(),
            state: data.uf.toUpperCase(),
          }));
          
          setMessage(null);
        } else {
          setMessage({
            type: 'error',
            text: 'CEP não encontrado. Por favor, verifique o número informado.'
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        setMessage({
          type: 'error',
          text: 'Erro ao buscar o CEP. Por favor, tente novamente.'
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const dataToSave = {
        ...formData,
        type,
        user_id: user?.id
      };

      if (!client) {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert([dataToSave]);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Cliente cadastrado com sucesso!'
        });
      } else {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update(dataToSave)
          .eq('id', client.id);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Cliente atualizado com sucesso!'
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar cliente. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpperCase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value.toUpperCase()
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {client ? 'Editar Cliente' : 'Novo Cliente'}
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
            Status e Tipo
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

        {type === 'business' ? (
          <>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razão Social
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleUpperCase}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Fantasia
              </label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleUpperCase}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleUpperCase}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        )}

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
            name="email"
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
            name="street"
            value={formData.street}
            onChange={handleUpperCase}
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
            name="number"
            value={formData.number}
            onChange={handleUpperCase}
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
            name="complement"
            value={formData.complement}
            onChange={handleUpperCase}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bairro
          </label>
          <input
            type="text"
            name="neighborhood"
            value={formData.neighborhood}
            onChange={handleUpperCase}
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
            name="city"
            value={formData.city}
            onChange={handleUpperCase}
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
            name="state"
            value={formData.state}
            onChange={handleUpperCase}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={2}
            required
          />
        </div>

        {type === 'individual' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número da CNH
              </label>
              <input
                ref={cnhInputRef}
                type="text"
                value={formData.cnh_number}
                onChange={(e) => setFormData({ ...formData, cnh_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria da CNH
              </label>
              <select
                value={formData.cnh_category}
                onChange={(e) => setFormData({ ...formData, cnh_category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione</option>
                {['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'].map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Validade da CNH
              </label>
              <input
                type="date"
                value={formData.cnh_expiration_date}
                onChange={(e) => setFormData({ ...formData, cnh_expiration_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado Civil
              </label>
              <select
                value={formData.marital_status}
                onChange={(e) => setFormData({ ...formData, marital_status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {maritalStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profissão
              </label>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleUpperCase}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </>
        )}

        {type === 'business' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Responsável
              </label>
              <input
                type="text"
                name="business_contact_name"
                value={formData.business_contact_name}
                onChange={handleUpperCase}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone do Responsável
              </label>
              <input
                ref={businessPhoneInputRef}
                type="text"
                value={formData.business_contact_phone}
                onChange={(e) => setFormData({ ...formData, business_contact_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </>
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
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}