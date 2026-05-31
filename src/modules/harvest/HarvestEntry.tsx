
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../../services/storageService';
import { Collaborator, HarvestLog, CollaboratorStatus, Bank } from '../../types';
import { getWeekRange, formatCurrency, formatDate } from '../../utils/dateUtils';
import { Search, Save, History, Trash2, Calendar, UserPlus, Pickaxe, ChevronRight, X, ArrowUpRight, Plus, Landmark, User, AlertCircle, Edit2, Download } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const HarvestEntry: React.FC = () => {
  const { showToast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollab, setSelectedCollab] = useState<Collaborator | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recentHarvests, setRecentHarvests] = useState<HarvestLog[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isRegistrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestLog | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isHarvestReadOnly, setIsHarvestReadOnly] = useState(true);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [regError, setRegError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeIndexRecent, setActiveIndexRecent] = useState<number | null>(null);
  const [productionReportDate, setProductionReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [date]);

  useEffect(() => {
    if (activeIndexRecent !== null) {
      const container = document.getElementById('recent-harvests-container');
      const activeRow = document.getElementById(`collab-row-recent-${activeIndexRecent}`);
      
      if (activeRow && container) {
        const rowTop = activeRow.offsetTop;
        const rowHeight = activeRow.offsetHeight;
        const containerHeight = container.clientHeight;
        const currentScroll = container.scrollTop;

        if (rowTop < currentScroll) {
          container.scrollTo({ top: rowTop - 10, behavior: 'smooth' });
        } else if (rowTop + rowHeight > currentScroll + containerHeight) {
          container.scrollTo({ top: rowTop + rowHeight - containerHeight + 20, behavior: 'smooth' });
        }
      }
    }
  }, [activeIndexRecent]);

  const loadData = async () => {
    const [collabs, recent, price, bankData] = await Promise.all([
       storage.getCollaborators(),
      storage.getHarvests(),
      storage.getCurrentPrice(date),
      storage.getBanks()
    ]);
    setCollaborators(collabs);
    setRecentHarvests(recent);
    setCurrentPrice(price);
    setBanks(bankData);
  };

  const weekInfo = useMemo(() => getWeekRange(date), [date]);

  const filteredCollabs = useMemo(() => {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollab || quantity <= 0) {
        showToast('Selecione um colhedor e informe a quantidade', 'error');
        return;
    }

    try {
      const harvest: HarvestLog = {
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        colaborador_id: selectedCollab.id,
        data_colheita: date,
        quantidade_latas: quantity,
        valor_por_lata: currentPrice,
        valor_total_dia: quantity * currentPrice,
        semana_id: weekInfo.id
      };

      await storage.saveHarvest(harvest);
      await loadData();

      setQuantity(0);
      setSearchTerm('');
      setSelectedCollab(null);
      showToast('Colheita registrada com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleQuickRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cpf = formData.get('cpf') as string;

    const existing = collaborators.find(c => c.cpf === cpf);
    if (existing) {
      setRegError('Este CPF já está cadastrado.');
      return;
    }

    const getNextSequentialId = () => {
      const numericIds = collaborators
        .map(c => parseInt(c.id))
        .filter(id => !isNaN(id));
      const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
      return (maxId + 1).toString();
    };

    const newCollab: Collaborator = {
      id: getNextSequentialId(),
      nome: formData.get('nome') as string,
      cpf,
      banco: formData.get('banco') as string,
      agencia: formData.get('agencia') as string,
      conta: formData.get('conta') as string,
      tipo_conta: formData.get('tipo_conta') as string,
      status: CollaboratorStatus.ACTIVE,
      data_cadastro: new Date().toISOString()
    };

    try {
      await storage.saveCollaborator(newCollab);
      await loadData();
      setSelectedCollab(newCollab);
      setRegistrationModalOpen(false);
      setRegError('');
      showToast('Colaborador cadastrado e selecionado!', 'success');
    } catch (err: any) {
      setRegError(err.message);
    }
  };

  const handleUpdateHarvest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingHarvest) return;

    const newQuantity = editingHarvest.quantidade_latas;
    const newDate = editingHarvest.data_colheita;

    if (isNaN(newQuantity) || newQuantity <= 0) {
      showToast('A quantidade de latas deve ser maior que zero', 'error');
      return;
    }

    try {
      const price = await storage.getCurrentPrice(newDate);
      const updated: HarvestLog = {
        ...editingHarvest,
        quantidade_latas: newQuantity,
        data_colheita: newDate,
        valor_por_lata: price,
        valor_total_dia: newQuantity * price,
        semana_id: getWeekRange(newDate).id
      };

      await storage.saveHarvest(updated);
      await loadData();
      setEditModalOpen(false);
      showToast('Lançamento atualizado com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este lançamento?')) {
      try {
        await storage.deleteHarvest(id);
        await loadData();
        showToast('Lançamento excluído com sucesso!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erro ao excluir lançamento', 'error');
      }
    }
  };

  const handleGeneratePdf = async () => {
    setIsPdfModalOpen(false);
    showToast('Buscando lançamentos...', 'success');
    
    try {
      const allHarvests = await storage.getHarvests();
      const logsForDate = allHarvests.filter(h => h.data_colheita === productionReportDate);
      
      if (logsForDate.length === 0) {
        showToast(`Nenhum lançamento encontrado para o dia ${formatDate(productionReportDate)}.`, 'error');
        return;
      }

      showToast('Gerando arquivo PDF...', 'success');
      
      const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4
      
      // Main Header
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0); // Solid Black
      doc.setFont('helvetica', 'bold');
      doc.text('FAZENDA VISTA BELA - JOÃO CORDEIRO NEVES', 14, 18);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('RELATÓRIO DE PRODUÇÃO DIÁRIA DE COLHEITA DE CAFÉ', 14, 24);
      
      doc.setDrawColor(0, 0, 0); // Solid Black
      doc.line(14, 30, 196, 30); // Portrait A4 width (210 - 28)
      
      // Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`LOCALIDADE: UTINGA - BONITO / BA`, 14, 38);
      doc.text(`DATA DA PRODUÇÃO: ${formatDate(productionReportDate)}`, 14, 44);
      
      const tableData = logsForDate.map((h, idx) => {
        const collab = collaborators.find(c => c.id === h.colaborador_id);
        return [
          (idx + 1).toString(), // Seq Num
          collab?.id || '---',  // Registration ID
          (collab?.nome || 'EXCLUÍDO').toUpperCase(),
          (collab?.cpf || '---'),
          h.quantidade_latas.toString(),
          formatCurrency(h.valor_por_lata),
          formatCurrency(h.valor_total_dia)
        ];
      });
      
      autoTable(doc, {
        startY: 52,
        head: [['ITEM', 'Nº CADASTRO', 'COLHEDOR', 'CPF', 'LATS COLHIDAS', 'PREÇO / LATA', 'VALOR DO DIA']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [0, 0, 0], // Solid Black Header
          textColor: [255, 255, 255],
          fontSize: 8,
          halign: 'center'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' }, // Item
          1: { cellWidth: 22, halign: 'center' }, // Nº Cadastro
          2: { cellWidth: 58 },                    // Colhedor
          3: { cellWidth: 28, halign: 'center' }, // CPF
          4: { cellWidth: 22, halign: 'center' }, // Latas
          5: { cellWidth: 20, halign: 'right' },  // Preço/Lata
          6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' } // Valor do Dia
        }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 62;
      const totalLatas = logsForDate.reduce((sum, h) => sum + h.quantidade_latas, 0);
      const totalGeral = logsForDate.reduce((sum, h) => sum + h.valor_total_dia, 0);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL DE LATAS: ${totalLatas} LATS`, 14, finalY + 10);
      doc.text(`VALOR TOTAL GERAL: ${formatCurrency(totalGeral)}`, 196, finalY + 10, { align: 'right' });
      
      // Save PDF
      doc.save(`Producao_${productionReportDate.replace(/-/g, '_')}.pdf`);
      showToast('Download concluído!', 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF de produção:', error);
      showToast('Erro técnico ao gerar o arquivo.', 'error');
    }
  };

  return (
    <div className="h-auto min-h-full md:h-full flex flex-col space-y-4 page-transition overflow-visible md:overflow-hidden bg-background p-6 pb-10 md:pb-6">
      {/* Header - Fixed */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="space-y-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-full">Campo Aberto</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-dark tracking-tight leading-none uppercase italic">COLHEITA</h1>
          <p className="text-secondary/60 font-medium text-[11px]">Registro de entrada</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Operational Cycle - Standardized & Centralized */}
          <div className="bg-primary px-5 py-2 rounded-xl shadow-lg shadow-primary/20 flex flex-col items-center justify-center border border-white/5 h-[52px] w-[240px]">
             <span className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none">Ciclo Operacional</span>
             <span className="text-[13px] font-black text-white leading-none mt-0.5 whitespace-nowrap uppercase tracking-tighter">Ref: {formatDate(weekInfo.start)}</span>
          </div>

          {/* Produção do Dia Card/Button - Standardized & Centralized */}
          <div className="bg-primary text-white px-3 py-2 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-between border border-white/5 h-[52px] w-[240px]">
            <div className="flex flex-col items-start justify-center flex-1 h-full select-none pr-2 border-r border-white/10">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/50 leading-none">Produção do Dia</span>
              <input
                type="date"
                value={productionReportDate}
                onChange={(e) => setProductionReportDate(e.target.value)}
                className="bg-transparent text-white font-black text-[12px] outline-none border-none cursor-pointer mt-0.5 w-full uppercase tracking-wide hover:text-accent transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="pl-3 pr-2 h-full flex flex-col items-center justify-center hover:bg-dark rounded-r-lg transition-colors shrink-0 group"
            >
              <span className="text-[8px] font-black uppercase tracking-widest text-white/50 leading-none">Baixar</span>
              <span className="text-[11px] font-black text-white mt-0.5 uppercase tracking-wide flex items-center gap-1 group-hover:scale-105 transition-transform">
                PDF
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - Fixed and Constrained */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden min-h-0 relative no-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Form Column */}
          <div className="lg:col-span-6 h-full">
            <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl border border-slate-100/50 shadow-premium space-y-3 relative group h-full flex flex-col overflow-visible lg:overflow-hidden">
              {/* Decoration */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-[2000ms]">
                 <Pickaxe className="w-12 h-12" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-secondary/40 px-1">Data</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 pl-10 py-2.5 px-4 rounded-xl font-black text-sm text-primary outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-secondary/40 px-1">Preço Atual</label>
                  <div className="flex items-center gap-3 bg-accent/5 p-2 rounded-xl border border-accent/10">
                     <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
                        <span className="text-white font-black text-xs">$</span>
                     </div>
                     <div>
                        <p className="text-lg font-black text-dark leading-none tracking-tight">{formatCurrency(currentPrice)}</p>
                        <p className="text-[8px] font-black text-accent uppercase tracking-widest mt-0.5">Por lata</p>
                     </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 relative z-[100]">
                <label className="text-[9px] font-black uppercase tracking-widest text-secondary/40 px-1">Colhedor</label>
                <div className="flex items-center gap-4 relative z-[110]">
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 text-secondary/30 hidden md:block">
                     <Search className="w-5 h-5" />
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-0 pointer-events-none flex items-center px-4 font-black text-lg uppercase z-20 tracking-tight overflow-hidden">
                      <span className="text-transparent whitespace-pre">{searchTerm}</span>
                      {searchTerm && filteredCollabs.length > 0 && (
                        <span className="text-primary/25 whitespace-pre">
                          {(() => {
                            const current = filteredCollabs[activeIndex] || filteredCollabs[0];
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
                      value={searchTerm}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchTerm(value);
                        setSelectedCollab(null);
                        setShowDropdown(true);
                        setActiveIndex(0);
                      }}
                      onWheel={(e) => {
                        if (showDropdown && filteredCollabs.length > 0) {
                          if (e.deltaY > 0) {
                            setActiveIndex(prev => Math.max(0, Math.min(prev + 1, filteredCollabs.length - 1)));
                          } else {
                            setActiveIndex(prev => Math.max(0, Math.min(prev - 1, filteredCollabs.length - 1)));
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (searchTerm) {
                            setShowDropdown(true);
                            setActiveIndex(prev => Math.max(0, Math.min(prev + 1, filteredCollabs.length - 1)));
                          } else {
                            setActiveIndexRecent(prev => {
                              const next = prev === null ? 0 : Math.min(prev + 1, recentHarvests.length - 1);
                              return next;
                            });
                          }
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (searchTerm) {
                            setShowDropdown(true);
                            setActiveIndex(prev => Math.max(0, Math.min(prev - 1, filteredCollabs.length - 1)));
                          } else {
                            setActiveIndexRecent(prev => {
                              const next = prev === null ? 0 : Math.max(0, prev - 1);
                              return next;
                            });
                          }
                        }
                        if (e.key === 'Enter') {
                          if (showDropdown && filteredCollabs.length > 0) {
                            e.preventDefault();
                            const current = filteredCollabs[activeIndex];
                            setSelectedCollab(current);
                            setSearchTerm(current.nome);
                            setShowDropdown(false);
                          } else if (activeIndexRecent !== null) {
                            // Option: Open edit modal on Enter if a recent item is selected? 
                            // The user said "apenas selecioná-lo", but Enter usually opens.
                            // I'll keep it simple for now as per "apenas selecioná-lo".
                          }
                        }
                        if ((e.key === 'Tab' || e.key === 'ArrowRight') && searchTerm && filteredCollabs.length > 0) {
                          const current = filteredCollabs[activeIndex];
                          const suggestion = `${current.nome} (ID: ${current.id})`;
                          if (suggestion.toLowerCase().startsWith(searchTerm.toLowerCase())) {
                            e.preventDefault();
                            setSelectedCollab(current);
                            setSearchTerm(current.nome);
                            setShowDropdown(false);
                          }
                        }
                      }}
                      className="bg-white border-2 border-primary focus:ring-0 w-full text-lg font-black text-primary placeholder:text-primary/10 uppercase tracking-tight rounded-xl px-4 py-2 shadow-sm relative z-10"
                    />
                    {(searchTerm || selectedCollab) && (
                      <button 
                        type="button"
                        onClick={() => { setSearchTerm(''); setSelectedCollab(null); setShowDropdown(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 text-secondary/40 rounded-lg hover:bg-slate-200 transition-all z-20"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {showDropdown && searchTerm && (
                      <div className="absolute z-[200] w-full left-0 mt-2 bg-white border border-slate-100 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {filteredCollabs.length > 0 ? (
                          <div className="overflow-y-auto max-h-48 p-2 no-scrollbar">
                            {filteredCollabs.map((c, index) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCollab(c);
                                  setSearchTerm(c.nome);
                                  setShowDropdown(false);
                                  setActiveIndex(index);
                                }}
                                className={`w-full text-left px-6 py-1.5 rounded-[12px] flex justify-between items-center group transition-all border-2 ${activeIndex === index ? 'border-primary bg-primary/5 shadow-sm scale-[1.005] z-10' : 'border-transparent hover:bg-slate-50'}`}
                              >
                                <div>
                                  <div className="font-black text-sm uppercase tracking-tight leading-none text-dark">{c.nome}</div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[11px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-dark/80">ID: {c.id}</span>
                                    <span className="text-[11px] font-mono font-black tracking-wider text-dark/90">{c.cpf}</span>
                                  </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 transition-all text-primary ${activeIndex === index ? 'translate-x-1 opacity-100' : 'opacity-0'}`} />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center space-y-4 bg-danger/5 animate-in zoom-in-95 duration-300">
                            <div className="space-y-1">
                              <p className="text-sm font-black text-danger uppercase tracking-widest">Colaborador Não Encontrado</p>
                              <p className="text-[10px] font-black text-secondary/60 uppercase tracking-tight">Deseja cadastrar novo agora?</p>
                            </div>
                            <div className="flex items-center justify-center gap-3">
                              <button
                                type="button"
                                onClick={() => setRegistrationModalOpen(true)}
                                className="bg-primary text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/25"
                              >
                                Sim, Cadastrar
                              </button>
                              <button
                                type="button"
                                onClick={() => { setShowDropdown(false); setSearchTerm(''); }}
                                className="bg-white text-secondary/60 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] border border-slate-200 hover:bg-slate-50 transition-all"
                              >
                                Não
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 relative">
                <label className="text-[9px] font-black uppercase tracking-widest text-secondary/40 px-1 text-center block">Volume (lats)</label>
                <div className="relative max-w-xs mx-auto">
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseFloat(e.target.value))}
                    placeholder="0.0"
                    className="w-full bg-white border-2 border-primary focus:border-primary/50 py-4 px-4 text-3xl font-black rounded-2xl outline-none transition-all text-center text-primary placeholder:text-primary/5"
                  />
                </div>
              </div>

              <div className="p-4 bg-primary rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-premium relative border border-white/5">
                <div className="text-center sm:text-left">
                  <p className="text-white/50 text-[9px] font-black uppercase tracking-widest">Valor do Dia</p>
                  <p className="text-3xl font-black text-white leading-none tracking-tighter mt-1">{formatCurrency(quantity * currentPrice)}</p>
                </div>
                <button
                  type="submit"
                  disabled={!selectedCollab || quantity <= 0}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 border ${
                    !selectedCollab || quantity <= 0 
                    ? 'bg-white/5 border-white/5 cursor-not-allowed text-white/50' 
                    : '!bg-primary !text-white border-white/20 hover:!bg-dark'
                  }`}
                >
                  <span className="!text-white !opacity-100">Confirmar</span>
                  <Save className="w-4 h-4 !text-white !opacity-100" />
                </button>
              </div>
            </form>
          </div>

          {/* History Column */}
          <div className="lg:col-span-6 flex flex-col h-full min-h-0">
            <div className="flex items-center px-1 sticky top-0 bg-[#F8F9FA] z-20 py-2 rounded-t-2xl">
              <div className="flex-1">
                 <div className="p-1 bg-primary rounded-md text-white flex items-center gap-2 px-3 w-full justify-center">
                    <History className="w-3.5 h-3.5" />
                    <h2 className="text-base font-black text-white tracking-tight uppercase italic">Recentes</h2>
                </div>
              </div>
            </div>
 
            <div 
              id="recent-harvests-container"
              className="space-y-1.5 flex-1 overflow-y-auto overscroll-contain no-scrollbar pr-1 pb-40 relative"
            >
              {recentHarvests.map((h, index) => {
                const collab = collaborators.find(c => c.id === h.colaborador_id);
                return (
                  <div 
                    key={h.id} 
                    id={`collab-row-recent-${index}`}
                    onClick={(e) => { 
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) return;
                      setActiveIndexRecent(index); 
                      searchInputRef.current?.focus(); 
                    }}
                    className={`p-1.5 rounded-xl border flex items-center gap-3 transition-all relative overflow-hidden cursor-pointer ${
                      activeIndexRecent === index 
                      ? 'border-primary bg-white shadow-lg shadow-primary/5 z-10 scale-[1.01]' 
                      : 'border-slate-100 bg-white hover:border-primary/30 shadow-sm'
                    }`}
                  >
                     <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full transition-transform ${
                       activeIndexRecent === index ? 'scale-y-100' : 'scale-y-50 group-hover:scale-y-100'
                     }`} />
                     
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black text-dark uppercase tracking-widest flex items-center gap-1.5">
                           {formatDate(h.data_colheita)}
                        </p>
                        <span className="text-[10px] font-black text-dark/60 uppercase tracking-widest">ID: {collab?.id || '---'}</span>
                      </div>
                      <h4 className="font-black text-dark uppercase tracking-tight text-sm truncate leading-tight">{collab?.nome || 'Excluído'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                         <div className="flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-full border border-primary/10">
                            <Pickaxe className="w-3 h-3 text-primary" />
                            <span className="text-[11px] font-black text-primary uppercase tracking-tighter">{h.quantidade_latas} lats</span>
                         </div>
                         <span className="text-[11px] font-black text-dark tracking-tight">{formatCurrency(h.valor_total_dia)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 ml-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingHarvest(h); setIsHarvestReadOnly(false); setEditModalOpen(true); }}
                        className="flex items-center justify-center gap-1 px-2 py-1 !bg-primary !text-white rounded-md hover:!bg-dark transition-all shadow-sm shadow-primary/20"
                      >
                        <Edit2 className="w-2.5 h-2.5 !text-white" />
                        <span className="text-[7.5px] font-black uppercase !text-white">Editar</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(h.id); }}
                        className="flex items-center justify-center gap-1 px-2 py-1 !bg-primary !text-white rounded-md hover:!bg-dark transition-all shadow-sm shadow-primary/20"
                      >
                        <Trash2 className="w-2.5 h-2.5 !text-white" />
                        <span className="text-[7.5px] font-black uppercase !text-white">Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Registration Modal */}
      {isRegistrationModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 border border-white/20 my-auto">
            <div className="p-6 pb-2 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20 rounded-t-[40px]">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-dark tracking-tight leading-none uppercase italic">
                  Cadastro <span className="text-primary not-italic">Rápido</span>
                </h2>
                <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">Novo Colaborador</p>
              </div>
              <button 
                onClick={() => setRegistrationModalOpen(false)}
                className="p-3 bg-slate-50 rounded-2xl text-secondary/30 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 max-h-[calc(100vh-140px)] no-scrollbar">
               <form onSubmit={handleQuickRegister} className="p-6 pt-2 pb-6 space-y-3 relative z-10">
              {regError && (
                <div className="flex items-center gap-3 bg-danger/5 text-danger p-4 rounded-2xl border border-danger/10 text-[10px] font-black uppercase tracking-tight">
                  <AlertCircle className="w-5 h-5" />
                  {regError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-2">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                    <input 
                      name="nome" 
                      required 
                      defaultValue={searchTerm}
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-2xl py-2 px-12 text-primary outline-none transition-all font-black text-base placeholder:text-primary/10" 
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                </div>
                
                <div className="space-y-1 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-2">CPF</label>
                  <input 
                    name="cpf" 
                    required 
                    className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-2xl py-2 px-6 text-primary outline-none transition-all font-black text-base font-mono"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-1 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-2">Banco</label>
                  <select 
                    name="banco" 
                    required 
                    className="w-full appearance-none bg-white border-2 border-primary focus:border-primary/50 rounded-2xl py-2 px-6 text-primary outline-none transition-all font-black text-base cursor-pointer"
                  >
                    <option value="">Selecione</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.nome}>{b.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-2">Agência</label>
                  <input 
                    name="agencia" 
                    required 
                    className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-2xl py-2 px-6 text-primary outline-none transition-all font-black text-base"
                    placeholder="0000"
                  />
                </div>

                <div className="space-y-1 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-2">Conta</label>
                  <input 
                    name="conta" 
                    required 
                    className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-2xl py-2 px-6 text-primary outline-none transition-all font-black text-base font-mono"
                    placeholder="00000-0"
                  />
                </div>

                <div className="space-y-1 group md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-2">Tipo da Conta</label>
                  <select 
                    name="tipo_conta" 
                    required 
                    className="w-full appearance-none bg-white border-2 border-primary focus:border-primary/50 rounded-2xl py-2 px-6 text-primary outline-none transition-all font-black text-base"
                  >
                    <option value="corrente">Conta Corrente</option>
                    <option value="poupanca">Conta Poupança</option>
                    <option value="salario">Conta Salário</option>
                  </select>
                </div>
              </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setRegistrationModalOpen(false)} 
                    className="flex-1 !bg-primary !text-white px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] border border-primary hover:!bg-dark transition-all shadow-md"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 !bg-primary !text-white px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] border border-primary hover:!bg-dark transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </button>
                </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Edit Harvest Modal */}
      {isEditModalOpen && editingHarvest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 border border-white/20 my-auto">
            <div className="p-6 pb-2 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20 rounded-t-[40px]">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-dark tracking-tight leading-none uppercase italic">
                   {isHarvestReadOnly ? 'Detalhes do' : 'Editar'} <span className="text-primary not-italic">Lançamento</span>
                </h2>
                <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">
                  {collaborators.find(c => c.id === editingHarvest.colaborador_id)?.nome}
                </p>
              </div>
              <button 
                onClick={() => setEditModalOpen(false)}
                className="p-3 bg-slate-50 rounded-2xl text-secondary/30 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 max-h-[calc(100vh-140px)] no-scrollbar">
               <form onSubmit={handleUpdateHarvest} className="p-6 pt-2 pb-6 space-y-3 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-2">Data da Colheita</label>
                  <div className="relative">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                    <input 
                      type="date"
                      name="data" 
                      required 
                      disabled={isHarvestReadOnly}
                      value={editingHarvest.data_colheita}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        const price = await storage.getCurrentPrice(newDate);
                        setEditingHarvest({
                          ...editingHarvest,
                          data_colheita: newDate,
                          valor_por_lata: price,
                          valor_total_dia: editingHarvest.quantidade_latas * price,
                          semana_id: getWeekRange(newDate).id
                        });
                      }}
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 disabled:opacity-70 rounded-2xl py-2 px-12 text-primary outline-none transition-all font-black text-base shadow-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-2">Volume (lats)</label>
                  <div className="relative">
                    <Pickaxe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                    <input 
                      type="number"
                      name="quantidade"
                      step="0.5"
                      required 
                      disabled={isHarvestReadOnly}
                      value={editingHarvest.quantidade_latas || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditingHarvest({
                          ...editingHarvest,
                          quantidade_latas: val,
                          valor_total_dia: val * editingHarvest.valor_por_lata
                        });
                      }}
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 disabled:opacity-70 rounded-2xl py-2 px-12 text-primary outline-none transition-all font-black text-base shadow-sm" 
                    />
                  </div>
                </div>

                <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[8px] font-black text-secondary/40 uppercase tracking-widest">Valor Unitário</p>
                      <p className="text-sm font-black text-dark tracking-tight">{formatCurrency(editingHarvest.valor_por_lata)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-secondary/40 uppercase tracking-widest">Total do Registro</p>
                      <p className="text-xl font-black text-primary tracking-tighter">{formatCurrency(editingHarvest.valor_total_dia)}</p>
                    </div>
                  </div>
                </div>
              </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setEditModalOpen(false)} 
                    className="flex-1 !bg-primary !text-white px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] border border-primary hover:!bg-dark transition-all shadow-md"
                  >
                    Fechar
                  </button>
                  
                  {isHarvestReadOnly ? (
                    <button 
                      type="button" 
                      onClick={() => setIsHarvestReadOnly(false)}
                      className="flex-1 !bg-primary !text-white px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] border border-primary hover:!bg-dark transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4 !text-white" />
                      <span className="!text-white">Editar</span>
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      className="flex-1 !bg-primary !text-white px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] border border-primary hover:!bg-dark transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4 !text-white" />
                      <span className="!text-white">Confirmar</span>
                    </button>
                  )}
                </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* PDF Confirmation Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 border border-white/20 my-auto p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-dark tracking-tight leading-none uppercase italic">
                Gerar <span className="text-primary not-italic">Relatório PDF</span>
              </h2>
              <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">Confirmação de Exportação</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <p className="text-[12px] font-black text-dark/70 uppercase tracking-tight">
                Deseja gerar o relatório de produção diária para o dia:
              </p>
              <p className="text-lg font-black text-primary uppercase tracking-wide">
                {formatDate(productionReportDate)}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-secondary/70 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-sm active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="flex-1 !bg-primary !text-white px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] border border-primary hover:!bg-dark transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 !text-white" />
                <span className="!text-white">Gerar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
