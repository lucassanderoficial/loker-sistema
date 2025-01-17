import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  name: string;
}

export function Profile() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        name: user.user_metadata.name || ''
      }));
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuário não encontrado');

      // Update user metadata
      const { data: { user: updatedUser }, error: updateError } = await supabase.auth.updateUser({
        data: { name: formData.name }
      });

      if (updateError) throw updateError;

      // Refresh the session to update the metadata
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      setMessage({
        type: 'success',
        text: 'Perfil atualizado com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao atualizar perfil'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Senha atualizada com sucesso!'
      });

      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao atualizar senha'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-8">
        <User className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">Informações Pessoais</h2>
          
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome
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
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>

        {/* Password Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Alterar Senha</h2>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showPasswordForm ? (
                <X className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </button>
          </div>

          {showPasswordForm ? (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={8}
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setFormData(prev => ({
                      ...prev,
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    }));
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Clique no ícone acima para alterar sua senha
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}