import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../../services/storageService';
import { Collaborator, CollaboratorStatus, Bank, HarvestLog } from '../../types';
import { getWeekRange } from '../../utils/dateUtils';
import { Plus, Search, Edit2, AlertCircle, X, User, Fingerprint, Landmark, ChevronDown, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Collaborators: React.FC = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [weeklyHarvests, setWeeklyHarvests] = useState<HarvestLog[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isBankModalOpen, setBankModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [cpfValue, setCpfValue] = useState('');

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    let sum = 0;
    let rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const activeRow = document.getElementById(`collab-row-${activeIndex}`);
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [activeIndex]);

  const loadData = async () => {
    const currentWeekId = getWeekRange().id;
    const [collabData, bankData, currentWeekHarvests] = await Promise.all([
      storage.getCollaborators(),
      storage.getBanks(),
      storage.getHarvestsByWeek(currentWeekId)
    ]);
    
    setCollaborators(collabData);
    setBanks(bankData);
    setWeeklyHarvests(currentWeekHarvests);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cpf = formData.get('cpf') as string;

    if (!validateCPF(cpf)) {
      setError('CPF inválido. Por favor, verifique os números.');
      return;
    }

    const existing = collaborators.find(c => c.cpf === cpf && c.id !== (editingCollab?.id || ''));
    if (existing) {
      setError('Este CPF já está cadastrado.');
      return;
    }

    const getNextSequentialId = () => {
      const numericIds = collaborators
        .map(c => parseInt(c.id))
        .filter(id => !isNaN(id));
      const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
      return (maxId + 1).toString();
    };

    const collab: Collaborator = {
      id: editingCollab?.id || getNextSequentialId(),
      nome: formData.get('nome') as string,
      cpf,
      banco: formData.get('banco') as string,
      agencia: formData.get('agencia') as string,
      conta: formData.get('conta') as string,
      tipo_conta: formData.get('tipo_conta') as string,
      status: editingCollab?.status || CollaboratorStatus.ACTIVE,
      data_cadastro: editingCollab?.data_cadastro || new Date().toISOString()
    };

    try {
      await storage.saveCollaborator(collab);
      await loadData();
      setModalOpen(false);
      setEditingCollab(null);
      setSelectedBank('');
      setError('');
      showToast(editingCollab ? 'Colaborador atualizado!' : 'Novo colaborador cadastrado!', 'success');
    } catch (err: any) {
      setError(err.message);
    }
  };


   const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return collaborators
      .filter(c => {
        if (!term) return true;
        const termDigits = term.replace(/\D/g, '');
        return (
          (c.nome?.toLowerCase().startsWith(term) ?? false) ||
          (c.id?.toLowerCase().startsWith(term) ?? false) ||
          (termDigits !== '' && (c.cpf?.replace(/\D/g, '').startsWith(termDigits) ?? false))
        );
      })
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [collaborators, searchTerm]);

  return (
    <div className="h-auto min-h-full md:h-full flex flex-col space-y-4 animate-in fade-in duration-700 overflow-visible md:overflow-hidden pb-10 md:pb-0">
      {/* Header Section - Otimizado para bater com Lançar Colheita */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="space-y-0">
          <div className="flex items-center gap-2">
             <span className="px-1.5 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-full">Gestão</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-dark tracking-tight leading-none uppercase italic">COLABORADORES</h1>
          <p className="text-secondary/60 font-medium text-[10px]">Gerenciamento de colaboradores</p>
        </div>
        <button
          onClick={() => { 
            setEditingCollab(null); 
            setIsReadOnly(false); 
            setCpfValue('');
            setSelectedBank('');
            setModalOpen(true); 
          }}
          className="!bg-primary !text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:!bg-dark transition-all active:scale-95 shadow-lg shadow-primary/20 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Novo Colaborador
        </button>
      </div>

      {/* Main Table Container - Occupies remaining space */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-100/50 shadow-premium overflow-visible md:overflow-hidden group flex flex-col min-h-0 lg:overflow-hidden">
        {/* Search Bar - Fixed part of the table container */}
        <div className="p-4 border-b border-slate-50 flex items-center gap-4 bg-background/30 flex-shrink-0">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 text-secondary/30">
             <Search className="w-5 h-5" />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-0 pointer-events-none flex items-center px-4 font-black text-lg uppercase z-20 tracking-tight">
              <span className="text-transparent whitespace-pre">{searchTerm}</span>
              {searchTerm && filtered.length > 0 && (
                <span className="text-primary/25 whitespace-pre">
                  {(() => {
                    const current = filtered[activeIndex] || filtered[0];
                    if (!current || !current.nome || !current.id) return '';
                    const suggestion = `${current.nome} (ID: ${current.id})`;
                    if (suggestion.toLowerCase().startsWith(searchTerm.toLowerCase())) {
                      return suggestion.substring(searchTerm.length);
                    }
                    return '';
                  })()}
                </span>
              )}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Pesquisar por nome, CPF ou ID..."
              className="bg-white border-2 border-primary focus:ring-0 w-full text-lg font-black text-primary placeholder:text-primary/10 uppercase tracking-tight rounded-xl px-4 py-2 shadow-sm relative z-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveIndex(0);
              }}
              onWheel={(e) => {
                if (filtered.length > 0) {
                  if (e.deltaY > 0) {
                    setActiveIndex(prev => Math.max(0, Math.min(prev + 1, filtered.length - 1)));
                  } else {
                    setActiveIndex(prev => Math.max(0, Math.min(prev - 1, filtered.length - 1)));
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex(prev => Math.max(0, Math.min(prev + 1, filtered.length - 1)));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex(prev => Math.max(0, Math.min(prev - 1, filtered.length - 1)));
                }
                if (e.key === 'Enter' && searchTerm && filtered.length > 0) {
                  e.preventDefault();
                  const current = filtered[activeIndex];
                  setEditingCollab(current);
                  setIsReadOnly(true);
                  setCpfValue(current.cpf);
                  setSelectedBank(current.banco);
                  setModalOpen(true);
                }
                if ((e.key === 'Tab' || e.key === 'ArrowRight') && searchTerm && filtered.length > 0) {
                  const current = filtered[activeIndex];
                  const suggestion = `${current.nome} (ID: ${current.id})`;
                  if (suggestion.toLowerCase().startsWith(searchTerm.toLowerCase())) {
                    e.preventDefault();
                    setSearchTerm(current.nome);
                  }
                }
              }}
            />
          </div>
        </div>

        {/* List Header - Fixed */}
        <div className="hidden md:flex px-4 py-2.5 bg-primary border-b border-white/10 items-center text-[10px] font-black uppercase tracking-widest text-white sticky top-0 z-30 shadow-md">
          <div className="flex-[1.5] px-8">Informações Pessoais</div>
          <div className="flex-[1.5] px-8">Dados Bancários</div>
          <div className="w-32 px-8 text-center">Status</div>
          <div className="w-40 px-8 text-right">Ações</div>
        </div>

        {/* List - Scrollable area */}
        <div 
          className="flex-1 overflow-visible md:overflow-y-auto overscroll-contain no-scrollbar min-h-0 p-3 space-y-2 bg-slate-50/30"
          onWheel={(e) => {
            if (filtered.length > 0) {
              e.preventDefault();
              if (e.deltaY > 0) {
                setActiveIndex(prev => Math.max(0, Math.min(prev + 1, filtered.length - 1)));
              } else {
                setActiveIndex(prev => Math.max(0, Math.min(prev - 1, filtered.length - 1)));
              }
            }
          }}
        >
          {filtered.map((c, index) => (
            <div 
              key={c.id} 
              id={`collab-row-${index}`}
              onClick={() => { setActiveIndex(index); searchInputRef.current?.focus(); }}
              className={`flex flex-col md:flex-row md:items-center p-1.5 rounded-[18px] border-2 transition-all duration-200 cursor-pointer group relative ${
                activeIndex === index 
                ? 'border-primary bg-white shadow-lg shadow-primary/10 z-10' 
                : 'border-white bg-white hover:border-primary/20 hover:shadow-md'
              }`}
            >
              {/* Informações Pessoais */}
              <div className="flex-[1.5] px-4 md:px-8 py-1">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${activeIndex === index ? 'bg-primary text-white' : 'bg-slate-50 text-secondary/30 group-hover:text-primary'}`}>
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="font-black text-dark text-[13px] uppercase tracking-tight leading-none">{c.nome}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-dark uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ID: {c.id}</span>
                      <span className="text-[10px] font-mono font-black tracking-wider text-dark">{c.cpf}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados Bancários */}
              <div className="flex-[1.5] px-4 md:px-8 py-1 border-t md:border-t-0 md:border-l border-slate-50">
                <div className="flex items-center gap-3 text-dark/80">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                    <Landmark className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <div className="font-black text-dark uppercase tracking-tight leading-none text-[13px]">{c.banco}</div>
                    <div className="text-[9px] font-black text-dark mt-1 uppercase tracking-widest flex items-center gap-2">
                      {c.agencia} • {c.conta} 
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full italic text-[8px] border border-slate-200 text-dark/80">{c.tipo_conta}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="w-full md:w-32 px-4 md:px-8 py-2 md:py-1 text-center border-t md:border-t-0 md:border-l border-slate-50">
                {(() => {
                  const isActive = weeklyHarvests.some(h => h.colaborador_id === c.id);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] ${isActive
                      ? 'bg-success/10 text-success border border-success/10'
                      : 'bg-secondary/5 text-secondary/40 border border-slate-100'
                      }`}>
                      <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-secondary/30'}`} />
                      {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  );
                })()}
              </div>

              {/* Ações */}
              <div className="w-full md:w-44 px-4 md:px-6 py-1 text-right border-t md:border-t-0 md:border-l border-slate-50">
                <div className="flex justify-center md:justify-end gap-1.5 transition-all">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingCollab(c); setIsReadOnly(false); setCpfValue(c.cpf); setSelectedBank(c.banco); setModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 !bg-primary !text-white hover:!bg-dark rounded-lg transition-all active:scale-90 shadow-lg shadow-primary/20"
                  >
                    <Edit2 className="w-3.5 h-3.5 !text-white" />
                    <span className="text-[10px] font-black uppercase tracking-tighter !text-white">Editar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {searchTerm && filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="bg-danger/5 border border-danger/10 rounded-3xl p-8 max-w-sm mx-auto space-y-4 animate-in zoom-in-95 duration-300 shadow-xl shadow-danger/5">
                <div className="space-y-1">
                  <p className="text-sm font-black text-danger uppercase tracking-widest">Colaborador Não Encontrado</p>
                  <p className="text-[10px] font-black text-secondary/60 uppercase tracking-tight">Deseja cadastrar novo agora?</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setEditingCollab(null); setIsReadOnly(false); setCpfValue(''); setSelectedBank(''); setModalOpen(true); }}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/25"
                  >
                    Sim, Cadastrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="bg-white text-secondary/60 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 border border-white/20 flex flex-col overflow-hidden my-auto">
            <div className="p-5 pb-3 flex items-center justify-between bg-white border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-dark tracking-tight leading-none uppercase italic">
                  {isReadOnly ? 'Ficha do' : (editingCollab ? 'Editar' : 'Novo')} <span className="text-primary not-italic">Colaborador</span>
                </h2>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 bg-slate-50 rounded-xl text-secondary/30 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 pt-4 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
               <form onSubmit={handleSave} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-3 bg-danger/5 text-danger p-3 rounded-xl border border-danger/10 text-[9px] font-black uppercase tracking-tight">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editingCollab && (
                    <div className="md:col-span-2 space-y-1 group opacity-60">
                      <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">ID Interno</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                        <input 
                          disabled
                          value={editingCollab.id} 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-10 text-secondary/40 font-black text-sm outline-none cursor-not-allowed" 
                        />
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                      <input 
                        name="nome" 
                        required 
                        disabled={isReadOnly}
                        defaultValue={editingCollab?.nome} 
                        className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-10 text-primary outline-none transition-all font-black text-sm placeholder:text-primary/10 shadow-sm disabled:opacity-70" 
                        placeholder="Ex: João da Silva"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">CPF</label>
                    <input 
                      name="cpf" 
                      required 
                      disabled={isReadOnly}
                      value={cpfValue}
                      onChange={(e) => setCpfValue(formatCPF(e.target.value))}
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm font-mono shadow-sm disabled:opacity-70"
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Banco</label>
                    <div className="relative">
                       <select 
                        name="banco" 
                        required 
                        disabled={isReadOnly}
                        value={selectedBank}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OUTRO') {
                            setBankModalOpen(true);
                          } else {
                            setSelectedBank(val);
                          }
                        }}
                        className="w-full appearance-none bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm cursor-pointer shadow-sm disabled:opacity-70"
                      >
                        <option value="">Selecione</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.nome}>{b.nome}</option>
                        ))}
                        <option value="OUTRO" className="font-black text-accent bg-slate-50">+ OUTRO (CADASTRAR NOVO)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Agência</label>
                    <input 
                      name="agencia" 
                      required 
                      disabled={isReadOnly}
                      defaultValue={editingCollab?.agencia} 
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm shadow-sm disabled:opacity-70"
                      placeholder="0000"
                    />
                  </div>

                  <div className="space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Conta</label>
                    <input 
                      name="conta" 
                      required 
                      disabled={isReadOnly}
                      defaultValue={editingCollab?.conta} 
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm font-mono shadow-sm disabled:opacity-70"
                      placeholder="00000-0"
                    />
                  </div>

                  <div className="space-y-1 group md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Tipo da Conta</label>
                    <div className="relative">
                      <select 
                        name="tipo_conta" 
                        required 
                        disabled={isReadOnly}
                        defaultValue={editingCollab?.tipo_conta || 'corrente'} 
                        className="w-full appearance-none bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm shadow-sm disabled:opacity-70"
                      >
                        <option value="corrente">Conta Corrente</option>
                        <option value="poupanca">Conta Poupança</option>
                        <option value="salario">Conta Salário</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setModalOpen(false)} 
                    className="flex-1 !bg-primary !text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:!bg-dark transition-all shadow-lg shadow-primary/20"
                  >
                    Fechar
                  </button>
                  
                  {isReadOnly ? (
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsReadOnly(false);
                      }}
                      className="flex-1 !bg-primary !text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:!bg-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                  ) : (
                    <button 
                      type="submit"
                      className="flex-1 !bg-primary !text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:!bg-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Bank Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-dark/40 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border border-white/20 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-dark uppercase tracking-tight italic">Cadastrar <span className="text-primary not-italic">Novo Banco</span></h3>
              <button onClick={() => setBankModalOpen(false)} className="p-2 bg-slate-50 rounded-xl text-secondary/30 hover:text-danger transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const nome = formData.get('nome_banco') as string;
                  const codigo = formData.get('codigo_banco') as string;

                  try {
                    const newBank: Partial<Bank> = {
                      nome: nome.toUpperCase(),
                      codigo
                    };
                    await storage.saveBank(newBank);
                    await loadData();
                    setSelectedBank(nome.toUpperCase());
                    setBankModalOpen(false);
                    showToast('Novo banco cadastrado e selecionado!', 'success');
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark/70 px-1">Nome do Banco</label>
                  <input 
                    name="nome_banco"
                    required
                    placeholder="Ex: NUBANK"
                    className="w-full bg-white border-2 border-primary rounded-xl py-2 px-4 text-primary font-black text-sm outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark/70 px-1">Código (Opcional)</label>
                  <input 
                    name="codigo_banco"
                    placeholder="Ex: 260"
                    className="w-full bg-white border-2 border-primary rounded-xl py-2 px-4 text-primary font-black text-sm outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setBankModalOpen(false)} className="flex-1 !bg-primary !text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:!bg-dark transition-all shadow-lg shadow-primary/20">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 !bg-primary !text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl shadow-lg shadow-primary/20 hover:!bg-dark transition-all">
                    Salvar Banco
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
