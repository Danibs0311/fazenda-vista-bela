import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../../services/storageService';
import { backupService } from '../../services/backupService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CanPriceConfig, Bank } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import { Save, History, TrendingUp, AlertTriangle, Download, LogOut, Database, Building2, Plus, Trash2, Landmark, Upload, Users, UserPlus, Shield, Eye, Edit3, CheckCircle2, XCircle } from 'lucide-react';
import { supabaseAdmin } from '../../services/supabaseAdmin';
import { supabase } from '../../services/supabase';

export const Settings: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'operacao' | 'equipe'>('operacao');

  // Operação Tab States
  const [prices, setPrices] = useState<CanPriceConfig[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [newValue, setNewValue] = useState<number>(0);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Equipe Tab States
  const [users, setUsers] = useState<any[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserCpf, setNewUserCpf] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'cabo'>('cabo');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Edit User States
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserRole, setEditingUserRole] = useState<'admin' | 'cabo'>('cabo');
  const [isEditUserModalOpen, setEditUserModalOpen] = useState(false);

  const { signOut } = useAuth();
  const { showToast } = useToast();

  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const bankScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    loadUsers();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'operacao') return;

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
  }, [prices.length, banks.length, activeTab]);

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

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // 1. Fetch profiles from database
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*');
      
      if (pErr) throw pErr;

      // 2. Fetch auth users using service role client
      const { data: { users: authUsers }, error: aErr } = await supabaseAdmin.auth.admin.listUsers();
      if (aErr) throw aErr;

      // Merge data
      const merged = (profiles || []).map((p: any) => {
        const auth = authUsers.find((u: any) => u.id === p.id);
        return {
          id: p.id,
          nome: p.nome,
          role: p.role,
          status: p.status,
          email: auth?.email || '---',
          cpf: auth?.user_metadata?.cpf || '---'
        };
      });

      setUsers(merged);
    } catch (err: any) {
      console.error('Error loading users:', err.message);
      showToast('Erro ao carregar lista de usuários da equipe.', 'error');
    } finally {
      setIsLoadingUsers(false);
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

  // Create Cabo or Admin User Logic
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserCpf.trim()) {
      showToast('Preencha o nome completo e o CPF do usuário.', 'error');
      return;
    }

    const cleanCpf = newUserCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      showToast('O CPF deve conter exatamente 11 dígitos.', 'error');
      return;
    }

    // Generate email automatically: first name in lowercase followed by @fvb.com
    const nameParts = newUserName.trim().split(' ');
    const firstName = nameParts[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    const generatedEmail = `${firstName}@fvb.com`;
    const generatedPassword = cleanCpf; // Password is set to their clean CPF

    try {
      // Check if email already exists
      const emailExists = users.some(u => u.email === generatedEmail);
      if (emailExists) {
        showToast(`O e-mail gerado (${generatedEmail}) já está cadastrado no sistema.`, 'error');
        return;
      }

      showToast('Criando conta do colaborador...', 'success');

      // 1. Create the user in Supabase Auth
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: generatedEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          nome: newUserName.trim().toUpperCase(),
          cpf: cleanCpf,
          role: newUserRole
        }
      });

      if (authErr) throw authErr;

      if (authUser?.user) {
        // 2. Insert profile record in database
        const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
          id: authUser.user.id,
          nome: newUserName.trim().toUpperCase(),
          role: newUserRole,
          status: 'active'
        });

        if (profileErr) {
          // Cleanup auth user on profile insertion failure
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          throw profileErr;
        }

        showToast(`Colaborador cadastrado!\nLogin: ${generatedEmail}\nSenha: ${cleanCpf}`, 'success');
        
        // Reset form
        setNewUserName('');
        setNewUserCpf('');
        setNewUserRole('cabo');
        await loadUsers();
      }
    } catch (err: any) {
      console.error('Error creating user account:', err.message);
      showToast(`Erro ao criar conta de usuário: ${err.message}`, 'error');
    }
  };

  // Toggle user status: Active/Inactive (Soft Delete)
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const msg = newStatus === 'inactive' 
      ? 'Deseja realmente INATIVAR este colaborador? Ele será desconectado e impedido de fazer login imediatamente.' 
      : 'Deseja reativar o acesso deste colaborador?';

    if (!confirm(msg)) return;

    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      showToast(`Colaborador ${newStatus === 'inactive' ? 'inativado' : 'reativado'} com sucesso!`, 'success');
      await loadUsers();
    } catch (err: any) {
      showToast(`Erro ao alterar status da conta: ${err.message}`, 'error');
    }
  };

  // Update user name/role
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUserName.trim()) return;

    try {
      showToast('Salvando alterações...', 'success');
      
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          nome: editingUserName.trim().toUpperCase(),
          role: editingUserRole
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      showToast('Perfil do colaborador atualizado!', 'success');
      setEditUserModalOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      showToast(`Erro ao atualizar perfil: ${err.message}`, 'error');
    }
  };

  // Delete user permanently
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('ATENÇÃO: Deseja realmente EXCLUIR permanentemente este usuário? Isso apagará seu login e perfil permanentemente.')) return;

    try {
      showToast('Excluindo usuário...', 'success');
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      showToast('Usuário excluído permanentemente do sistema.', 'success');
      await loadUsers();
    } catch (err: any) {
      showToast(`Erro ao excluir usuário: ${err.message}`, 'error');
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
            await loadUsers();
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0 bg-white p-3 rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-dark tracking-tight leading-none uppercase italic">AJUSTES <span className="text-primary not-italic">SISTEMA</span></h1>
            <p className="text-secondary/40 font-bold text-[8px] uppercase tracking-widest mt-0.5">Painel Administrativo Unificado</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Switchers */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('operacao')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-[8px] transition-all ${
                activeTab === 'operacao'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-secondary/50 hover:text-primary'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Operação
            </button>
            <button
              onClick={() => setActiveTab('equipe')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-[8px] transition-all ${
                activeTab === 'equipe'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-secondary/50 hover:text-primary'
              }`}
            >
              <Users className="w-3 h-3" />
              Controle da Equipe
            </button>
          </div>

          <button 
            onClick={handleBackup}
            disabled={isBackingUp || isRestoring}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-primary hover:text-white transition-all disabled:opacity-50 border border-primary/10 group shadow-sm cursor-pointer"
          >
            <Download className={`${isBackingUp ? "animate-bounce" : "group-hover:-translate-y-0.5"} w-3 h-3 transition-transform`} />
            Backup
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isBackingUp || isRestoring}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent/5 text-accent rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-accent hover:text-white transition-all disabled:opacity-50 border border-accent/10 group shadow-sm cursor-pointer"
          >
            <Upload className={`${isRestoring ? "animate-bounce" : "group-hover:-translate-y-0.5"} w-3 h-3 transition-transform`} />
            Restaurar
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
            className="flex items-center gap-2 px-3 py-1.5 bg-danger/5 text-danger rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-danger hover:text-white transition-all border border-danger/10 shadow-sm cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            Sair
          </button>
        </div>
      </div>

      {/* Content Area - Operação Tab */}
      {activeTab === 'operacao' ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-visible lg:overflow-hidden no-scrollbar pr-1">
          
          {/* LEFT COLUMN: Price Config + History */}
          <div className="lg:col-span-7 flex flex-col gap-2 min-h-0 overflow-visible lg:overflow-hidden">
            {/* Price Config */}
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
                    className="w-full !bg-primary !text-white h-[42px] rounded-lg font-black uppercase tracking-widest text-[9px] md:hover:!bg-dark transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    Atualizar
                  </button>
                </div>
              </form>
            </div>

            {/* Price History Table */}
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
                              className="p-1 text-secondary/20 hover:text-danger hover:bg-danger/5 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
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
                    className="w-full bg-white border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-3 text-[10px] font-black text-primary outline-none transition-all shadow-sm h-[42px] md:h-auto font-bold uppercase"
                  />
                </div>
                <div className="w-full md:col-span-3">
                  <input 
                    type="text" 
                    value={newBankCode}
                    onChange={(e) => setNewBankCode(e.target.value)}
                    placeholder="Cód"
                    className="w-full bg-white border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-2 text-[10px] font-black text-primary outline-none transition-all shadow-sm text-center h-[42px] md:h-auto font-mono"
                  />
                </div>
                <div className="w-full md:col-span-2">
                  <button 
                    type="submit"
                    className="w-full h-[42px] md:h-full !bg-primary !text-white rounded-lg font-black flex items-center justify-center gap-2 md:hover:!bg-dark hover:scale-[1.02] md:hover:scale-100 active:scale-95 duration-200 transition-all shadow-sm text-[10px] uppercase tracking-widest cursor-pointer"
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
                      className="p-1 text-secondary/20 hover:text-danger hover:bg-danger/5 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Equipe Tab */
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-visible lg:overflow-hidden no-scrollbar pr-1">
          {/* Left Column: Create User Form */}
          <div className="lg:col-span-5 flex flex-col gap-2 min-h-0 overflow-visible lg:overflow-hidden">
            <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm space-y-4 relative overflow-hidden flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-black flex items-center gap-2 text-dark uppercase italic">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Cadastrar Colaborador
                </h2>
                <span className="text-[7px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 uppercase tracking-tighter italic">Auto Credenciais</span>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="space-y-0.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-secondary/40 px-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="EX: JOÃO DA SILVA"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-3 text-xs font-black text-primary outline-none transition-all uppercase shadow-inner"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-secondary/40 px-1">CPF (Senha de Acesso)</label>
                  <input 
                    type="text" 
                    required
                    value={newUserCpf}
                    onChange={(e) => setNewUserCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-3 text-xs font-black text-primary outline-none transition-all font-mono shadow-inner"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-secondary/40 px-1">Nível de Acesso</label>
                  <select 
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-lg py-2 px-3 text-xs font-black text-primary outline-none transition-all cursor-pointer shadow-inner"
                  >
                    <option value="cabo">Cabo de Turma (Lançamentos de Colheita)</option>
                    <option value="admin">Administrador (Acesso Total)</option>
                  </select>
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1">
                  <p className="text-[8px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <AlertTriangle className="w-3.5 h-3.5" /> Geração de Login Automática
                  </p>
                  <p className="text-[9.5px] font-bold text-amber-900/60 leading-normal">
                    Ao salvar, o e-mail será gerado como: <strong className="text-amber-900">
                      {newUserName ? `${newUserName.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')}@fvb.com` : '[primeironome]@fvb.com'}
                    </strong>. A senha inicial será composta apenas pelos dígitos do CPF.
                  </p>
                </div>

                <button 
                  type="submit"
                  className="w-full !bg-primary !text-white h-[42px] rounded-lg font-black uppercase tracking-widest text-[9px] md:hover:!bg-dark transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Colaborador
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: User list */}
          <div className="lg:col-span-7 flex flex-col gap-2 min-h-0 overflow-visible lg:overflow-hidden">
            <div className="flex-1 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="p-4 py-3 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <h2 className="text-[11px] font-black text-dark uppercase italic">Equipe Cadastrada</h2>
                </div>
                <span className="text-[8px] font-black text-secondary/30 uppercase tracking-widest">
                  Total: {users.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5">
                {isLoadingUsers ? (
                  <div className="py-12 text-center text-[10px] font-black text-secondary/40 animate-pulse uppercase">
                    Carregando Equipe...
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-12 text-center text-[9px] font-black text-secondary/20 uppercase tracking-widest italic">
                    Nenhum colaborador registrado na equipe.
                  </div>
                ) : (
                  users.map((u) => (
                    <div 
                      key={u.id}
                      className="p-3 rounded-[20px] bg-slate-50/50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border font-black text-xs ${
                          u.role === 'admin' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' 
                            : 'bg-slate-200/50 border-slate-300/30 text-slate-700'
                        }`}>
                          {u.role === 'admin' ? 'AD' : 'CB'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 leading-none">
                            <span className="font-black text-[11px] text-dark uppercase">{u.nome}</span>
                            <span className={`w-2 h-2 rounded-full ${
                              u.status === 'active' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-rose-500'
                            }`} title={u.status === 'active' ? 'Conta Ativa' : 'Conta Inativa'} />
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 leading-none">
                            <span className="text-[9px] font-black text-secondary/40 font-mono">CPF: {u.cpf}</span>
                            <span className="text-[9px] font-black text-primary/60">{u.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {/* Edit Button */}
                        <button 
                          onClick={() => {
                            setEditingUser(u);
                            setEditingUserName(u.nome);
                            setEditingUserRole(u.role);
                            setEditUserModalOpen(true);
                          }}
                          className="p-1.5 text-secondary/35 hover:text-primary hover:bg-primary/5 rounded-lg transition-all cursor-pointer"
                          title="Editar Cadastro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Status Toggle Button */}
                        <button 
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            u.status === 'active'
                              ? 'text-rose-500 hover:bg-rose-50'
                              : 'text-emerald-500 hover:bg-emerald-50'
                          }`}
                          title={u.status === 'active' ? 'Desativar Conta (Soft Delete)' : 'Reativar Conta'}
                        >
                          {u.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>

                        {/* Permanent Delete Button */}
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-secondary/35 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 border border-white/20 my-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-dark tracking-tight uppercase italic leading-none">
                  Editar <span className="text-primary not-italic">Cadastro</span>
                </h2>
                <p className="text-[8px] font-bold text-secondary/40 uppercase tracking-widest mt-1">Colaborador da Equipe</p>
              </div>
              <button 
                onClick={() => setEditUserModalOpen(false)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-secondary/30 hover:text-primary transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-secondary/40 px-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={editingUserName}
                  onChange={(e) => setEditingUserName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-lg py-2.5 px-4 text-sm font-black text-primary outline-none transition-all uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-secondary/40 px-1">Nível de Acesso</label>
                <select 
                  value={editingUserRole}
                  onChange={(e) => setEditingUserRole(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-lg py-2.5 px-4 text-sm font-black text-primary outline-none transition-all cursor-pointer"
                >
                  <option value="cabo">Cabo de Turma (Lançamentos)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditUserModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-secondary/60 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 !bg-primary !text-white py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:!bg-dark transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
