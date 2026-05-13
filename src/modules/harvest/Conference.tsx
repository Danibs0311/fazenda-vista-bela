
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '../../services/storageService';
import { HarvestWeek, WeekStatus, HarvestLog, Collaborator } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import { ClipboardCheck, CheckCircle, AlertTriangle, Printer, ChevronDown, ChevronUp, Clock, User, Coffee, X, CheckSquare, Layers } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface SummaryGroup {
  latas: number;
  value: number;
  logs: HarvestLog[];
}

export const Conference: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<HarvestWeek | null>(null);
  const [weeks, setWeeks] = useState<HarvestWeek[]>([]);
  const [harvests, setHarvests] = useState<HarvestLog[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [expandedCollab, setExpandedCollab] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadData = async () => {
    const allWeeks = await storage.getWeeks();
    const readyWeeks = allWeeks.filter(w => [WeekStatus.CLOSED, WeekStatus.IN_CONFERENCE].includes(w.status))
      .sort((a, b) => b.id.localeCompare(a.id));

    setWeeks(readyWeeks);

    if (readyWeeks.length > 0) {
      if (!selectedWeek || !readyWeeks.find(w => w.id === selectedWeek.id)) {
        setSelectedWeek(readyWeeks[0]);
      } else {
        setSelectedWeek(readyWeeks.find(w => w.id === selectedWeek.id) || null);
      }
    }

    const [h, c] = await Promise.all([
      storage.getHarvests(),
      storage.getCollaborators()
    ]);
    setHarvests(h);
    setCollaborators(c);
  };

  useEffect(() => {
    loadData();
  }, []);

  const weekHarvests = useMemo(() => {
    if (!selectedWeek) return [];
    return harvests.filter(h => h.semana_id === selectedWeek.id);
  }, [selectedWeek, harvests]);

  const summary = useMemo(() => {
    const groups: Record<string, SummaryGroup> = {};
    weekHarvests.forEach(h => {
      if (!groups[h.colaborador_id]) groups[h.colaborador_id] = { latas: 0, value: 0, logs: [] };
      groups[h.colaborador_id].latas += h.quantidade_latas;
      groups[h.colaborador_id].value += h.valor_total_dia;
      groups[h.colaborador_id].logs.push(h);
    });
    return groups;
  }, [weekHarvests]);

  const handleApprove = async () => {
    if (!selectedWeek) return;
    if (selectedWeek.status === WeekStatus.IN_CONFERENCE) return;

    if (confirm('Deseja aprovar esta pré-folha? Isso bloqueará novos lançamentos nesta semana.')) {
      try {
        const updatedWeek = { ...selectedWeek, status: WeekStatus.IN_CONFERENCE };
        await storage.saveWeek(updatedWeek);
        setSelectedWeek(updatedWeek);
        await loadData();
        showToast('Semana conferida e aprovada!', 'success');
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const totals = useMemo(() => {
    return (Object.values(summary) as SummaryGroup[]).reduce((acc, curr) => ({
      latas: acc.latas + curr.latas,
      value: acc.value + curr.value
    }), { latas: 0, value: 0 });
  }, [summary]);

  if (weeks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 mb-8">
          <ClipboardCheck className="w-16 h-16 text-slate-200" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Tudo em Diário!</h2>
        <p className="text-slate-500 max-w-sm mt-2 font-medium">Não há ciclos fechados aguardando auditoria no momento.</p>
        <Link to="/semanas" className="mt-8 px-8 py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-dark transition-all shadow-lg shadow-primary/20">
           Gerenciar Ciclos
        </Link>
      </div>
    );
  }

  const isApproved = selectedWeek?.status === WeekStatus.IN_CONFERENCE;

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-700 overflow-hidden bg-background p-6">
      {/* Header Section - Standardized */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="space-y-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-full">Auditoria</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-dark tracking-tight leading-none uppercase italic">Conferência de <span className="text-primary not-italic">Produção</span></h1>
          <p className="text-secondary/60 font-medium text-[10px]">Validação técnica de ciclos</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Reference Selector - Standardized & Centralized */}
          <div className="bg-primary px-5 py-2 rounded-xl shadow-lg shadow-primary/20 flex flex-col items-center justify-center border border-white/5 h-[52px] w-[240px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none">Referência</span>
              <select
                className="appearance-none bg-transparent font-black text-white text-[13px] outline-none cursor-pointer uppercase tracking-tighter w-full text-center"
                value={selectedWeek?.id || ''}
                onChange={(e) => setSelectedWeek(weeks.find(w => w.id === e.target.value) || null)}
              >
                {weeks.map(w => (
                  <option key={w.id} value={w.id} className="text-dark bg-white">
                    {formatDate(w.data_inicio)} — {formatDate(w.data_fim)}
                  </option>
                ))}
              </select>
          </div>

          {/* Today Card - Standardized & Centralized */}
          <div className="bg-primary text-white px-5 py-2 rounded-xl shadow-lg shadow-primary/20 flex flex-col items-center justify-center border border-white/5 h-[52px] w-[240px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none">Hoje</span>
              <span className="text-[13px] font-black text-white mt-0.5 uppercase whitespace-nowrap tracking-wide">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
          </div>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
          {/* Table Column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-[32px] border border-slate-100/50 shadow-premium overflow-hidden flex flex-col">
               {/* Table Header Wrapper */}
               <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-secondary/40" />
                     </div>
                     <h3 className="font-black text-dark uppercase tracking-tight text-sm">Relação de Colhedores</h3>
                  </div>
                  <span className="text-[9px] font-black text-secondary/40 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100">
                     {Object.keys(summary).length} Ativos
                  </span>
               </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50 text-[9px] font-black uppercase tracking-[0.2em] text-secondary/20">
                      <th className="px-8 py-4">Identificação</th>
                      <th className="px-8 py-4 text-center">Produção</th>
                      <th className="px-8 py-4 text-right">Auditado</th>
                      <th className="px-8 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(Object.entries(summary) as [string, SummaryGroup][]).map(([collabId, data]) => {
                      const collab = collaborators.find(c => c.id === collabId);
                      const isExpanded = expandedCollab === collabId;
                      return (
                        <React.Fragment key={collabId}>
                          <tr className={`hover:bg-slate-50/50 transition-all group ${isExpanded ? 'bg-accent/5' : ''}`}>
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-secondary/20 group-hover:bg-white transition-colors">
                                    <User className="w-4 h-4" />
                                 </div>
                                 <div>
                                    <div className="font-black text-dark uppercase tracking-tight leading-none text-sm group-hover:text-primary transition-colors">{collab?.nome}</div>
                                    <div className="text-[9px] text-secondary/40 font-bold mt-0.5 tracking-widest">{collab?.cpf}</div>
                                 </div>
                              </div>
                            </td>
                            <td className="px-8 py-4 text-center">
                               <span className="font-black text-dark bg-background px-3 py-1 rounded-full text-xs">
                                  {data.latas} <span className="text-[8px] font-bold uppercase ml-0.5 opacity-50">{data.latas === 1 ? 'lat' : 'lats'}</span>
                               </span>
                            </td>
                            <td className="px-8 py-4 text-right">
                               <div className="font-black text-success tracking-tight">
                                  {formatCurrency(data.value)}
                                </div>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <button 
                                onClick={() => setExpandedCollab(isExpanded ? null : collabId)} 
                                className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-accent text-white' : 'bg-background text-secondary/40'}`}
                              >
                                {isExpanded ? <X className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-dark text-white p-8 rounded-[32px] shadow-premium relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight leading-none uppercase">Consolidação</h3>
                    <p className="text-accent/40 text-[9px] font-black uppercase tracking-widest mt-0.5">Status Auditoria</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-white/5 pb-2">
                    <span className="text-white/50 text-[9px] font-black uppercase tracking-widest">Volume Total</span>
                    <div className="flex items-baseline gap-1">
                       <span className="text-2xl font-black">{totals.latas}</span>
                       <span className="text-[10px] font-black text-accent uppercase">{totals.latas === 1 ? 'lat' : 'lats'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-b border-white/5 pb-2">
                    <span className="text-white/50 text-[9px] font-black uppercase tracking-widest">Colhedores</span>
                    <span className="text-xl font-black">{Object.keys(summary).length}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-accent text-[9px] font-black uppercase tracking-[0.2em] block mb-1">Total Geral</span>
                    <span className="text-4xl font-black text-white leading-none tracking-tighter">{formatCurrency(totals.value)}</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-8">
                <button
                  onClick={handleApprove}
                  disabled={isApproved}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 ${isApproved
                      ? 'bg-success/10 text-success cursor-not-allowed border border-success/20'
                      : 'bg-primary hover:bg-dark text-white transform active:scale-95 shadow-lg shadow-primary/20'
                    }`}
                >
                  {isApproved ? (
                    <><CheckCircle className="w-4 h-4" /> Finalizada</>
                  ) : (
                    <><ClipboardCheck className="w-4 h-4" /> Aprovar</>
                  )}
                </button>

                <div className="mt-4 flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                   <AlertTriangle className="w-4 h-4 text-accent shrink-0" />
                   <p className="text-[8px] text-white/60 leading-relaxed font-bold uppercase tracking-wider">
                      {isApproved 
                        ? 'Semana bloqueada.' 
                        : 'A aprovação impedirá novos registros.'}
                   </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center gap-2 p-6 bg-primary text-white rounded-3xl hover:bg-dark transition-all group shadow-lg shadow-primary/20">
                <Printer className="w-5 h-5 text-white" />
                <span className="text-[9px] font-black uppercase tracking-widest text-center">Imprimir</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 p-6 bg-primary text-white rounded-3xl hover:bg-dark transition-all group shadow-lg shadow-primary/20">
                <User className="w-5 h-5 text-white" />
                <span className="text-[9px] font-black uppercase tracking-widest text-center">Assinar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};
