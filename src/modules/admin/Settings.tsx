
import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../../services/storageService';
import { backupService } from '../../services/backupService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CanPriceConfig, Bank } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import { Save, History, TrendingUp, AlertTriangle, Download, LogOut, Database, Building2, Plus, Trash2, Landmark, Upload } from 'lucide-react';

export const Settings: React.FC = () => {
  const [prices, setPrices] = useState<CanPriceConfig[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [newValue, setNewValue] = useState<number>(0);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const bankScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigate History Table
      if (prices.length > 0) {
        if (e.key === 'ArrowDown') {
          setSelectedHistoryIndex(prev => Math.min(prices.length - 1, prev + 1));
          historyScrollRef.current?.scrollBy({ top: 40, behavior: 'smooth' });
        }
        if (e.key === 'ArrowUp') {
          setSelectedHistoryIndex(prev => Math.max(0, prev - 1));
          historyScrollRef.current?.scrollBy({ top: -40, behavior: 'smooth' });
        }
      }

      // Navigate Banks (Alt + Arrows for secondary list)
      if (banks.length > 0 && e.altKey) {
        if (e.key === 'ArrowDown') {
          setSelectedBankIndex(prev => Math.min(banks.length - 1, prev + 1));
          bankScrollRef.current?.scrollBy({ top: 40, behavior: 'smooth' });
        }
        if (e.key === 'ArrowUp') {
          setSelectedBankIndex(prev => Math.max(0, prev - 1));
          bankScrollRef.current?.scrollBy({ top: -40, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prices.length, banks.length]);

  const loadData = async () => {
    try {
      const [priceData, bankData] = await Promise.all([
        storage.getPrices(),
        storage.getBanks()
      ]);
      setPrices(priceData.sort((a, b) => b.data_inicio_vigencia.localeCompare(a.data_inicio_vigencia)));
      setBanks(bankData);
    } catch (error) {
      showToast('Falha ao carregar dados operacionais.', 'error');
    }
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(newValue) || newValue <= 0) {
      showToast('Insira um valor válido maior que zero.', 'error');
      return;
    }

    const config: CanPriceConfig = {
      id: Math.random().toString(36).substr(2, 9),
      valor_lata: newValue,
      data_inicio_vigencia: newDate
    };

    try {
      await storage.savePrice(config);
      await loadData();
      setNewValue(0);
      showToast('Configuração atualizada com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao persistir novo valor.', 'error');
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;

    try {
      await storage.saveBank({ nome: newBankName.trim(), codigo: newBankCode.trim() });
      setNewBankName('');
      setNewBankCode('');
      await loadData();
      showToast('Instituição bancária adicionada.', 'success');
    } catch (error) {
      showToast('Erro ao cadastrar banco.', 'error');
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Excluir este banco permanentemente?')) return;
    try {
      await storage.deleteBank(id);
      await loadData();
      showToast('Banco removido do sistema.', 'success');
    } catch (error) {
      showToast('Erro ao remover banco.', 'error');
    }
  };

  const handleDeletePrice = async (id: string) => {
    if (!confirm('Excluir esta configuração de preço permanentemente?')) return;
    try {
      await storage.deletePrice(id);
      await loadData();
      showToast('Configuração de preço removida com sucesso.', 'success');
    } catch (error) {
      showToast('Erro ao remover preço.', 'error');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: Restaurar o backup irá sobrescrever dados com o mesmo ID no banco de dados. Deseja continuar?')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          let result = await backupService.importDataJSON(content);
          
          if (!result.success && result.error === 'PASSWORD_REQUIRED') {
            const password = prompt('Este arquivo de backup está protegido por senha de segurança. Por favor, insira a senha para restaurá-lo:');
            if (password === null) {
              setIsRestoring(false);
              e.target.value = '';
              return;
            }
            result = await backupService.importDataJSON(content, password);
          }

          if (result.success) {
            showToast('Backup restaurado e dados atualizados com sucesso!', 'success');
            await loadData();
          } else {
            throw new Error(result.error);
          }
        } catch (err: any) {
          showToast('Erro ao importar arquivo: ' + err.message, 'error');
        } finally {
          setIsRestoring(false);
          e.target.value = '';
        }
      };
      reader.readAsText(file);
    } catch (error: any) {
      showToast('Falha na leitura do arquivo.', 'error');
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const encrypt = confirm('Deseja proteger o arquivo de backup com uma senha de segurança (Altamente recomendado para proteger CPFs e dados bancários)?');
      let password = undefined;
      
      if (encrypt) {
        password = prompt('Defina uma senha forte para encriptar este backup (guarde bem esta senha!):');
        if (!password) {
          showToast('Backup cancelado. A senha é obrigatória para gerar arquivos protegidos.', 'warning');
          setIsBackingUp(false);
          return;
        }
      }

      const result = await backupService.exportDataJSON(password);
      if (result.success) {
        showToast('Backup gerado e baixado com sucesso!', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showToast('Erro no backup: ' + error.message, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="h-auto min-h-full md:h-full flex flex-col space-y-2 animate-in fade-in duration-700 overflow-visible md:overflow-hidden pb-10 md:pb-2 outline-none" tabIndex={0}>
      {/* Header Section - ULTRA COMPACT */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 bg-white p-3 rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-dark tracking-tight leading-none uppercase italic">AJUSTES <span className="text-primary not-italic">SISTEMA</span></h1>
            <p className="text-secondary/40 font-bold text-[8px] uppercase tracking-widest mt-0.5">Painel Administrativo Unificado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleBackup}
            disabled={isBackingUp || isRestoring}
            className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-primary hover:text-white transition-all disabled:opacity-50 border border-primary/10 group shadow-sm"
          >
            <Download className={`${isBackingUp ? "animate-bounce" : "group-hover:-translate-y-0.5"} w-3 h-3 transition-transform`} />
            {isBackingUp ? 'Processando...' : 'Backup'}
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isBackingUp || isRestoring}
            className="flex items-center gap-2 px-4 py-2 bg-accent/5 text-accent rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-accent hover:text-white transition-all disabled:opacity-50 border border-accent/10 group shadow-sm"
          >
            <Upload className={`${isRestoring ? "animate-bounce" : "group-hover:-translate-y-0.5"} w-3 h-3 transition-transform`} />
            {isRestoring ? 'Processando...' : 'Restaurar'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleRestore} 
            accept=".json" 
            className="hidden" 
          />

          <button 
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 bg-danger/5 text-danger rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-danger hover:text-white transition-all border border-danger/10 shadow-sm"
          >
            <LogOut className="w-3 h-3" />
            Sair
          </button>
        </div>
      </div>

      {/* Content Area - SMART RESPONSIVE GRID */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-visible lg:overflow-hidden no-scrollbar pr-1">
        
        {/* LEFT COLUMN: Price Config + History */}
        <div className="lg:col-span-7 flex flex-col gap-2 min-h-0 overflow-visible lg:overflow-hidden">
          {/* Price Config - HIGH DENSITY */}
          <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm space-y-3 relative overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black flex items-center gap-2 text-dark uppercase italic">
                <TrendingUp className="w-4 h-4 text-accent" />
                Valor Operacional
              </h2>
              <span className="text-[7px] font-black text-accent bg-accent/5 px-2 py-0.5 rounded-full border border-accent/10 uppercase tracking-tighter italic">Efeito Imediato</span>
            </div>

            <form onSubmit={handleSavePrice} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-4 space-y-0.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-secondary/40 px-1">Valor p/ Lata (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={newValue || ''}
                  onChange={(e) => setNewValue(parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-3 text-xl font-black text-primary outline-none transition-all shadow-inner"
                />
              </div>
              <div className="col-span-12 sm:col-span-4 space-y-0.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-secondary/40 px-1">Data de Início</label>
                <input 
                  type="date" 
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-2 text-primary outline-none transition-all font-black text-[10px] shadow-inner h-[42px]"
                />
              </div>
              <div className="col-span-12 sm:col-span-4">
                <button 
                  type="submit"
                  className="w-full !bg-primary !text-white h-[42px] rounded-lg font-black uppercase tracking-widest text-[9px] md:hover:!bg-dark transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 duration-200"
                >
                  <Save className="w-3 h-3" />
                  Atualizar
                </button>
              </div>
            </form>
          </div>

          {/* Price History Table - FLEXIBLE */}
          <div className="flex-1 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 py-3 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-accent" />
                <h2 className="text-[11px] font-black text-dark uppercase italic">Histórico de Preços</h2>
              </div>
              <p className="text-[7px] font-black text-secondary/30 uppercase tracking-widest italic">Setas para navegar</p>
            </div>
            <div 
              ref={historyScrollRef}
              className="flex-1 overflow-y-auto no-scrollbar scroll-smooth"
            >
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-slate-50/50 text-secondary/40 text-[8px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-5 py-2">Início Vigência</th>
                    <th className="px-5 py-2 text-right">Valor por Lata</th>
                    <th className="px-5 py-2 text-right">Status</th>
                    <th className="px-5 py-2 text-right w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {prices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[9px] font-black text-secondary/20 uppercase tracking-widest italic">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : prices.map((p, idx) => (
                    <tr 
                      key={p.id} 
                      className={`transition-colors group ${selectedHistoryIndex === idx ? 'bg-primary/5' : 'hover:bg-slate-50/30'}`}
                    >
                      <td className="px-5 py-2">
                        <span className={`font-black text-[10px] ${selectedHistoryIndex === idx ? 'text-primary' : 'text-dark'}`}>
                          {formatDate(p.data_inicio_vigencia)}
                        </span>
                      </td>
                      <td className="px-5 py-2 text-right">
                        <span className="text-sm font-black text-primary tracking-tighter">{formatCurrency(p.valor_lata)}</span>
                      </td>
                      <td className="px-5 py-2 text-right">
                        <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-success/10 text-success' : 'bg-secondary/5 text-secondary/30'}`}>
                          {idx === 0 ? 'Vigente' : 'Antigo'}
                        </span>
                      </td>
                      <td className="px-5 py-2 text-right">
                        {idx !== 0 && (
                          <button 
                            onClick={() => handleDeletePrice(p.id)}
                            className="p-1 text-secondary/20 hover:text-danger hover:bg-danger/5 rounded-md transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Banks */}
        <div className="lg:col-span-5 flex flex-col gap-2 min-h-0 overflow-visible lg:overflow-hidden">
          <div className="flex-1 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-col space-y-3 overflow-visible lg:overflow-hidden min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-accent" />
                <h2 className="text-[11px] font-black text-dark uppercase italic">Bancos Habilitados</h2>
              </div>
              <p className="text-[7px] font-black text-secondary/30 uppercase tracking-widest italic">Alt + Setas</p>
            </div>

            <form onSubmit={handleAddBank} className="flex flex-col md:grid md:grid-cols-12 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-full md:col-span-7">
                <input 
                  type="text" 
                  required
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Nome do Banco"
                  className="w-full bg-white border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-3 text-[10px] font-black text-primary outline-none transition-all shadow-sm h-[42px] md:h-auto"
                />
              </div>
              <div className="w-full md:col-span-3">
                <input 
                  type="text" 
                  value={newBankCode}
                  onChange={(e) => setNewBankCode(e.target.value)}
                  placeholder="Cód"
                  className="w-full bg-white border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-2 text-[10px] font-black text-primary outline-none transition-all shadow-sm text-center h-[42px] md:h-auto"
                />
              </div>
              <div className="w-full md:col-span-2">
                <button 
                  type="submit"
                  className="w-full h-[42px] md:h-full !bg-primary !text-white rounded-lg font-black flex items-center justify-center gap-2 md:hover:!bg-dark hover:scale-[1.02] md:hover:scale-100 active:scale-95 duration-200 transition-all shadow-sm text-[10px] uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" />
                  <span className="md:hidden">Salvar Novo Banco</span>
                </button>
              </div>
            </form>

            <div 
              ref={bankScrollRef}
              className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1 scroll-smooth"
            >
              {banks.length === 0 ? (
                <div className="py-12 text-center text-[9px] font-black text-secondary/20 uppercase tracking-widest italic">
                  Nenhum banco cadastrado
                </div>
              ) : banks.map((bank, idx) => (
                <div 
                  key={bank.id} 
                  className={`p-2.5 rounded-lg border flex items-center justify-between group transition-all ${selectedBankIndex === idx ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-slate-50/50 border-transparent hover:border-primary/10 hover:bg-white'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm border border-slate-100">
                      <Building2 className={`w-3.5 h-3.5 ${selectedBankIndex === idx ? 'text-primary' : 'text-primary/30'}`} />
                    </div>
                    <div>
                      <p className={`font-black uppercase tracking-tight leading-none text-[10px] ${selectedBankIndex === idx ? 'text-primary' : 'text-dark'}`}>{bank.nome}</p>
                      {bank.codigo && <p className="text-[7px] font-black text-secondary/30 mt-0.5 tracking-widest uppercase">Cód: {bank.codigo}</p>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteBank(bank.id)}
                    className="p-1 text-secondary/20 hover:text-danger hover:bg-danger/5 rounded-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
