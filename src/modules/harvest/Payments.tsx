
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../../services/storageService';
import { HarvestWeek, WeekStatus, HarvestLog, Collaborator } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import { Wallet, CheckCircle, FileText, Download, Building2, Search, ArrowLeftRight, CreditCard, PiggyBank, Receipt, ChevronRight, ChevronLeft, Filter, User } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Payments: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<HarvestWeek | null>(null);
  const [weeks, setWeeks] = useState<HarvestWeek[]>([]);
  const [harvests, setHarvests] = useState<HarvestLog[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('Todos');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allWeeks = await storage.getWeeks();
    const paymentWeeks = allWeeks.filter(w => [WeekStatus.IN_CONFERENCE, WeekStatus.PAID].includes(w.status))
      .sort((a, b) => b.id.localeCompare(a.id));

    setWeeks(paymentWeeks);
    if (paymentWeeks.length > 0 && !selectedWeek) setSelectedWeek(paymentWeeks[0]);

    const [h, c] = await Promise.all([
      storage.getHarvests(),
      storage.getCollaborators()
    ]);
    setHarvests(h);
    setCollaborators(c);
  };

  const weekData = useMemo(() => {
    if (!selectedWeek) return [];
    const logs = harvests.filter(h => h.semana_id === selectedWeek.id);
    const groups: Record<string, any> = {};

    logs.forEach(log => {
      const collab = collaborators.find(c => c.id === log.colaborador_id);
      if (!collab) return;

      if (!groups[collab.id]) {
        groups[collab.id] = {
          collab,
          latas: 0,
          total: 0
        };
      }
      groups[collab.id].latas += log.quantidade_latas;
      groups[collab.id].total += log.valor_total_dia;
    });

    return Object.values(groups);
  }, [selectedWeek, harvests, collaborators]);

  const banks = useMemo(() => {
    const b = new Set<string>();
    weekData.forEach(d => b.add(d.collab.banco));
    return ['Todos', ...Array.from(b)];
  }, [weekData]);

  const filteredData = useMemo(() => {
    if (selectedBank === 'Todos') return weekData;
    return weekData.filter(d => d.collab.banco === selectedBank);
  }, [weekData, selectedBank]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredData.length === 0) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredData.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredData]);

  // Reset selection when bank or week changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [selectedBank, selectedWeek]);

  // Scroll into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.getElementById(`pay-row-${selectedIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Close menu on click outside
  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleClick = () => setIsExportMenuOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isExportMenuOpen]);

  const generateAndDownloadPDF = async (bankName: string, data: any[]) => {
    if (data.length === 0) return;
    
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
      
      // Main Header - Refined & Corrected
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0); // Solid Black
      doc.setFont('helvetica', 'bold');
      doc.text('FAZENDA VISTA BELA - JOÃO CORDEIRO NEVES', 14, 18);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('RELAÇÃO DOS DEPÓSITOS DAS COLHEITAS MANUAL DE CAFÉ', 14, 25);
      
      doc.setDrawColor(0, 0, 0); // Solid Black
      doc.line(14, 32, 282, 32); // Landscape width

      // Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`BONITO - UTINGA / PERÍODO: ${selectedWeek ? `${formatDate(selectedWeek.data_inicio)} - ${formatDate(selectedWeek.data_fim)}` : 'N/A'}`, 14, 42);
      
      doc.setFontSize(11);
      doc.text(`BANCO: ${bankName.toUpperCase()}`, 14, 49);
      
      const tableData = data.map(d => [
        d.collab.id, // Nº Cadastro (Sequential)
        d.collab.nome.toUpperCase(),
        d.collab.cpf || '-',
        d.latas.toString(),
        d.collab.banco.toUpperCase(),
        d.collab.agencia || '-',
        d.collab.tipo_conta || '-',
        d.collab.conta || '-',
        formatCurrency(d.total)
      ]);
      
      autoTable(doc, {
        startY: 60,
        head: [['Nº CADASTRO', 'BENEFICIÁRIO', 'CPF', 'LATS A PAGAR', 'BANCO', 'AG.', 'OP.', 'Nº CONTA', 'VALOR DO DEPÓSITO']],
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
          0: { cellWidth: 25, halign: 'center' }, // Nº Cadastro
          1: { cellWidth: 60 }, // Beneficiário
          2: { cellWidth: 30, halign: 'center' }, // CPF
          3: { cellWidth: 25, halign: 'center' }, // Latas
          4: { cellWidth: 30, halign: 'center' }, // Banco
          5: { cellWidth: 20, halign: 'center' }, // Ag.
          6: { cellWidth: 15, halign: 'center' }, // Op.
          7: { cellWidth: 25, halign: 'center' }, // Nº Conta
          8: { cellWidth: 35, halign: 'right', fontStyle: 'bold' } // Valor
        }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 70;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0); // Solid Black
      doc.text(`TOTAL GERAL: ${formatCurrency(data.reduce((s, d) => s + d.total, 0))}`, 282, finalY + 10, { align: 'right' });
      
      doc.save(`Folha_${bankName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showToast('Erro técnico ao gerar o arquivo.', 'error');
    }
  };

  const handleExport = async (bank: string) => {
    setIsExportMenuOpen(false);
    
    if (bank === 'Todos') {
      const activeBanks = banks.filter(b => b !== 'Todos');
      showToast(`Iniciando geração de ${activeBanks.length} arquivos...`, 'success');
      
      for (const b of activeBanks) {
        const bankData = weekData.filter(d => d.collab.banco === b);
        await generateAndDownloadPDF(b, bankData);
        // Small delay to prevent browser issues
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      const bankData = weekData.filter(d => d.collab.banco === bank);
      showToast(`Baixando arquivo...`, 'success');
      generateAndDownloadPDF(bank, bankData);
    }
  };

  const handlePay = async () => {
    if (!selectedWeek) return;
    if (confirm('Confirmar o pagamento deste ciclo?')) {
      try {
        await storage.saveWeek({
          ...selectedWeek,
          status: WeekStatus.PAID,
          data_pagamento: new Date().toISOString()
        });
        showToast('Pagamento registrado com sucesso!', 'success');
        await loadData();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const handlePrevWeek = () => {
    if (!selectedWeek || weeks.length <= 1) return;
    const currentIndex = weeks.findIndex(w => w.id === selectedWeek.id);
    if (currentIndex < weeks.length - 1) {
      setSelectedWeek(weeks[currentIndex + 1]);
    }
  };

  const handleNextWeek = () => {
    if (!selectedWeek || weeks.length <= 1) return;
    const currentIndex = weeks.findIndex(w => w.id === selectedWeek.id);
    if (currentIndex > 0) {
      setSelectedWeek(weeks[currentIndex - 1]);
    }
  };

  if (weeks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 mb-8">
          <PiggyBank className="w-16 h-16 text-slate-200" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Tudo Liquidado!</h2>
        <p className="text-slate-500 max-w-sm mt-2 font-medium">As semanas precisam ser aprovadas na conferência antes de aparecerem aqui.</p>
      </div>
    );
  }

  const currentTotal = filteredData.reduce((s, d) => s + d.total, 0);

  return (
    <div className="h-auto min-h-full md:h-full flex flex-col space-y-6 animate-in fade-in duration-700 overflow-visible md:overflow-hidden pb-10 md:pb-0">
      {/* Header Section - Standardized */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="space-y-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-full">Financeiro</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-dark tracking-tight leading-none uppercase italic">PAGAMENTO</h1>
          <p className="text-secondary/60 font-medium text-[10px]">Processamento de pagamentos</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Reference Selector - Arrows Inside */}
          <div className="bg-primary px-4 py-2 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-between border border-white/5 h-[56px] w-[260px] group transition-all hover:bg-dark">
            <button 
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 leading-none">Referência</span>
                <div className="relative w-full text-center">
                  <select
                    className="appearance-none bg-transparent font-black text-white text-[14px] outline-none cursor-pointer uppercase tracking-tighter w-full text-center pr-0"
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
            </div>

            <button 
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Today Card - Standardized to Primary */}
          <div className="bg-primary text-white px-5 py-2 rounded-2xl shadow-lg shadow-primary/20 flex flex-col items-center justify-center border border-white/5 h-[56px] w-[140px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80 leading-none">Hoje</span>
              <span className="text-[15px] font-black text-white mt-0.5 uppercase whitespace-nowrap tracking-wide">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
          </div>
        </div>
      </div>

      {/* Content Area - Optimized for Fixed Header */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Stats Cards - Standardized to Primary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-primary p-4 rounded-3xl text-white flex items-center gap-4 shadow-lg shadow-primary/20 border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md">
                 <Receipt className="w-5 h-5 !text-white" />
              </div>
              <div>
                 <p className="text-[8px] font-black uppercase tracking-widest text-white/80 leading-none">Volume Total</p>
                 <p className="text-xl font-black text-white mt-1 leading-none">
                    {filteredData.reduce((s, d) => s + d.latas, 0)} <span className="text-[10px] font-bold text-white/70 uppercase">lats</span>
                 </p>
              </div>
           </div>
           <div className="bg-primary p-4 rounded-3xl text-white flex items-center gap-4 shadow-lg shadow-primary/20 border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md">
                 <ArrowLeftRight className="w-5 h-5 !text-white" />
              </div>
              <div>
                 <p className="text-[8px] font-black uppercase tracking-widest text-white/80 leading-none">Transferências</p>
                 <p className="text-xl font-black text-white mt-1 leading-none">{filteredData.length}</p>
              </div>
           </div>
           <div className="bg-primary p-4 rounded-3xl text-white flex items-center gap-4 shadow-lg shadow-primary/20 border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md">
                 <Wallet className="w-5 h-5 !text-white" />
              </div>
              <div>
                 <p className="text-[8px] font-black uppercase tracking-widest text-white/80 leading-none">Montante Final</p>
                 <p className="text-2xl font-black !text-white mt-1 leading-none tracking-tight">
                    {formatCurrency(currentTotal)}
                 </p>
              </div>
           </div>
        </div>

        {/* Bank Filter Tabs - Compact & Optimized */}
        <div className="flex flex-wrap items-center gap-2 px-1 py-0.5">
          {banks.map(bank => (
            <button
              key={bank}
              onClick={() => setSelectedBank(bank)}
              className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all border-2 shadow-md ${selectedBank === bank
               ? '!bg-primary !text-white border-primary shadow-lg shadow-primary/20 scale-105 z-10'
                : 'bg-white text-primary border-primary hover:bg-primary/5'
                }`}
            >
              {bank}
            </button>
          ))}
        </div>

        {/* List Table - With Sticky Header */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[32px] border border-slate-100/50 shadow-premium overflow-hidden">
          <div className="p-3 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 bg-white z-20">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-background rounded-xl text-accent">
                  <Building2 className="w-5 h-5" />
               </div>
               <div>
                  <h3 className="text-lg font-black text-dark uppercase tracking-tight">Extrato Bancário: <span className="text-primary">{selectedBank}</span></h3>
               </div>
            </div>
             <div className="flex flex-wrap gap-2 relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExportMenuOpen(!isExportMenuOpen);
                }}
                className="flex items-center gap-2 px-6 py-2.5 !bg-primary !text-white border-2 border-primary rounded-xl font-black text-[11px] uppercase tracking-widest hover:!bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                 <FileText className="w-4 h-4" /> Gerar Folha de Pagamento
              </button>

              {isExportMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="px-4 pb-2 mb-2 border-b border-slate-50">
                    <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Selecionar Banco</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto no-scrollbar">
                    {banks.map(bank => (
                      <button
                        key={bank}
                        onClick={() => handleExport(bank)}
                        className="w-full text-left px-4 py-2.5 hover:bg-primary/5 flex items-center justify-between group transition-colors"
                      >
                        <span className={`text-[12px] font-black uppercase tracking-tight ${bank === 'Todos' ? 'text-primary' : 'text-dark'}`}>
                          {bank}
                        </span>
                        <ChevronRight className="w-4 h-4 text-secondary/20 group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-auto no-scrollbar w-full">
            <table className="w-full min-w-[750px] text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[9px] font-black uppercase tracking-[0.2em] text-secondary/70">
                  <th className="px-8 py-2 border-b border-slate-100">Beneficiário</th>
                  <th className="px-8 py-2 border-b border-slate-100">Dados Bancários</th>
                  <th className="px-8 py-2 border-b border-slate-100 text-center">Produção</th>
                  <th className="px-8 py-2 border-b border-slate-100 text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/20">
                {filteredData.map((d, index) => (
                  <tr 
                    id={`pay-row-${index}`}
                    key={d.collab.id} 
                    className={`transition-all group border-l-4 ${
                      selectedIndex === index 
                        ? 'bg-primary/10 border-primary shadow-sm' 
                        : 'hover:bg-slate-50/50 border-transparent'
                    }`}
                  >
                    <td className="px-8 py-4 border-t border-primary/10">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                           selectedIndex === index ? 'bg-primary text-white' : 'bg-background text-secondary/20 group-hover:bg-white'
                         }`}>
                            <User className="w-4 h-4" />
                         </div>
                         <div>
                            <div className={`font-black uppercase tracking-tight leading-none text-[13px] transition-colors ${
                              selectedIndex === index ? 'text-primary' : 'text-dark group-hover:text-primary'
                            }`}>
                               {d.collab.nome}
                            </div>
                            <div className="text-[9px] text-secondary/60 font-bold mt-1 tracking-widest uppercase italic leading-none">{d.collab.tipo_conta}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 border-t border-primary/10">
                      <div className="flex items-center gap-3">
                         <div className="px-2.5 py-1 bg-background border border-primary/20 rounded-lg text-[9px] font-black text-secondary/80 uppercase tracking-tighter">{d.collab.banco}</div>
                         <div className="text-[13px] font-black text-dark font-mono tracking-tighter">
                            AG {d.collab.agencia} <span className="text-secondary/40 mx-1">•</span> CC {d.collab.conta}
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 border-t border-primary/10 text-center">
                       <div className="inline-flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                          <Receipt className="w-3 h-3 text-primary" />
                          <span className="text-[11px] font-black text-primary uppercase tracking-tighter">{d.latas} lats</span>
                       </div>
                    </td>
                    <td className="px-8 py-4 border-t border-primary/10 text-right">
                       <span className="font-black text-success text-lg tracking-tight leading-none">
                          {formatCurrency(d.total)}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot 
                id={`pay-row-${filteredData.length}`}
                className={`transition-all ${selectedIndex === filteredData.length ? 'bg-primary/20 ring-2 ring-primary ring-inset' : 'bg-primary/5'}`}
              >
                <tr className="border-t-2 border-primary">
                  <td className="px-8 py-4 font-black text-primary uppercase text-[11px] tracking-[0.2em]">Total ({selectedBank})</td>
                  <td colSpan={2} className="px-8 py-4 text-center font-bold text-secondary/70 text-[10px] uppercase tracking-widest">
                    {filteredData.length} Lançamentos
                  </td>
                  <td className="px-8 py-4 text-right font-black text-primary text-xl tracking-tighter">
                    {formatCurrency(currentTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
