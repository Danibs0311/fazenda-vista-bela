
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HarvestLog, Collaborator, HarvestWeek } from '../../types';
import { storage } from '../../services/storageService';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import { 
  Filter, Calendar, Users, Wallet, TrendingUp,
  Search, History, FileText
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface EnrichedHarvestLog extends HarvestLog {
  colaborador?: Collaborator;
}

export const Reports: React.FC = () => {
    const { showToast } = useToast();
    
    // Data States
    const [harvests, setHarvests] = useState<EnrichedHarvestLog[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [weeks, setWeeks] = useState<HarvestWeek[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Advanced Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [bankFilter, setBankFilter] = useState('all');
    const [minVolume, setMinVolume] = useState<string>('');
    const [maxVolume, setMaxVolume] = useState<string>('');
    const [sortBy, setSortBy] = useState<'date' | 'volume' | 'value'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Advanced Filtering & Sorting Logic
    const filteredHistory = useMemo(() => {
        let result = harvests.filter(log => {
            const collab = log.colaborador;
            const searchLower = searchQuery.toLowerCase();
            
            // 1. Search (Name/ID)
            const matchesSearch = !searchQuery || 
                collab?.nome.toLowerCase().includes(searchLower) ||
                collab?.id.toLowerCase().includes(searchLower);

            // 2. Date Range
            const matchesDate = (!dateFilter || log.data_colheita >= dateFilter) && 
                                (!endDateFilter || log.data_colheita <= endDateFilter);
            
            // 3. Bank
            const matchesBank = bankFilter === 'all' || collab?.banco === bankFilter;

            // 4. Volume Range
            const vol = log.quantidade_latas;
            const matchesMinVol = !minVolume || vol >= Number(minVolume);
            const matchesMaxVol = !maxVolume || vol <= Number(maxVolume);

            return matchesSearch && matchesDate && matchesBank && matchesMinVol && matchesMaxVol;
        });

        // 5. Sorting
        return result.sort((a, b) => {
            let valA: any, valB: any;
            if (sortBy === 'date') {
                valA = new Date(a.data_colheita).getTime();
                valB = new Date(b.data_colheita).getTime();
            } else if (sortBy === 'volume') {
                valA = a.quantidade_latas;
                valB = b.quantidade_latas;
            } else {
                valA = a.valor_total_dia;
                valB = b.valor_total_dia;
            }
            return sortOrder === 'desc' ? valB - valA : valA - valB;
        });
    }, [harvests, searchQuery, dateFilter, endDateFilter, bankFilter, minVolume, maxVolume, sortBy, sortOrder]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if no input is focused
            if (document.activeElement?.tagName === 'INPUT') return;
            
            if (filteredHistory.length === 0) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < filteredHistory.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredHistory.length]);

    // Scroll selected into view
    useEffect(() => {
        if (selectedIndex >= 0 && scrollContainerRef.current) {
            const selectedElement = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedIndex]);

    // Reset selection on filter change
    useEffect(() => {
        setSelectedIndex(-1);
    }, [filteredHistory]);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const [h, c, w] = await Promise.all([
                    storage.getHarvests(),
                    storage.getCollaborators(),
                    storage.getWeeks()
                ]);

                const enriched = h.map(log => ({
                    ...log,
                    colaborador: c.find(collab => collab.id === log.colaborador_id)
                }));

                setHarvests(enriched);
                setCollaborators(c);
                setWeeks(w.sort((a: any, b: any) => b.id.localeCompare(a.id)));
            } catch (error: any) {
                showToast('Erro ao carregar dados: ' + error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [showToast]);

    // Summary Logic based on filtered results
    const summary = useMemo(() => {
        const totalLatas = filteredHistory.reduce((sum, h) => sum + h.quantidade_latas, 0);
        const totalValue = filteredHistory.reduce((sum, h) => sum + h.valor_total_dia, 0);
        
        return { totalLatas, totalValue };
    }, [filteredHistory]);

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-700 overflow-hidden">
            {/* Unified Header - CLEANER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-primary/10 rounded-[22px] text-primary shadow-inner shadow-primary/5">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-dark tracking-tight leading-none uppercase italic">HISTÓRICO <span className="text-primary not-italic">GERAL</span></h1>
                        <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            Controle de registros e conferência
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                    {/* Sidebar Filters - History (WIDER) */}
                    <div className="lg:col-span-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-1 overflow-hidden">
                        <div className="flex flex-col gap-3 mb-0 px-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <Filter className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="font-black text-dark uppercase tracking-tight text-base italic whitespace-nowrap">FILTROS <span className="text-primary not-italic">AVANÇADOS</span></h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setSearchQuery(''); setDateFilter(''); setEndDateFilter('');
                                    setBankFilter('all'); setMinVolume(''); setMaxVolume('');
                                    setSortBy('date'); setSortOrder('desc');
                                }}
                                className="w-full py-2 bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 rounded-xl transition-all shadow-md shadow-[#2F5D50]/20 text-[10px] font-black uppercase tracking-[0.1em] border-none outline-none flex items-center justify-center gap-2 mt-2"
                            >
                                Limpar Todos os Filtros
                            </button>
                        </div>

                        <div className="flex-1 space-y-2.5 overflow-hidden">
                            {/* 1. Search */}
                            <div className="space-y-0.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-secondary/60 px-1 leading-none">Busca Global</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/30" />
                                    <input
                                        type="text"
                                        placeholder="Nome ou ID..."
                                        className="w-full bg-slate-50 border border-transparent focus:border-primary/30 rounded-xl py-3 pl-10 pr-4 text-primary font-bold text-xs outline-none transition-all shadow-sm"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* 2. Period Shortcuts & Range */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-secondary/60">Período</label>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => { const d = new Date().toISOString().split('T')[0]; setDateFilter(d); setEndDateFilter(d); }}
                                            className="px-2 py-0.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-md text-[8px] font-black uppercase transition-all"
                                        >Hoje</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className="w-full bg-slate-50 border border-transparent focus:border-primary/30 rounded-xl py-2.5 px-3 text-primary font-bold text-[11px] outline-none" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                                    <input type="date" className="w-full bg-slate-50 border border-transparent focus:border-primary/30 rounded-xl py-2.5 px-3 text-primary font-bold text-[11px] outline-none" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
                                </div>
                            </div>

                            {/* 4. Bank Only */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-secondary/60 px-1">Instituição Bancária</label>
                                    <select className="w-full bg-slate-50 border border-transparent focus:border-primary/30 rounded-xl py-2.5 px-3 text-primary font-bold text-[12px] outline-none cursor-pointer" value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
                                        <option value="all">Todos os Bancos</option>
                                        {Array.from(new Set(collaborators.map(c => c.banco).filter(Boolean))).sort().map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Summary Card - CLEAN ANALYTICAL STYLE */}
                            <div className="bg-slate-50 p-4 rounded-[28px] border border-slate-100 shadow-sm relative overflow-hidden mt-1 group hover:border-primary/20 transition-all">
                                <div className="absolute -top-4 -right-4 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                                    <TrendingUp className="w-16 h-16 text-primary" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-secondary/70 uppercase tracking-widest block">Volume Total</span>
                                        <span className="text-lg font-black block leading-none text-primary">{summary.totalLatas.toFixed(1)} <span className="text-[9px] opacity-40">LTS</span></span>
                                    </div>
                                    <div className="space-y-1 border-l border-slate-200 pl-4">
                                        <span className="text-[8px] font-black text-secondary/70 uppercase tracking-widest block">Custo Estimado</span>
                                        <span className="text-lg font-black block leading-none tracking-tighter text-success">{formatCurrency(summary.totalValue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Records Main Panel */}
                    <div className="lg:col-span-8 bg-white p-8 rounded-[40px] border border-slate-100 shadow-premium flex flex-col overflow-hidden relative">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <History className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="font-black text-dark uppercase tracking-tight text-base italic">REGISTROS DE <span className="text-primary not-italic">COLHEITA</span></h3>
                            </div>
                        </div>

                        {/* Green Index Header - MAXIMUM COHESION */}
                        <div className="bg-primary py-2.5 px-3 rounded-xl grid grid-cols-12 gap-0.5 mb-2 shadow-md shadow-primary/20 border-b-2 border-primary-dark/20 relative z-10 mr-[6px]">
                            <div className="col-span-2 text-xs font-black text-white uppercase tracking-tighter flex items-center">Data</div>
                            <div className="col-span-1 text-xs font-black text-white uppercase tracking-tighter flex items-center">ID</div>
                            <div className="col-span-5 text-xs font-black text-white uppercase tracking-widest flex items-center pl-1">Colaborador</div>
                            <div className="col-span-2 text-xs font-black text-white uppercase tracking-tighter flex items-center justify-end pr-1">Volume</div>
                            <div className="col-span-2 text-xs font-black text-white uppercase tracking-widest flex items-center justify-end">Total</div>
                        </div>
                        
                        <div 
                            ref={scrollContainerRef}
                            className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1" 
                            style={{ scrollbarGutter: 'stable' }}
                        >
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map((harvest, idx) => {
                                    const collaborator = collaborators.find(c => c.id === harvest.colaborador_id);
                                    const isSelected = idx === selectedIndex;
                                    return (
                                        <div 
                                            key={harvest.id}
                                            onClick={() => setSelectedIndex(idx)}
                                            className={`grid grid-cols-12 gap-0.5 px-3 py-2 rounded-xl transition-all border-2 items-center group relative overflow-hidden cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10 scale-[1.01] z-20' 
                                                    : idx % 2 === 0 
                                                        ? 'bg-slate-50/50 hover:bg-white border-transparent' 
                                                        : 'bg-white hover:bg-slate-50 border-transparent'
                                            } hover:shadow-md hover:z-10`}
                                        >
                                            {/* Data (Left) */}
                                            <div className="col-span-2 text-xs font-black text-dark/60 italic leading-none whitespace-nowrap">
                                                {formatDate(harvest.data_colheita)}
                                            </div>
                                            
                                            {/* ID (Left) */}
                                            <div className="col-span-1 flex items-center">
                                                <span className="text-xs font-black text-primary tracking-wide whitespace-nowrap">
                                                    ID:{harvest.colaborador_id}
                                                </span>
                                            </div>

                                            {/* Name (MAX SPACE) */}
                                            <div className="col-span-5 flex flex-col min-w-0 pl-1">
                                                <span className="text-xs font-black text-dark group-hover:text-primary transition-colors truncate uppercase leading-tight">
                                                    {collaborator?.nome || 'N/A'}
                                                </span>
                                                <span className="text-[9px] font-black text-secondary/30 uppercase tracking-[0.1em] truncate">
                                                    {collaborator?.banco || 'SEM BANCO'}
                                                </span>
                                            </div>

                                            {/* Volume (Right grouped) */}
                                            <div className="col-span-2 flex justify-end items-center gap-1 pr-1">
                                                <span className="text-xs font-black text-dark">{harvest.quantidade_latas}</span>
                                                <span className="text-[10px] font-bold text-secondary/40 uppercase tracking-tighter">latas</span>
                                            </div>

                                            {/* Total (Right grouped) */}
                                            <div className="col-span-2 text-right">
                                                <span className="text-xs font-black text-success tracking-tighter">
                                                    {formatCurrency(harvest.valor_total_dia)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                                    <Search className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Nenhum registro encontrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
