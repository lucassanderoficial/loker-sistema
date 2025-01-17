import React, { useState, useEffect } from 'react';
import { Wallet, Search, Calendar, ArrowUpCircle, ArrowDownCircle, DollarSign, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Investor {
  id: string;
  name: string;
  commission_rate: number;
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  investor_id: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  vehicle_id: string;
}

interface VehicleFinancials {
  vehicle: Vehicle;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  commission: number;
}

export function InvestorRepayments() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [selectedInvestor, setSelectedInvestor] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().split('-').slice(0, 2).join('-'));
  const [vehicleFinancials, setVehicleFinancials] = useState<VehicleFinancials[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvestorName, setSelectedInvestorName] = useState('');

  useEffect(() => {
    loadInvestors();
  }, []);

  useEffect(() => {
    if (selectedInvestor && selectedMonth) {
      loadVehicleFinancials();
    }
  }, [selectedInvestor, selectedMonth]);

  async function loadInvestors() {
    try {
      const { data } = await supabase
        .from('investors')
        .select('id, name, commission_rate')
        .eq('status', true)
        .order('name');
      
      setInvestors(data || []);
    } catch (error) {
      console.error('Erro ao carregar investidores:', error);
    }
  }

  async function loadVehicleFinancials() {
    setLoading(true);
    try {
      // Load vehicles for the selected investor
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('investor_id', selectedInvestor);

      if (!vehicles) return;

      // Load transactions for each vehicle
      const financials: VehicleFinancials[] = await Promise.all(
        vehicles.map(async (vehicle) => {
          const { data: transactions } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .gte('date', `${selectedMonth}-01`)
            .lt('date', `${selectedMonth}-31`);

          const vehicleTransactions = transactions || [];
          const totalIncome = vehicleTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
          
          const totalExpense = vehicleTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

          const netAmount = totalIncome - totalExpense;

          // Get investor's commission rate
          const investor = investors.find(i => i.id === selectedInvestor);
          const commissionRate = investor?.commission_rate || 0;
          const commission = (totalIncome * commissionRate) / 100;

          return {
            vehicle,
            transactions: vehicleTransactions,
            totalIncome,
            totalExpense,
            netAmount,
            commission
          };
        })
      );

      setVehicleFinancials(financials);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  }

  const totals = vehicleFinancials.reduce((acc, curr) => ({
    income: acc.income + curr.totalIncome,
    expense: acc.expense + curr.totalExpense,
    commission: acc.commission + curr.commission,
    netAmount: acc.netAmount + (curr.totalIncome - curr.totalExpense - curr.commission)
  }), { income: 0, expense: 0, commission: 0, netAmount: 0 });

  const handlePrint = () => {
    const getSystemSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      return data;
    };

    // Get formatted month name
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Create print window after getting settings
    getSystemSettings().then(settings => {
      if (!settings) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      // Generate the HTML content
      const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Repasse - ${selectedInvestorName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              max-width: 100px;
              max-height: 100px;
              margin-bottom: 15px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .summary {
              margin-bottom: 30px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .summary-item {
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            }
            .vehicle-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
            }
            .transactions-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .transactions-table th,
            .transactions-table td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: left;
            }
            .transactions-table th {
              background-color: #f9fafb;
            }
            @media print {
              .no-break {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${settings.logo_url}" alt="${settings.system_name}" class="logo" />
            <h1>Relatório de Repasse</h1>
            <p>Investidor: ${selectedInvestorName}</p>
            <p>Período: ${monthName}</p>
          </div>

          <div class="summary">
            <div class="summary-grid">
              <div class="summary-item">
                <h3>Receita Bruta</h3>
                <p>R$ ${totals.income.toFixed(2)}</p>
              </div>
              <div class="summary-item">
                <h3>Despesas</h3>
                <p>R$ ${totals.expense.toFixed(2)}</p>
              </div>
              <div class="summary-item">
                <h3>Comissão</h3>
                <p>R$ ${totals.commission.toFixed(2)}</p>
              </div>
              <div class="summary-item">
                <h3>Resultado Líquido</h3>
                <p>R$ ${totals.netAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div class="vehicles">
            ${vehicleFinancials.map(financial => `
              <div class="vehicle-card no-break">
                <h2>${financial.vehicle.brand} ${financial.vehicle.model}</h2>
                <p>Placa: ${financial.vehicle.plate}</p>
                <p>Comissão: R$ ${financial.commission.toFixed(2)}</p>
                
                <div style="margin: 15px 0;">
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div class="summary-item">
                      <h4>Receita Bruta</h4>
                      <p>R$ ${financial.totalIncome.toFixed(2)}</p>
                    </div>
                    <div class="summary-item">
                      <h4>Despesas</h4>
                      <p>R$ ${financial.totalExpense.toFixed(2)}</p>
                    </div>
                    <div class="summary-item">
                      <h4>Resultado</h4>
                      <p>R$ ${(financial.netAmount - financial.commission).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <table class="transactions-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Categoria</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${financial.transactions.map(transaction => `
                      <tr>
                        <td>${new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                        <td>${transaction.type === 'income' ? 'Receita' : 'Despesa'}</td>
                        <td>${transaction.category}</td>
                        <td>${transaction.description}</td>
                        <td>R$ ${transaction.amount.toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
      
      // Write content to window
      printWindow.document.write(content);
      printWindow.document.close();

      // Wait for logo to load before printing
      const logo = printWindow.document.querySelector('.logo') as HTMLImageElement;
      if (logo) {
        logo.onload = () => {
          // Small delay to ensure proper rendering
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      } else {
        // If no logo, print directly
        printWindow.print();
      }
    });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Wallet className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Repasse para Investidores</h1>
          {selectedInvestor && (
            <button
              onClick={handlePrint}
              className="ml-4 flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <Printer className="w-5 h-5" />
              Imprimir Relatório
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <select
              value={selectedInvestor}
              onChange={(e) => {
                setSelectedInvestor(e.target.value);
                const investor = investors.find(i => i.id === e.target.value);
                setSelectedInvestorName(investor ? investor.name : '');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            >
              <option value="">Selecione um investidor</option>
              {investors.map(investor => (
                <option key={investor.id} value={investor.id}>
                  {investor.name} ({investor.commission_rate}% de comissão)
                </option>
              ))}
            </select>

            <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="month"
                value={selectedMonth.split('-').slice(0, 2).join('-')}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-gray-600 ml-2"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : selectedInvestor && vehicleFinancials.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm">Receita Bruta</h3>
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-semibold text-green-600">
                R$ {totals.income.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm">Despesas</h3>
                <ArrowDownCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-semibold text-red-600">
                R$ {totals.expense.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm">Comissão</h3>
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-semibold text-blue-600">
                R$ {totals.commission.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm">Resultado Líquido</h3>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className={`text-2xl font-semibold ${
                totals.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                R$ {totals.netAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="space-y-6">
            {vehicleFinancials.map((financial) => (
              <div key={financial.vehicle.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {financial.vehicle.brand} {financial.vehicle.model}
                    </h2>
                    <p className="text-gray-500">{financial.vehicle.plate}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Ano: {financial.vehicle.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Comissão</p>
                    <p className="text-lg font-semibold text-blue-600">
                      R$ {financial.commission.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Receita Bruta</p>
                    <p className="text-lg font-semibold text-green-600">
                      R$ {financial.totalIncome.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Despesas</p>
                    <p className="text-lg font-semibold text-red-600">
                      R$ {financial.totalExpense.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Resultado</p>
                    <p className={`text-lg font-semibold ${
                      (financial.netAmount - financial.commission) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      R$ {(financial.netAmount - financial.commission).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Transações do Período
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-2">Data</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Categoria</th>
                          <th className="text-left p-2">Descrição</th>
                          <th className="text-right p-2">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financial.transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-t">
                            <td className="p-2">
                              {new Date(transaction.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                transaction.type === 'income'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {transaction.category}
                              </span>
                            </td>
                            <td className="p-2">{transaction.description}</td>
                            <td className="p-2 text-right">
                              <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                R$ {transaction.amount.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {financial.transactions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-gray-500">
                              Nenhuma transação no período
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : selectedInvestor && vehicleFinancials.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          Nenhuma transação encontrada para o período selecionado
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          Selecione um investidor e um período para visualizar os dados financeiros
        </div>
      )}
    </div>
  );
}