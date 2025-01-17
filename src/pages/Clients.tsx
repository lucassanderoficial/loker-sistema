import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ClientForm } from '../components/ClientForm';

interface Client {
  id: string;
  type: 'individual' | 'business';
  status: boolean;
  name: string;
  document: string;
  email: string;
  phone: string;
  cnh_number?: string;
  cnh_expiration_date?: string;
  city: string;
  state: string;
}

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar clientes:', error);
      return;
    }

    setClients(data || []);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) {
      return;
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir cliente:', error);
      return;
    }

    await loadClients();
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Clientes</h1>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, documento ou email..."
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
                <th className="text-left p-4">CNH</th>
                <th className="text-left p-4">Cidade/UF</th>
                <th className="text-center p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.status
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {client.status ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4">
                    {client.type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </td>
                  <td className="p-4">{client.name}</td>
                  <td className="p-4">{client.document}</td>
                  <td className="p-4">{client.email}</td>
                  <td className="p-4">{client.phone}</td>
                  <td className="p-4">
                    {client.cnh_number ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        new Date(client.cnh_expiration_date!) > new Date()
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {new Date(client.cnh_expiration_date!).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4">{client.city}/{client.state}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingClient(client);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-gray-500">
                    Nenhum cliente encontrado
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
            <ClientForm
              client={editingClient}
              onClose={() => {
                setShowForm(false);
                setEditingClient(null);
              }}
              onSave={async () => {
                await loadClients();
                setShowForm(false);
                setEditingClient(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}