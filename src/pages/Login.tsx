import React, { useState, useEffect } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginFormData {
  email: string;
  password: string;
}

export function Login() {
  const [systemSettings, setSystemSettings] = useState({
    system_name: 'Loker',
    logo_url: '',
    favicon_url: '',
    primary_color: '#2563eb'
  });
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (data) {
        setSystemSettings(data);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      // Redirect is handled by the AuthProvider
    } catch (err) {
      setError('Credenciais inválidas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            {systemSettings.logo_url ? (
              <img 
                src={systemSettings.logo_url} 
                alt={systemSettings.system_name}
                className="w-16 h-16 object-contain mx-auto mb-4"
              />
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao {systemSettings.system_name}</h1>
            <p className="text-gray-600 mt-2">Faça login para acessar o dashboard</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <input
                id="email"
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Entrando...'
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}