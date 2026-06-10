
import React, { useMemo, useState, useEffect } from 'react';
import { HarvestLog, Collaborator } from '../../types';
import { Link } from 'react-router-dom';
import { storage } from '../../services/storageService';
import { getWeekRange, formatCurrency, formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp, Users, Package, Wallet, CalendarCheck,
  Pickaxe, Sparkles, ArrowUpRight, ChevronRight, ChevronLeft, Coffee, Database
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';


const StatCard: React.FC<{ label: string, value: string | number, subValue?: string, icon: React.ReactNode, color: string }> = ({ label, value, subValue, icon, color }) => (
  <div className="stat-card group">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2.5 rounded-xl ${color} text-white shadow-lg shadow-primary/10 transform group-hover:rotate-6 transition-transform`}>
        {icon}
      </div>
    </div>
    <div>
      <p className="text-[11px] font-black uppercase tracking-widest text-dark/60 mb-1">{label}</p>
      <h3 className="text-2xl font-black text-dark tracking-tight leading-none">{value}</h3>
      {subValue && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-1 h-1 rounded-full bg-accent" />
          <p className="text-[11px] text-dark/80 font-black uppercase tracking-tight">{subValue}</p>
        </div>
      )}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeek = useMemo(() => getWeekRange(undefined, weekOffset), [weekOffset]);
  const [harvests, setHarvests] = useState<HarvestLog[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const [h, c] = await Promise.all([
          storage.getHarvestsByWeek(currentWeek.id),
          storage.getCollaborators(true) // Force fresh fetch to bypass memory cache
        ]);
        setHarvests(h);
        setCollaborators(c);
      } catch (error) {
        console.error("Erro ao carregar dados do painel:", error);
      }
    };
    
    // Initial load
    load();

    // Auto-refresh every 5 seconds
    const interval = setInterval(load, 5000);

    // Event listener for tab active/focus (unlock mobile, switch tab, etc.)
    const handleFocus = () => {
      load();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentWeek.id]);



  const currentWeekHarvests = harvests.filter(h => h.semana_id === currentWeek.id);
  const totalLatas = currentWeekHarvests.reduce((sum, h) => sum + h.quantidade_latas, 0);
  const totalValue = currentWeekHarvests.reduce((sum, h) => sum + h.valor_total_dia, 0);
  
  // Apenas colaboradores que colheram nesta semana
  const weeklyActiveCollabsCount = new Set(currentWeekHarvests.map(h => h.colaborador_id)).size;

  const chartData = useMemo(() => {
    // Show 7 days starting from the selected week start (Friday)
    const start = new Date(currentWeek.start + 'T12:00:00');
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    return days.map(date => {
      const dayHarvests = harvests.filter(h => h.data_colheita === date);
      return {
        name: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }),
        latas: dayHarvests.reduce((sum, h) => sum + h.quantidade_latas, 0),
        fullDate: date
      };
    });
  }, [harvests, currentWeek]);

  return (
    <div className="h-auto min-h-full md:h-full flex flex-col space-y-3 page-transition overflow-visible md:overflow-hidden">
      {/* Header - Standardized height and style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="space-y-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-full">Sistema Ativo</span>
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-dark tracking-tight leading-none uppercase italic">DASHBOARD</h1>
          <p className="text-secondary/60 font-medium text-[10px]">Bem-vindo, {user?.email?.split('@')[0] || 'Gestor'}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Cycle Selector - Standardized & Centralized */}
          <div className="bg-primary px-4 py-2 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-between border border-white/5 h-[52px] w-full sm:w-[240px] flex-1 sm:flex-none">
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white hover:scale-110 transition-all active:scale-90 flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5 !text-white stroke-[3]" />
            </button>
            <div className="flex flex-col items-center flex-1 min-w-0">
               <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/50 leading-none mb-1">Ciclo de Produção</span>
               <span className="text-[13px] font-black text-white tabular-nums uppercase whitespace-nowrap overflow-hidden">
                 {formatDate(currentWeek.start)} a {formatDate(currentWeek.end)}
               </span>
            </div>
            <button 
              onClick={() => setWeekOffset(prev => prev + 1)}
              disabled={weekOffset >= 0}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white hover:scale-110 transition-all active:scale-90 disabled:opacity-10 flex-shrink-0"
            >
              <ChevronRight className="w-5 h-5 !text-white stroke-[3]" />
            </button>
          </div>



          {/* Today Card - Standardized & Centralized */}
          <div className="bg-primary text-white px-5 py-2 rounded-xl shadow-lg shadow-primary/20 flex flex-col items-center justify-center border border-white/5 h-[52px] w-full sm:w-[240px] flex-1 sm:flex-none">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none">Hoje</span>
              <span className="text-[13px] font-black text-white mt-0.5 uppercase whitespace-nowrap tracking-wide">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 space-y-3">
        {/* KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Colheita" 
            value={`${totalLatas} ${totalLatas === 1 ? 'lat' : 'lats'}`} 
            subValue="Ciclo atual" 
            icon={<Package className="w-5 h-5" />} 
            color="bg-primary" 
          />
          <StatCard 
            label="Previsto" 
            value={formatCurrency(totalValue)} 
            subValue="A pagar" 
            icon={<Wallet className="w-5 h-5" />} 
            color="bg-accent" 
          />
          <StatCard 
            label="Colaboradores" 
            value={weeklyActiveCollabsCount} 
            subValue="Colhendo nesta semana" 
            icon={<Users className="w-5 h-5" />} 
            color="bg-success" 
          />
          <StatCard 
            label="Produtividade" 
            value={(totalLatas / (weeklyActiveCollabsCount || 1)).toFixed(1)} 
            subValue="Média/colhedor" 
            icon={<TrendingUp className="w-5 h-5" />} 
            color="bg-secondary" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-12 bg-white p-4 rounded-3xl border border-slate-100/50 shadow-premium relative overflow-hidden group">
            <div className="flex justify-between items-center mb-2 relative z-10">
              <div>
                <h2 className="text-xl font-black text-dark tracking-tight leading-none uppercase">Produção Diária</h2>
                <p className="text-dark/60 text-xs font-bold mt-1.5 uppercase tracking-wide">Ciclo Selecionado</p>
              </div>
              <div className="p-2 bg-background rounded-lg">
                 <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>
            
            <div className="h-44 w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2F5D50" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#1E3A32" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#1F2421', fontSize: 11, fontWeight: 900 }} 
                    dy={10} 
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#f8fafc', radius: 10 }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.08)', padding: '10px' }}
                    itemStyle={{ fontWeight: 800, color: '#1F2421', fontSize: '12px' }}
                  />
                  <Bar dataKey="latas" radius={[8, 8, 8, 8]} barSize={28} fill="url(#barGradient)">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        className="transition-all duration-500 hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

