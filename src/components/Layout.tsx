
import React, { useState, useEffect } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import {
  LayoutDashboard, Users, Pickaxe, CalendarRange,
  ClipboardCheck, Wallet, Settings, Menu, X, Coffee,
  ChevronRight, BarChart3, LogOut, FileText
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-2 rounded-2xl transition-all duration-300 group relative outline-none focus:outline-none border-none ${isActive
        ? 'text-white'
        : 'text-secondary/50 hover:text-primary'
        }`}
    >
      {isActive && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-0 bg-primary shadow-lg shadow-primary/20 rounded-2xl z-0"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      
      <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      
      <span className={`relative z-10 flex-1 font-bold tracking-tight text-sm transition-all duration-300 ${isActive ? 'translate-x-0' : 'group-hover:translate-x-1'}`}>
        {label}
      </span>
      
      {isActive && (
        <motion.div 
          layoutId="active-dot"
          className="relative z-10 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(233,196,106,0.8)] animate-pulse" 
        />
      )}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMenuFocused, setIsMenuFocused] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const routes = ['/', '/colhedores', '/colheita', '/semanas', '/pagamentos', '/relatorios', '/configuracoes'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Somente navega se o menu estiver em foco
      if (!isMenuFocused) return;

      const currentIndex = routes.indexOf(location.pathname);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % routes.length;
        navigate(routes[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + routes.length) % routes.length;
        navigate(routes[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [location.pathname, navigate, isMenuFocused]);

  return (
    <div 
      className="h-screen bg-background flex flex-col md:flex-row font-['Outfit'] overflow-hidden"
      onClick={() => setIsMenuFocused(false)}
    >
      {/* Mobile Top Bar */}
      <header className="md:hidden bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between z-[60]">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <img src="/logo_fazenda.png" alt="Logo" className="w-12 h-12 object-contain" />
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-3 bg-white border border-slate-100 rounded-2xl text-secondary active:scale-90 transition-transform"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar / Drawer */}
      <aside 
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuFocused(true);
        }}
        className={`
        fixed md:sticky md:top-0 inset-y-0 left-0 w-64 bg-white border-r border-slate-100 z-[70] transition-all duration-500 ease-in-out transform
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        h-full flex flex-col ${isMenuFocused ? 'ring-1 ring-inset ring-primary/5 bg-slate-50/10' : ''}
      `}>
        <div className="p-4 hidden md:flex flex-col items-center justify-center gap-2 mb-0">
          <div className="bg-white p-2 rounded-[24px] shadow-2xl shadow-primary/10 border border-slate-50 overflow-hidden transform hover:scale-110 transition-transform duration-500">
            <img src="/logo_fazenda.png" alt="Logo" className="w-32 h-32 object-contain" />
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
          <LayoutGroup>
            <NavItem to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="DASHBOARD" onClick={() => setSidebarOpen(false)} />
            <NavItem to="/colhedores" icon={<Users className="w-5 h-5" />} label="COLABORADORES" onClick={() => setSidebarOpen(false)} />
            <NavItem to="/colheita" icon={<Pickaxe className="w-5 h-5" />} label="COLHEITA" onClick={() => setSidebarOpen(false)} />
            <NavItem to="/semanas" icon={<CalendarRange className="w-5 h-5" />} label="CICLOS DE COLHEITA" onClick={() => setSidebarOpen(false)} />
            <NavItem to="/pagamentos" icon={<Wallet className="w-5 h-5" />} label="PAGAMENTO" onClick={() => setSidebarOpen(false)} />
            <NavItem to="/relatorios" icon={<FileText className="w-5 h-5" />} label="HISTÓRICO" onClick={() => setSidebarOpen(false)} />
            <NavItem to="/configuracoes" icon={<Settings className="w-5 h-5" />} label="AJUSTES" onClick={() => setSidebarOpen(false)} />
          </LayoutGroup>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex flex-col gap-2">
          {user?.email && (
            <div className="px-5 py-1">
              <p className="text-[9px] font-black text-secondary/30 uppercase tracking-widest leading-none mb-1 text-center">Usuário Autenticado</p>
              <p className="text-[10px] font-black text-primary truncate text-center">{user.email}</p>
            </div>
          )}
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-5 py-2.5 text-danger hover:bg-danger/5 rounded-xl transition-all font-bold group text-sm"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Sair do Sistema</span>
          </button>
          
          <div className="mt-2 pt-2 border-t border-slate-100/50">
            <p className="text-[9px] font-black tracking-[0.2em] text-secondary/20 uppercase text-center">
              Criado por <br />
              <span className="text-secondary/40">DGTECH SOLUÇÕES TECNOLÓGICAS</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-dark/40 backdrop-blur-sm z-[65] md:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden bg-background">
        <div className="flex-1 p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-700 min-h-0">
          <div className="max-w-screen-2xl mx-auto min-h-full md:h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

