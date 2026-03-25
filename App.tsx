import React, { useState, useRef } from 'react';
import { 
  Truck, 
  FileText, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Database,
  History,
  Settings,
  LayoutDashboard,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// Mock data for initial UI
const INITIAL_FORM_STATE = {
  placa: '',
  motorista: '',
  pesoBruto: '',
  pesoLiquido: '',
  material: '',
  origem: '',
  destino: '',
  data: '',
};

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [extractedData, setExtractedData] = useState(INITIAL_FORM_STATE);
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const fileToGenerativePart = async (file: File) => {
    return new Promise<{ inlineData: { data: string, mimeType: string } }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractDataWithAI = async (file: File) => {
    try {
      addLog("Iniciando processamento com IA...");
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        throw new Error("API Key do Gemini não configurada. Por favor, configure-a no painel de Secrets.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      const filePart = await fileToGenerativePart(file);
      
      const prompt = `Analise este documento de transporte de minério (PDF ou Imagem) e extraia as seguintes informações em formato JSON:
      - placa: Placa do veículo
      - motorista: Nome do motorista
      - pesoBruto: Peso bruto total
      - pesoLiquido: Peso líquido da carga
      - material: Tipo de material transportado
      - origem: Local de origem/mina
      - destino: Local de destino/porto
      - data: Data da carga/emissão
      
      Retorne APENAS o JSON, sem markdown ou explicações. Se não encontrar um campo, deixe vazio.`;

      const response = await ai.models.generateContent({
        model,
        contents: { parts: [filePart, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              placa: { type: Type.STRING },
              motorista: { type: Type.STRING },
              pesoBruto: { type: Type.STRING },
              pesoLiquido: { type: Type.STRING },
              material: { type: Type.STRING },
              origem: { type: Type.STRING },
              destino: { type: Type.STRING },
              data: { type: Type.STRING },
            },
            required: ["placa", "motorista", "pesoBruto", "pesoLiquido", "material", "origem", "destino", "data"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        setExtractedData(data);
        setStep('review');
        addLog("Dados extraídos com sucesso pela IA!");
      } else {
        throw new Error("A IA não retornou dados válidos.");
      }
    } catch (err: any) {
      console.error("Erro na extração:", err);
      const errorMessage = err.message || "Falha ao extrair dados do documento.";
      setError(errorMessage);
      addLog("Erro na extração de dados.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    addLog(`Arquivo recebido: ${file.name}`);
    
    extractDataWithAI(file);
  };

  const handleFinalSubmit = () => {
    setIsProcessing(true);
    addLog("Preenchendo sistema legado...");
    
    setTimeout(() => {
      addLog("Validando campos obrigatórios...");
      setTimeout(() => {
        addLog("Protocolo gerado: #RPA-" + Math.floor(Math.random() * 10000));
        setHistory(prev => [{ ...extractedData, id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString() }, ...prev]);
        setIsProcessing(false);
        setStep('success');
      }, 1500);
    }, 1500);
  };

  const reset = () => {
    setStep('upload');
    setExtractedData(INITIAL_FORM_STATE);
    setLogs([]);
    setError(null);
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">MinérioRPA</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <SidebarItem icon={<History size={20} />} label="Histórico" />
          <SidebarItem icon={<Database size={20} />} label="Integrações" />
          <SidebarItem icon={<Settings size={20} />} label="Configurações" />
        </nav>

        <div className="mt-auto bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-2 uppercase font-semibold tracking-wider">Status do Robô</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Operacional</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Automação de Carga</h2>
            <p className="text-slate-500">Extração e preenchimento automático de documentos</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">Guilherme Pires</p>
              <p className="text-xs text-slate-500">Operador Logístico</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold">
              GP
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* RPA Workflow Area */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              {step === 'upload' && (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center"
                >
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Upload className="w-10 h-10 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Capturar Documento</h3>
                    <p className="text-slate-500 mb-8">
                      Arraste o PDF da transportadora ou tire uma foto do ticket de balança para iniciar o processamento.
                    </p>

                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                        <XCircle size={18} />
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all group disabled:opacity-50"
                      >
                        <FileText className="w-8 h-8 text-slate-400 group-hover:text-orange-500" />
                        <span className="font-medium text-slate-600 group-hover:text-orange-700">Upload PDF</span>
                      </button>
                      <button 
                        disabled={isProcessing}
                        className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all group disabled:opacity-50"
                      >
                        <Camera className="w-8 h-8 text-slate-400 group-hover:text-orange-500" />
                        <span className="font-medium text-slate-600 group-hover:text-orange-700">Tirar Foto</span>
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".pdf,image/*" 
                      onChange={handleFileUpload}
                    />
                  </div>
                </motion.div>
              )}

              {step === 'review' && (
                <motion.div 
                  key="review"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-6 border-bottom border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <CheckCircle2 className="text-green-500" /> Revisão de Dados Extraídos
                    </h3>
                    <span className="text-xs font-mono bg-orange-100 text-orange-700 px-2 py-1 rounded">Confiança: 98%</span>
                  </div>
                  
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Placa do Veículo" value={extractedData.placa} />
                    <FormField label="Motorista" value={extractedData.motorista} />
                    <FormField label="Peso Bruto" value={extractedData.pesoBruto} />
                    <FormField label="Peso Líquido" value={extractedData.pesoLiquido} />
                    <FormField label="Material" value={extractedData.material} />
                    <FormField label="Origem" value={extractedData.origem} />
                    <FormField label="Destino" value={extractedData.destino} />
                    <FormField label="Data da Carga" value={extractedData.data} />
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      onClick={reset}
                      className="px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleFinalSubmit}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                      Confirmar e Enviar ao Sistema
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center"
                >
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Processo Concluído!</h3>
                  <p className="text-slate-500 mb-8">
                    Os dados foram inseridos com sucesso no sistema de gestão.
                  </p>
                  <button 
                    onClick={reset}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                  >
                    Nova Automação
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Truck Animation / Visual */}
            <div className="relative h-32 bg-slate-900 rounded-2xl overflow-hidden flex items-center p-8">
              <div className="absolute inset-0 opacity-10">
                <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              </div>
              
              <motion.div 
                animate={{ 
                  x: isProcessing ? [0, 10, 0] : 0,
                  transition: { repeat: Infinity, duration: 0.5 }
                }}
                className="relative z-10 flex items-center gap-4 text-white"
              >
                <div className="bg-orange-500 p-3 rounded-xl shadow-lg shadow-orange-500/20">
                  <Truck size={32} />
                </div>
                <div>
                  <h4 className="font-bold">Status do Fluxo</h4>
                  <p className="text-sm text-slate-400">
                    {isProcessing ? 'Processando carga...' : 'Aguardando novo documento'}
                  </p>
                </div>
              </motion.div>

              {isProcessing && (
                <motion.div 
                  initial={{ x: -100 }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute bottom-4 left-0 h-1 bg-orange-500 w-32 blur-sm"
                />
              )}
            </div>

            {/* Legacy System Preview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2 text-slate-700">
                  <Database size={18} className="text-slate-400" /> Prévia do Sistema Legado
                </h3>
                <span className="text-[10px] font-mono text-slate-400">SAP-INTEGRATION-v4.2</span>
              </div>
              <div className="grid grid-cols-3 gap-2 opacity-50 grayscale">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
              {step === 'success' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 font-mono"
                >
                  &gt; Dados inseridos com sucesso no formulário de entrada.
                </motion.div>
              )}
            </div>

            {/* Recent History List */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700">
                <History size={18} className="text-slate-400" /> Atividades Recentes
              </h3>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400 italic">Nenhuma carga processada nesta sessão.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                          <Truck size={14} className="text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{item.placa}</p>
                          <p className="text-[10px] text-slate-500">{item.motorista} • {item.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-600">{item.pesoLiquido}</p>
                        <span className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">Sincronizado</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Activity & Logs */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" /> Logs em Tempo Real
              </h3>
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Nenhuma atividade recente.</p>
                ) : (
                  logs.map((log, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs font-mono p-2 bg-slate-50 rounded border-l-2 border-orange-400 text-slate-600"
                    >
                      [{new Date().toLocaleTimeString()}] {log}
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
              <h3 className="font-bold mb-4">Métricas de Hoje</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase mb-1">Cargas</p>
                  <p className="text-2xl font-bold">{24 + history.length}</p>
                </div>
                <div className="p-4 bg-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase mb-1">Economia</p>
                  <p className="text-2xl font-bold text-green-400">{(4.2 + (history.length * 0.15)).toFixed(1)}h</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <p className="text-xs text-orange-400 font-medium">Dica do Robô</p>
                <p className="text-sm">Fotos com boa iluminação aumentam a precisão em 15%.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function FormField({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700">
        {value || <span className="text-slate-300 italic">Aguardando...</span>}
      </div>
    </div>
  );
}
