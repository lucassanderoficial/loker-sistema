import React, { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FranchiseForm } from '../components/FranchiseForm';

interface Franchise {
  id: string;
  name: string;
  email: string;
  cnpj: string;
  royalties_rate: number;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function Franchises() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFranchises();
  }, []);

  async function loadFranchises() {
    const { data, error } = await supabase
      .from('franchises')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar franquias:', error);
      return;
    }

    setFranchises(data || []);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta franquia?')) {
      return;
    }

    const { error } = await supabase
      .from('franchises')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir franquia:', error);
      return;
    }

    await loadFranchises();
  }

  const filteredFranchises = franchises.filter(franchise =>
    franchise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    franchise.cnpj.includes(searchTerm)
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Franquias</h1>
        </div>
        <button
          onClick={() => {
            setEditingFranchise(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nova Franquia
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
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
                <th className="text-left p-4">Nome</th>
                <th className="text-left p-4">CNPJ</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Royalties</th>
                <th className="text-left p-4">Cidade/UF</th>
                <th className="text-center p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredFranchises.map((franchise) => (
                <tr key={franchise.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">{franchise.name}</td>
                  <td className="p-4">{franchise.cnpj}</td>
                  <td className="p-4">{franchise.email}</td>
                  <td className="p-4">{franchise.royalties_rate}%</td>
                  <td className="p-4">{franchise.city}/{franchise.state}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingFranchise(franchise);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(franchise.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFranchises.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Nenhuma franquia encontrada
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
            <FranchiseForm
              franchise={editingFranchise}
              onClose={() => {
                setShowForm(false);
                setEditingFranchise(null);
              }}
              onSave={async () => {
                await loadFranchises();
                setShowForm(false);
                setEditingFranchise(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}