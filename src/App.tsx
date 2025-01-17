import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Car, Users, Calendar, DollarSign, Bell, Search, LogOut, Wallet, Building2, FileText, AlertTriangle, SettingsIcon, Wrench, Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Investors } from './pages/Investors';
import { Franchises } from './pages/Franchises';
import { InvestorRepayments } from './pages/InvestorRepayments';
import { TrafficFines } from './pages/TrafficFines';
import { Clients } from './pages/Clients';
import { Financial } from './pages/Financial';
import { Deposits } from './pages/Deposits';
import { Contracts } from './pages/Contracts';
import { Vehicles } from './pages/Vehicles';
import { Maintenance } from './pages/Maintenance';
import { Documents } from './pages/Documents';
import { Profile } from './pages/Profile';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';

function App() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [dropdowns, setDropdowns] = useState({
    contracts: false,
    vehicles: false,
    repasse: false,
    financial: false,
    settings: false
  });
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [systemSettings, setSystemSettings] = useState<{
    system_name: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;
  }>({
    system_name: 'Loker',
    logo_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=100',
    favicon_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=32',
    primary_color: '#2563eb'
  });
  
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
        // Update favicon
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
          favicon.setAttribute('href', data.favicon_url);
        }
        // Update title
        document.title = data.system_name;
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Require authentication for all other routes
  if (!session) {
    return <Login />;
  }

  const toggleDropdown = (key: keyof typeof dropdowns) => {
    setDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white shadow-lg flex flex-col transform mobile-menu ${showMobileMenu ? 'open' : ''} md:translate-x-0 transition-transform duration-200 ease-in-out z-50`}>
        <div className="p-4">
          <div className="flex items-center px-6">
            {systemSettings.logo_url ? (
              <img 
                src={systemSettings.logo_url} 
                alt={systemSettings.system_name}
                className="w-16 h-16 object-contain"
              />
            ) : (
              <Car className="w-16 h-16 text-blue-600" />
            )}
          </div>
        </div>
        
        <nav className="mt-2 flex-1 overflow-y-auto scrollbar-hide">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center px-6 py-3 w-full text-left font-medium ${
              location.pathname === '/'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-5 h-5 mr-3" />
            Dashboard
          </button>

          <button
            onClick={() => navigate('/clients')}
            className={`flex items-center px-6 py-3 w-full text-left font-medium ${
              location.pathname === '/clients'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5 mr-3" />
            Clientes
          </button>
          <div
            onClick={() => navigate('/contracts')}
            className={`flex items-center justify-between px-6 py-3 w-full text-left font-medium ${
              location.pathname === '/contracts'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-3" />
              Contratos
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown('contracts');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {dropdowns.contracts ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
          {dropdowns.contracts && <div
            onClick={() => navigate('/documents')}
            className={`flex items-center px-6 py-3 w-full text-left text-gray-500 pl-12 ${
              location.pathname === '/documents'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <FileText className="w-5 h-5 mr-3" />
            Documentos
          </div>}
          <div
            onClick={() => navigate('/vehicles')}
            className={`flex items-center justify-between px-6 py-3 w-full text-left font-medium ${
              location.pathname === '/vehicles'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <div className="flex items-center">
              <Car className="w-5 h-5 mr-3" />
              Veículos
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown('vehicles');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {dropdowns.vehicles ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
          {dropdowns.vehicles && <div
            onClick={() => navigate('/maintenance')}
            className={`flex items-center px-6 py-3 w-full text-left text-gray-500 pl-12 ${
              location.pathname === '/maintenance'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <Wrench className="w-5 h-5 mr-3" />
            Manutenções
          </div>}
          <div
            onClick={() => navigate('/repayments')}
            className={`flex items-center justify-between px-6 py-3 w-full text-left font-medium ${
              location.pathname === '/repayments'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 mr-3" />
              Repasse
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown('repasse');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {dropdowns.repasse ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
          {dropdowns.repasse && <div
            onClick={() => navigate('/investors')}
            className={`flex items-center px-6 py-3 w-full text-left text-gray-500 pl-12 ${
              location.pathname === '/investors'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <Wallet className="w-5 h-5 mr-3" />
            Investidores
          </div>}
          <div
            onClick={() => navigate('/financial')}
            className={`flex items-center justify-between px-6 py-3 w-full text-left font-medium ${
              location.pathname === '/financial'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 mr-3" />
              Financeiro
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown('financial');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {dropdowns.financial ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
          {dropdowns.financial && <div
            onClick={() => navigate('/deposits')}
            className={`flex items-center px-6 py-3 w-full text-left text-gray-500 pl-12 ${
              location.pathname === '/deposits'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <Wallet className="w-5 h-5 mr-3" />
            Cauções
          </div>}
          <div
            onClick={() => navigate('/fines')}
            className={`flex items-center px-6 py-3 w-full text-left font-medium ${
              location.pathname === '/fines'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <AlertTriangle className="w-5 h-5 mr-3" />
            Multas
          </div>
          <div
            onClick={() => navigate('/settings')}
            className={`flex items-center justify-between px-6 py-3 w-full text-left font-medium ${
              location.pathname === '/settings'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <div className="flex items-center">
              <SettingsIcon className="w-5 h-5 mr-3" />
              Configurações
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown('settings');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {dropdowns.settings ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
          {dropdowns.settings && <div
            onClick={() => navigate('/franchises')}
            className={`flex items-center px-6 py-3 w-full text-left text-gray-500 pl-12 ${
              location.pathname === '/franchises'
                ? 'text-gray-700 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } cursor-pointer`}
          >
            <Building2 className="w-5 h-5 mr-3" />
            Franquias
          </div>}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="md:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-40 md:relative">
          <div className="flex items-center justify-between px-8 py-4">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {showMobileMenu ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
            {systemSettings.logo_url ? (
              <img 
                src={systemSettings.logo_url} 
                alt={systemSettings.system_name}
                className="h-8 w-auto object-contain md:hidden"
              />
            ) : (
              <Car className="w-8 h-8 text-blue-600 md:hidden" />
            )}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-4 py-2 w-full max-w-md">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar veículos, clientes ou reservas..."
                className="bg-transparent border-none focus:outline-none ml-2 w-full"
              />
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 md:gap-4">
                <img
                  src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop"
                  alt="Avatar do usuário"
                  className="w-8 h-8 rounded-full"
                />
                <button
                  onClick={() => navigate('/profile')}
                  className="hidden md:block text-sm font-medium hover:text-blue-600 truncate max-w-[150px]"
                  title={session?.user?.user_metadata?.name || session?.user?.email}
                >
                  {session?.user?.user_metadata?.name || 'Minha Conta'}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          {/* Mobile Search */}
          <div className="md:hidden mobile-search">
            <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent border-none focus:outline-none ml-2 w-full"
              />
            </div>
          </div>
        </header>
        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Dashboard Content */}
        <main>
          <Routes>            
            <Route index element={<Dashboard />} />
            <Route path="/investors" element={<Investors />} />
            <Route path="/franchises" element={<Franchises />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/repayments" element={<InvestorRepayments />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/deposits" element={<Deposits />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/fines" element={<TrafficFines />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;