import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemSettings {
  system_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
}

export function Settings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    system_name: 'Loker',
    logo_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=100',
    favicon_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=32',
    primary_color: '#2563eb' // blue-600
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (data) {
        setSettings({
          system_name: data.system_name,
          logo_url: data.logo_url || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=100',
          favicon_url: data.favicon_url || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=32',
          primary_color: data.primary_color
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1, // Single row for system settings
          system_name: settings.system_name,
          logo_url: settings.logo_url,
          favicon_url: settings.favicon_url,
          primary_color: settings.primary_color,
          updated_by: user.id
        });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Configurações salvas com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar configurações. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        </div>
      </div>

      <div className="max-w-2xl bg-white rounded-xl shadow-sm">
        <form onSubmit={handleSubmit} className="p-6">
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Sistema
              </label>
              <input
                type="text"
                value={settings.system_name}
                onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                URL do Logo
              </label>
              <div className="flex gap-4 items-start">
                <input
                  type="url"
                  value={settings.logo_url}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <img
                  src={settings.logo_url}
                  alt="Logo Preview"
                  className="w-16 h-16 object-contain rounded-lg border border-gray-200"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                URL da imagem do logo (recomendado: 100x100px)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                URL do Favicon
              </label>
              <div className="flex gap-4 items-start">
                <input
                  type="url"
                  value={settings.favicon_url}
                  onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <img
                  src={settings.favicon_url}
                  alt="Favicon Preview"
                  className="w-8 h-8 object-contain rounded-lg border border-gray-200"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                URL da imagem do favicon (recomendado: 32x32px)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Cor Primária
              </label>
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="w-full h-10 px-2 border border-gray-300 rounded-lg cursor-pointer"
                required
              />
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}