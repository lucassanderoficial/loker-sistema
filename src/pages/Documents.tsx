import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Pencil, Trash2, Eye, Download, X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentTemplate {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Contract {
  id: string;
  client: {
    name: string;
    cnh_number?: string;
    document: string;
    email: string;
    phone: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    chassis: string;
    renavam: string;
    investor: {
      name: string;
      document: string;
      email: string;
      phone: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      commission_rate: number;
    };
  };
  start_date: string;
  end_date: string;
  daily_rate: number;
  total_amount: number;
  deposit_id: string;
  deposit?: {
    amount: number;
  };
}

export function Documents() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: ''
  });

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    setFormData({ ...formData, content: e.currentTarget.innerHTML });
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load system settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      // Load templates
      const { data: templatesData } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      setTemplates(templatesData || []);

      // Load contracts with related data
      const { data: contractsData } = await supabase
        .from('contracts')
        .select(`
          *,
          deposit:deposits(amount),
          client:clients(
            name,
            cnh_number,
            document,
            email,
            phone,
            street,
            number,
            complement,
            neighborhood,
            city,
            state
          ),
          vehicle:vehicles(
            plate,
            brand,
            model,
            year,
            color,
            chassis,
            renavam,
            investor:investors(
              name,
              document,
              email,
              phone,
              street,
              number,
              complement,
              neighborhood,
              city,
              state,
              commission_rate
            )
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      setContracts(contractsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('document_templates')
          .update({
            name: formData.name,
            content: formData.content
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Modelo atualizado com sucesso!'
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from('document_templates')
          .insert([{
            name: formData.name,
            content: formData.content,
            created_by: user.id
          }]);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Modelo criado com sucesso!'
        });
      }

      await loadData();
      setShowForm(false);
      setSelectedTemplate(null);
      setFormData({ name: '', content: '' });
    } catch (error: any) {
      console.error('Erro ao salvar modelo:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar modelo. Por favor, tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Modelo excluído com sucesso!'
      });

      await loadData();
    } catch (error: any) {
      console.error('Erro ao excluir modelo:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao excluir modelo'
      });
    } finally {
      setLoading(false);
    }
  };

  const replaceVariables = (content: string, contract: Contract) => {
    // Client variables
    content = content.replace(/\${cliente\.nome}/g, contract.client.name);
    content = content.replace(/\${cliente\.cnh_numero}/g, contract.client.cnh_number || 'N/A');
    content = content.replace(/\${cliente\.documento}/g, contract.client.document);
    content = content.replace(/\${cliente\.email}/g, contract.client.email);
    content = content.replace(/\${cliente\.telefone}/g, contract.client.phone);
    content = content.replace(/\${cliente\.endereco}/g, 
      `${contract.client.street}, ${contract.client.number}${contract.client.complement ? `, ${contract.client.complement}` : ''}`);
    content = content.replace(/\${cliente\.bairro}/g, contract.client.neighborhood);
    content = content.replace(/\${cliente\.cidade}/g, contract.client.city);
    content = content.replace(/\${cliente\.estado}/g, contract.client.state);

    // Vehicle variables
    content = content.replace(/\${veiculo\.placa}/g, contract.vehicle.plate);
    content = content.replace(/\${veiculo\.marca}/g, contract.vehicle.brand);
    content = content.replace(/\${veiculo\.modelo}/g, contract.vehicle.model);
    content = content.replace(/\${veiculo\.ano}/g, contract.vehicle.year.toString());
    content = content.replace(/\${veiculo\.cor}/g, contract.vehicle.color);
    content = content.replace(/\${veiculo\.chassi}/g, contract.vehicle.chassis);
    content = content.replace(/\${veiculo\.renavam}/g, contract.vehicle.renavam);

    // Investor variables
    content = content.replace(/\${investidor\.nome}/g, contract.vehicle.investor.name);
    content = content.replace(/\${investidor\.documento}/g, contract.vehicle.investor.document);
    content = content.replace(/\${investidor\.endereco}/g, 
      `${contract.vehicle.investor.street}, ${contract.vehicle.investor.number}${contract.vehicle.investor.complement ? `, ${contract.vehicle.investor.complement}` : ''}`);
    content = content.replace(/\${investidor\.cidade}/g, contract.vehicle.investor.city);
    content = content.replace(/\${investidor\.estado}/g, contract.vehicle.investor.state);
    content = content.replace(/\${investidor\.comissao}/g, contract.vehicle.investor.commission_rate.toString());

    // Contract variables
    content = content.replace(/\${contrato\.inicio}/g, new Date(contract.start_date).toLocaleDateString('pt-BR'));
    content = content.replace(/\${contrato\.fim}/g, new Date(contract.end_date).toLocaleDateString('pt-BR'));
    content = content.replace(/\${contrato\.diaria}/g, contract.daily_rate.toFixed(2));
    content = content.replace(/\${contrato\.total}/g, contract.total_amount.toFixed(2));
    content = content.replace(/\${contrato\.caucao}/g, (contract.deposit?.amount || 0).toFixed(2));

    return content;
  };

  const handlePreview = async () => {
    if (!selectedTemplate || !selectedContract) {
      setMessage({
        type: 'error',
        text: 'Selecione um modelo e um contrato para visualizar'
      });
      return;
    }

    const contract = contracts.find(c => c.id === selectedContract);
    if (!contract) {
      setMessage({
        type: 'error',
        text: 'Contrato não encontrado'
      });
      return;
    }
    
    // Get system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    const content = replaceVariables(selectedTemplate.content, contract);
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) return;

    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedTemplate.name}</title>
          <style>
            @page { margin: 2cm; }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header img {
              height: 60px;
              width: auto;
              margin: 10px auto;
            }
            .footer {
              padding: 20px;
              border-top: 1px solid #eee;
              margin-top: 30px;
            }
            .footer .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
            }
            .footer .signature-line {
              width: 45%;
              border-top: 1px solid #000;
              padding-top: 5px;
              text-align: center;
            }
            .content {
              margin: 20px 0;
            }
            @media print {
              body {
                padding: 0;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${settings?.logo_url}" alt="${settings?.system_name}" />
          </div>
          <div class="content">
          ${content}
          </div>
          <div class="footer">
            <div class="signatures">
              <div class="signature-line">
                ${contract.client.name}<br>
                Cliente
              </div>
              <div class="signature-line">
                ${contract.vehicle.investor.name}<br>
                Investidor
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    previewWindow.document.close();
  };

  const handleDownload = async () => {
    try {
      // Validate selection
      if (!selectedTemplate || !selectedContract) {
        setMessage({ type: 'error', text: 'Selecione um modelo e um contrato para baixar' });
        return;
      }

      const contract = contracts.find(c => c.id === selectedContract);
      if (!contract) {
        setMessage({ type: 'error', text: 'Contrato não encontrado' });
        return;
      }

      // Get system settings
      const { data: settings } = await supabase.from('system_settings').select('*').single();

      // Create blob with HTML content
      const content = replaceVariables(selectedTemplate.content, contract);
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              @page { margin: 2.5cm 2cm; }
              body { 
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #000;
                font-size: 12pt;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                position: relative;
              }
              .header img {
                height: 60px;
                width: auto;
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
              }
              .content {
                margin: 20px 0;
              }
              .footer {
                margin-top: 50px;
                page-break-inside: avoid;
              }
              .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 100px;
              }
              .signature-line {
                width: 40%;
                border-top: 1px solid #000;
                padding-top: 10px;
                text-align: center;
              }
              table { 
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
              }
              th, td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
              }
              p { margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${settings?.logo_url}" alt="${settings?.system_name}" />
            </div>
            <div style="margin-top: 80px;">
              <div class="content">
                ${content}
              </div>
              <div class="footer">
                <div class="signatures">
                  <div class="signature-line">
                    ${contract.client.name}<br>
                    Cliente
                  </div>
                  <div class="signature-line">
                    ${contract.vehicle.investor.name}<br>
                    Investidor
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      // Create blob and download link
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTemplate.name}.html`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar o documento. Por favor, tente novamente.' });
    }
  };

  const filteredTemplates = templates.filter(template =>
     template.name.toLowerCase().includes(searchTerm.toLowerCase())
   );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Modelos de Documentos</h1>
        </div>
        <button
          onClick={() => {
            setSelectedTemplate(null);
            setFormData({ name: '', content: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Modelo
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Templates List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b">
              <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar modelos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none focus:outline-none ml-2 w-full"
                />
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border"
                  >
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-gray-500">
                        Atualizado em {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setFormData({
                            name: template.name,
                            content: template.content
                          });
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    Nenhum modelo encontrado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Visualizar Documento</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo
              </label>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t.id === e.target.value);
                  setSelectedTemplate(template || null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um modelo</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contrato
              </label>
              <select
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um contrato</option>
                {contracts.map(contract => (
                  <option key={contract.id} value={contract.id}>
                    {contract.client.name} - {contract.vehicle.plate}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handlePreview}
                disabled={!selectedTemplate || !selectedContract}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Eye className="w-5 h-5" />
                Visualizar
              </button>
              <button
                onClick={handleDownload}
                disabled={!selectedTemplate || !selectedContract}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                Baixar
              </button>
            </div>
          </div>

          {selectedTemplate && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Variáveis Disponíveis para o Modelo
              </h3>
              <div className="bg-gray-50 p-6 rounded-lg text-sm space-y-6 max-h-[600px] overflow-y-auto">
                <div>
                  <p className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                    <span className="p-1 bg-blue-100 rounded">Cliente</span>
                    Dados do Cliente
                  </p>
                  <ul className="grid grid-cols-1 gap-2 text-gray-600 pl-4">
                    <li>${'{cliente.nome}'} - Nome completo do cliente</li>
                    <li>${'{cliente.documento}'} - CPF/CNPJ do cliente</li>
                    <li>${'{cliente.email}'} - Email do cliente</li>
                    <li>${'{cliente.telefone}'} - Telefone do cliente</li>
                    <li>${'{cliente.endereco}'} - Endereço completo com número</li>
                    <li>${'{cliente.bairro}'} - Bairro</li>
                    <li>${'{cliente.cidade}'} - Cidade</li>
                    <li>${'{cliente.estado}'} - Estado (UF)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                    <span className="p-1 bg-blue-100 rounded">Veículo</span>
                    Dados do Veículo
                  </p>
                  <ul className="grid grid-cols-1 gap-2 text-gray-600 pl-4">
                    <li>${'{veiculo.placa}'} - Placa do veículo</li>
                    <li>${'{veiculo.marca}'} - Marca do veículo</li>
                    <li>${'{veiculo.modelo}'} - Modelo do veículo</li>
                    <li>${'{veiculo.ano}'} - Ano do veículo</li>
                    <li>${'{veiculo.cor}'} - Cor do veículo</li>
                    <li>${'{veiculo.chassi}'} - Número do chassi</li>
                    <li>${'{veiculo.renavam}'} - Número do RENAVAM</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                    <span className="p-1 bg-blue-100 rounded">Investidor</span>
                    Dados do Investidor
                  </p>
                  <ul className="grid grid-cols-1 gap-2 text-gray-600 pl-4">
                    <li>${'{investidor.nome}'} - Nome do investidor</li>
                    <li>${'{investidor.documento}'} - CPF/CNPJ do investidor</li>
                    <li>${'{investidor.endereco}'} - Endereço completo</li>
                    <li>${'{investidor.cidade}'} - Cidade</li>
                    <li>${'{investidor.estado}'} - Estado (UF)</li>
                    <li>${'{investidor.comissao}'} - Taxa de comissão (%)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                    <span className="p-1 bg-blue-100 rounded">Contrato</span>
                    Dados do Contrato
                  </p>
                  <ul className="grid grid-cols-1 gap-2 text-gray-600 pl-4">
                    <li>${'{contrato.inicio}'} - Data de início</li>
                    <li>${'{contrato.fim}'} - Data de término</li>
                    <li>${'{contrato.diaria}'} - Valor da diária</li>
                    <li>${'{contrato.total}'} - Valor total do contrato</li>
                    <li>${'{contrato.caucao}'} - Valor da caução</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-7xl w-full">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {selectedTemplate ? 'Editar Modelo' : 'Novo Modelo'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedTemplate(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Modelo
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
                      Conteúdo
                    </label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
                        <button
                          type="button"
                          onClick={() => handleFormat('bold')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Negrito"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('italic')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Itálico"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('underline')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Sublinhado"
                        >
                          <Underline className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-gray-300 mx-1" />
                        <button
                          type="button"
                          onClick={() => handleFormat('justifyLeft')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Alinhar à esquerda"
                        >
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('justifyCenter')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Centralizar"
                        >
                          <AlignCenter className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('justifyRight')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Alinhar à direita"
                        >
                          <AlignRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div
                        contentEditable
                        dangerouslySetInnerHTML={{ __html: formData.content }}
                        onInput={handleEditorChange}
                        className="p-4 min-h-[400px] focus:outline-none overflow-y-auto"
                      />
                    </div>
                  </div>
                </div>

                {/* Variables List */}
                <div className="bg-gray-50 p-6 rounded-lg text-sm space-y-6 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <div>
                    <p className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                      <span className="p-1 bg-blue-100 rounded">Cliente</span>
                      Dados do Cliente
                    </p>
                    <ul className="grid grid-cols-1 gap-2 text-gray-600 pl-4">
                      <li>${'{cliente.nome}'} - Nome completo do cliente</li>
                      <li>${'{cliente.documento}'} - CPF/CNPJ do cliente</li>
                      <li>${'{cliente.email}'} - Email do cliente</li>
                      <li>${'{cliente.telefone}'} - Telefone do cliente</li>
                      <li>${'{cliente.endereco}'} - Endereço completo com número</li>
                      <li>${'{cliente.bairro}'} - Bairro</li>
                      <li>${'{cliente.cidade}'} - Cidade</li>
                      <li>${'{cliente.estado}'} - Estado (UF)</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                      <span className="p-1 bg-blue-100 rounded">Veículo</span>
                      Dados do Veículo
                    </p>
                    <ul className="grid grid-cols-1 gap-2 text-gray-600 pl-4">
                      <li>${'{veiculo.placa}'} - Placa do veículo</li>
                      <li>${'{veiculo.marca}'} - Marca do veículo</li>
                      <li>${'{veiculo.modelo}'} - Modelo do veículo</li>
                      <li>${'{veiculo.ano}'} - Ano do veículo</li>
                      <li>${'{veiculo.cor}'} - Cor do veículo</li>
                      <li>${'{veiculo.chassi}'} - Número do chassi</li>
                      <li>${'{veiculo.renavam}'} - Número do RENAVAM</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                      <span className="p-1 bg-blue-100 rounded">Investidor</span>
                      Dados do Investidor
                    </p>
                    <ul className="grid grid-cols-1 gap-2 text-gray-600 pl-4">
                      <li>${'{investidor.nome}'} - Nome do investidor</li>
                      <li>${'{investidor.documento}'} - CPF/CNPJ do investidor</li>
                      <li>${'{investidor.endereco}'} - Endereço completo</li>
                      <li>${'{investidor.cidade}'} - Cidade</li>
                      <li>${'{investidor.estado}'} - Estado (UF)</li>
                      <li>${'{investidor.comissao}'} - Taxa de comissão (%)</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                      <span className="p-1 bg-blue-100 rounded">Contrato</span>
                      Dados do Contrato
                    </p>
                    <ul className="grid grid-cols-1 gap-2 text-gray-600 pl-4">
                      <li>${'{contrato.inicio}'} - Data de início</li>
                      <li>${'{contrato.fim}'} - Data de término</li>
                      <li>${'{contrato.diaria}'} - Valor da diária</li>
                      <li>${'{contrato.total}'} - Valor total do contrato</li>
                      <li>${'{contrato.caucao}'} - Valor da caução</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedTemplate(null);
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
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}