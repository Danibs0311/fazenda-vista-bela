
import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../../services/storageService';
import { HarvestWeek, WeekStatus, HarvestLog, Collaborator } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import { Lock, Unlock, ClipboardCheck, CheckCircle2, Eye, Calendar, TrendingUp, X, Edit2, Trash2, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export const WeekManagement: React.FC = () => {
  const [weeks, setWeeks] = useState<HarvestWeek[]>([]);
  const [harvests, setHarvests] = useState<HarvestLog[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedWeekForModal, setSelectedWeekForModal] = useState<HarvestWeek | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestLog | null>(null);
  const [isHarvestEditModalOpen, setEditModalOpen] = useState(false);
  const [isHarvestReadOnly, setIsHarvestReadOnly] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open, scroll the modal list
      if (isModalOpen && modalScrollRef.current) {
        if (e.key === 'ArrowDown') modalScrollRef.current.scrollBy({ top: 40, behavior: 'smooth' });
        if (e.key === 'ArrowUp') modalScrollRef.current.scrollBy({ top: -40, behavior: 'smooth' });
        return;
      }

      // Otherwise scroll the main list
      if (!isModalOpen && scrollContainerRef.current) {
        if (e.key === 'ArrowDown') scrollContainerRef.current.scrollBy({ top: 100, behavior: 'smooth' });
        if (e.key === 'ArrowUp') scrollContainerRef.current.scrollBy({ top: -100, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const loadData = async () => {
    const [w, h, c] = await Promise.all([
      storage.getWeeks(),
      storage.getHarvests(),
      storage.getCollaborators()
    ]);
    setWeeks(w.sort((a, b) => b.id.localeCompare(a.id)));
    setHarvests(h);
    setCollaborators(c);
  };

  const getWeekStats = (weekId: string) => {
    const weekHarvests = harvests.filter(h => h.semana_id === weekId);
    return {
      totalLatas: weekHarvests.reduce((s, h) => s + h.quantidade_latas, 0),
      totalValue: weekHarvests.reduce((s, h) => s + h.valor_total_dia, 0),
      colhedores: new Set(weekHarvests.map(h => h.colaborador_id)).size
    };
  };

  const updateStatus = async (week: HarvestWeek, newStatus: WeekStatus) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (newStatus === WeekStatus.IN_CONFERENCE && today < week.data_fim) {
      showToast('Ciclo Vigente: Aguarde o fim do período para encerrar e exportar.', 'error');
      return;
    }

    try {
      const updated = { ...week, status: newStatus };
      await storage.saveWeek(updated);
      await loadData();
      
      if (newStatus === WeekStatus.IN_CONFERENCE) {
        showToast('Ciclo encerrado! Dados exportados para Pagamentos.', 'success');
        setTimeout(() => navigate('/pagamentos'), 1500);
      } else {
        showToast(`Ciclo ${newStatus.toLowerCase()}`, 'success');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateHarvest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingHarvest) return;

    const formData = new FormData(e.currentTarget);
    const newQuantity = parseFloat(formData.get('quantidade') as string);
    const newDate = formData.get('data') as string;

    try {
      const price = await storage.getCurrentPrice(newDate);
      
      // Remove temporary UI fields before saving to DB
      const { collabName, collabRef, ...cleanHarvest } = editingHarvest as any;
      
      const updated: HarvestLog = {
        ...cleanHarvest,
        quantidade_latas: newQuantity,
        data_colheita: newDate,
        valor_por_lata: price,
        valor_total_dia: newQuantity * price
      };

      await storage.saveHarvest(updated);
      await loadData();
      setEditModalOpen(false);
      showToast('Lançamento atualizado!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteHarvest = async (id: string) => {
    if (confirm('Deseja excluir este lançamento?')) {
      await storage.deleteHarvest(id);
      await loadData();
      setEditModalOpen(false);
      showToast('Lançamento excluído', 'success');
    }
  };

  const openConferenceModal = (week: HarvestWeek) => {
    setSelectedWeekForModal(week);
    setIsModalOpen(true);
  };

  const getConferenceData = () => {
    if (!selectedWeekForModal) return [];
    const weekHarvests = harvests.filter(h => h.semana_id === selectedWeekForModal.id);
    
    return weekHarvests.map(h => {
      const collab = collaborators.find(c => c.id === h.colaborador_id);
      return {
        ...h,
        collabName: collab?.nome || 'Desconhecido',
        collabRef: collab?.id.split('-')[0] || '---'
      };
    }).sort((a, b) => b.data_colheita.localeCompare(a.data_colheita));
  };

  const statusMap = {
    [WeekStatus.OPEN]: { label: 'Em Aberto', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <Unlock className="w-3.5 h-3.5" /> },
    [WeekStatus.CLOSED]: { label: 'Fechada', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: <Lock className="w-3.5 h-3.5" /> },
    [WeekStatus.IN_CONFERENCE]: { label: 'Em Conferência', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
    [WeekStatus.PAID]: { label: 'Pago', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  };

  return (
    <div className="h-auto min-h-full md:h-full flex flex-col space-y-6 animate-in fade-in duration-700 overflow-visible md:overflow-hidden pb-10 md:pb-0">
      {/* Header Section - Standardized */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="space-y-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-full">Operacional</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-dark tracking-tight leading-none uppercase italic">CICLOS DE COLHEITA</h1>
          <p className="text-secondary/60 font-medium text-[10px]">Controle de fechamento</p>
        </div>
      </div>

      {/* Content Area - Fixed Scroll Behavior */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pr-2 min-h-0 overscroll-contain focus:outline-none scroll-smooth"
        tabIndex={0}
      >
        <div className="grid grid-cols-1 gap-4 pb-6">
          {weeks.map(week => {
            const stats = getWeekStats(week.id);
            const statusConfig = statusMap[week.status];

            return (
              <div key={week.id} className="bg-white rounded-[32px] border border-slate-100/50 p-4 flex flex-col lg:flex-row justify-between items-center gap-6 group hover:shadow-premium transition-all duration-300 relative overflow-hidden">
                
                <div className="flex items-center gap-6 w-full lg:w-auto">
                   <div className="w-12 h-12 rounded-2xl bg-background flex flex-col items-center justify-center border border-slate-100 group-hover:bg-accent/10 transition-colors">
                      <Calendar className="w-5 h-5 text-secondary/40 group-hover:text-accent transition-colors" />
                   </div>
                   <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-black text-dark uppercase tracking-tight leading-none whitespace-nowrap">
                           {formatDate(week.data_inicio)} <span className="text-secondary/60 mx-1">à</span> {formatDate(week.data_fim)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${statusConfig.color}`}>
                          {statusConfig.icon} {statusConfig.label}
                         </span>
                         {new Date().toISOString().split('T')[0] >= week.data_inicio && new Date().toISOString().split('T')[0] <= week.data_fim && (
                           <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                             Vigente
                           </span>
                         )}
                         <span className="text-[8px] font-bold text-secondary/50 tracking-widest uppercase ml-2">ID: {week.id}</span>
                      </div>
                   </div>
                </div>

                <div className="flex gap-8 w-full lg:w-auto px-4 py-4 lg:py-0 bg-background/50 lg:bg-transparent rounded-2xl justify-center">
                  <div className="text-center space-y-0.5">
                    <p className="text-[8px] text-secondary/80 uppercase font-black tracking-widest">Produção</p>
                    <p className="text-xl font-black text-dark">{stats.totalLatas} <span className="text-[10px] text-secondary/80">{stats.totalLatas === 1 ? 'lat' : 'lats'}</span></p>
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-[8px] text-secondary/80 uppercase font-black tracking-widest">Custo</p>
                    <div className="flex items-center justify-center gap-1 text-success">
                      <p className="text-xl font-black">{formatCurrency(stats.totalValue)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                  {(week.status === WeekStatus.OPEN || week.status === WeekStatus.CLOSED) && (
                    <button 
                      onClick={() => updateStatus(week, WeekStatus.IN_CONFERENCE)} 
                      className={`flex-1 lg:w-[180px] px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg ${
                        new Date().toISOString().split('T')[0] < week.data_fim
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : '!bg-primary !text-white shadow-primary/20 hover:!bg-dark'
                      }`}
                    >
                      {week.status === WeekStatus.OPEN ? 'Encerrar Ciclo' : 'Exportar Dados'}
                    </button>
                  )}
                  
                  {(week.status === WeekStatus.OPEN || week.status === WeekStatus.CLOSED || week.status === WeekStatus.IN_CONFERENCE) && (
                    <button 
                      onClick={() => openConferenceModal(week)}
                      className="flex-1 lg:w-[150px] !bg-primary !text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:!bg-dark transition-all shadow-lg shadow-primary/20"
                    >
                      <Eye className="w-3.5 h-3.5 !text-white" /> Conferir
                    </button>
                  )}

                  {week.status === WeekStatus.IN_CONFERENCE && (
                    <button 
                      onClick={() => updateStatus(week, WeekStatus.OPEN)} 
                      className="flex-1 lg:w-[150px] bg-white text-primary border-2 border-primary px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-primary/5 transition-all"
                    >
                      Reabrir Ciclo
                    </button>
                  )}
                  
                  {week.status === WeekStatus.PAID && (
                    <div className="flex-1 lg:w-[180px] bg-background text-secondary/80 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 border border-slate-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Finalizado
                    </div >
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conference Modal - 9:16 Centered Format (Dynamic Height) */}
      {isModalOpen && selectedWeekForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-[380px] mx-auto h-fit max-h-[85vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-white/20 relative">
            {/* Modal Header - Extra Compact */}
            <div className="p-5 flex flex-col items-center text-center bg-slate-50/50">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 mb-2">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-dark uppercase italic tracking-tight leading-none">Conferência</h2>
              <p className="text-secondary/80 font-bold text-[7px] uppercase tracking-[0.2em] mt-1.5">
                {formatDate(selectedWeekForModal.data_inicio)} — {formatDate(selectedWeekForModal.data_fim)}
              </p>
              
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 hover:bg-slate-200 rounded-full transition-colors text-secondary/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - Individual Log List */}
            <div 
              ref={modalScrollRef}
              className="flex-1 overflow-y-auto px-4 py-2 min-h-[300px] scroll-smooth"
            >
              <div className="space-y-1.5 animate-in fade-in duration-500">
                {getConferenceData().map((log) => (
                  <div key={log.id} className="bg-background/50 p-3 rounded-2xl border border-slate-50 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-secondary/80 uppercase tracking-widest leading-none mb-1">
                          {formatDate(log.data_colheita)}
                        </span>
                        <span className="font-black text-dark uppercase tracking-tight text-[10px] leading-tight truncate w-32">
                          {log.collabName}
                        </span>
                        <span className="text-[7px] font-bold text-secondary/60 uppercase tracking-widest">ID: {log.collabRef}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-black text-primary block leading-none">
                          {log.quantidade_latas.toFixed(1)}
                        </span>
                        <span className="text-[7px] font-bold text-primary/60 uppercase tracking-widest">lats</span>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingHarvest(log);
                          setIsHarvestReadOnly(false);
                          setEditModalOpen(true);
                        }}
                        className="p-2.5 bg-background hover:bg-primary/10 rounded-xl transition-all group"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-primary" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer - Extra Compact */}
            <div className="p-5 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center">
                  <p className="text-[7px] font-black uppercase tracking-widest text-secondary/70 mb-0.5">Total Ciclo</p>
                  <p className="text-lg font-black text-dark tracking-tighter leading-none">
                    {getConferenceData().reduce((s, d) => s + d.quantidade_latas, 0).toFixed(1)}
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center">
                  <p className="text-[7px] font-black uppercase tracking-widest text-secondary/70 mb-0.5">Valor Total</p>
                  <p className="text-lg font-black text-success tracking-tighter leading-none">
                    {formatCurrency(getConferenceData().reduce((s, d) => s + d.valor_total_dia, 0))}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 bg-white border border-slate-200 text-secondary/60 rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-slate-50 transition-all"
                >
                  Fechar Conferência
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Harvest Modal (Same as Recent Activity) */}
      {isHarvestEditModalOpen && editingHarvest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 border border-white/20 my-auto">
            <div className="p-6 pb-2 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20 rounded-t-[40px]">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-dark tracking-tight leading-none uppercase italic">
                   {isHarvestReadOnly ? 'Detalhes do' : 'Editar'} <span className="text-primary not-italic">Lançamento</span>
                </h2>
                <p className="text-[10px] font-bold text-secondary/70 uppercase tracking-widest">
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

            <div className="p-6 pt-2 pb-6 space-y-3 relative z-10">
               <form onSubmit={handleUpdateHarvest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-secondary/70 px-2">Data da Colheita</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                      <input 
                        type="date"
                        name="data" 
                        required 
                        disabled={isHarvestReadOnly}
                        defaultValue={editingHarvest.data_colheita}
                        className="w-full bg-white border-2 border-primary focus:border-primary/50 disabled:opacity-70 rounded-2xl py-2 px-12 text-primary outline-none transition-all font-black text-base shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-secondary/70 px-2">Volume (lats)</label>
                    <div className="relative">
                      <TrendingUp className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                      <input 
                        type="number"
                        name="quantidade"
                        step="0.5"
                        required 
                        disabled={isHarvestReadOnly}
                        defaultValue={editingHarvest.quantidade_latas}
                        className="w-full bg-white border-2 border-primary focus:border-primary/50 disabled:opacity-70 rounded-2xl py-2 px-12 text-primary outline-none transition-all font-black text-base shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[8px] font-black text-secondary/70 uppercase tracking-widest">Valor Unitário</p>
                        <p className="text-sm font-black text-dark tracking-tight">{formatCurrency(editingHarvest.valor_por_lata)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-secondary/70 uppercase tracking-widest">Total do Registro</p>
                        <p className="text-xl font-black text-primary tracking-tighter">{formatCurrency(editingHarvest.valor_total_dia)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => handleDeleteHarvest(editingHarvest.id)}
                    className="flex-1 bg-danger/10 text-danger px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] border border-danger/10 hover:bg-danger/20 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] !bg-primary !text-white px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] border border-primary hover:!bg-dark transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 !text-white" />
                    <span className="!text-white">Confirmar</span>
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
