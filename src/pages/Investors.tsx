import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { InvestorForm } from '../components/InvestorForm';

interface Investor {
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
}

export function Investors() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInvestors();
  }, []);

  async function loadInvestors() {
    const { data, error } = await supabase
      .from('investors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar investidores:', error);
      return;
    }

    setInvestors(data || []);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este investidor?')) {
      return;
    }

    // Delete investor record
    const { error: investorError } = await supabase
      .from('investors')
      .delete()
      .eq('id', id);

    if (investorError) {
      console.error('Erro ao excluir investidor:', investorError);
      return;
    }

    await loadInvestors();
  }

  const filteredInvestors = investors.filter(investor =>
    investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investor.document.includes(searchTerm)
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Investidores</h1>
        </div>
        <button
          onClick={() => {
            setEditingInvestor(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Investidor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou documento..."
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
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Tipo</th>
                <th className="text-left p-4">Nome</th>
                <th className="text-left p-4">Documento</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Telefone</th>
                <th className="text-left p-4">Comissão</th>
                <th className="text-left p-4">Cidade/UF</th>
                <th className="text-center p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestors.map((investor) => (
                <tr key={investor.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      investor.status
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {investor.status ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4">
                    {investor.type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </td>
                  <td className="p-4">{investor.name}</td>
                  <td className="p-4">{investor.document}</td>
                  <td className="p-4">{investor.email}</td>
                  <td className="p-4">{investor.phone}</td>
                  <td className="p-4">{investor.commission_rate}%</td>
                  <td className="p-4">{investor.city}/{investor.state}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingInvestor(investor);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(investor.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvestors.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">
                    Nenhum investidor encontrado
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
            <InvestorForm
              investor={editingInvestor}
              onClose={() => {
                setShowForm(false);
                setEditingInvestor(null);
              }}
              onSave={async () => {
                await loadInvestors();
                setShowForm(false);
                setEditingInvestor(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}