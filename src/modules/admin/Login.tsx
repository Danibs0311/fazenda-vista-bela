
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Coffee, Lock, Mail, Eye, EyeOff, ArrowRight, Loader2, UserPlus, LogIn, CheckCircle2, XCircle, Leaf } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const from = location.state?.from?.pathname || "/";

  const validatePassword = (pass: string) => {
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[@$!%*?&]/.test(pass);
    const hasMinLen = pass.length >= 8;
    return { hasUpper, hasLower, hasNumber, hasSpecial, hasMinLen };
  };

  const passwordStatus = validatePassword(password);
  const isPasswordValid = Object.values(passwordStatus).every(Boolean);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!isPasswordValid) {
          throw new Error('A senha não atende aos requisitos de segurança.');
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        showToast('Cadastro realizado! Verifique seu e-mail.', 'success');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        showToast('Bem-vindo à Vista Bela!', 'success');
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      showToast(error.message || 'Erro na autenticação. Verifique os dados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Side: Branding & Image */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
          <img 
            src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=2078" 
            alt="Coffee Farm" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-105 hover:scale-100 transition-transform duration-[10000ms]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/40 to-transparent" />
          
          <div className="relative z-10 flex flex-col justify-center gap-4 xl:gap-6 p-8 xl:p-12 w-full h-full overflow-hidden">
            <div className="flex flex-col items-center gap-4 group">
              <div className="bg-white p-3 xl:p-4 rounded-[32px] border border-white/20 animate-float shadow-xl overflow-hidden">
                <img src="/logo_fazenda.png" alt="Logo" className="w-32 h-32 xl:w-40 xl:h-40 object-contain" />
              </div>
            </div>

            <div className="space-y-4 max-w-2xl text-center lg:text-left">
              <h2 className="text-4xl xl:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase">
                EXCELÊNCIA <br />
                <span className="text-accent italic font-serif font-normal lowercase tracking-normal">do grão</span> <br />
                À XÍCARA.
              </h2>
              <div className="w-16 h-1 bg-accent rounded-full shadow-lg shadow-accent/20 mx-auto lg:mx-0" />
              <p className="text-base xl:text-xl text-white/80 max-w-[320px] xl:max-w-md font-medium leading-relaxed mx-auto lg:mx-0">
                Gestão inteligente de colheita para quem valoriza a qualidade e o trabalho no campo.
              </p>
            </div>
          </div>

          <div className="absolute bottom-6 left-12 flex items-center gap-4 text-white/40 text-[10px] font-bold tracking-widest uppercase">
            <Leaf className="w-4 h-4" />
            <span>Sustentabilidade • Tradição • Tecnologia</span>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative bg-background overflow-hidden">
        <div className="w-full max-w-[420px] space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="bg-white p-6 rounded-3xl shadow-xl mb-4 overflow-hidden border border-slate-100">
                <img src="/logo_fazenda.png" alt="Logo" className="w-40 h-40 object-contain" />
              </div>
          </div>

          <div className="space-y-4 text-center lg:text-left">
            <h3 className="text-5xl font-black text-dark tracking-tight leading-none italic">
              {isSignUp ? 'Criar Nova' : 'Seja'} <span className="text-primary not-italic">{isSignUp ? 'Conta' : 'Bem-vindo'}</span>
            </h3>
            <p className="text-secondary/60 font-medium text-lg">
              {isSignUp ? 'Preencha os dados para começar sua jornada.' : 'Acesse o portal de gestão da fazenda.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-8">
            <div className="space-y-2 group">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary/40 px-1 group-focus-within:text-primary transition-colors">Endereço de E-mail</label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary/30 group-focus-within:text-primary transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-primary focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-[28px] py-5 pl-16 pr-6 text-primary outline-none transition-all placeholder:text-primary/20 font-bold shadow-sm"
                  placeholder="exemplo@vistabela.com"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <div className="flex justify-between items-end px-1">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary/40 group-focus-within:text-primary transition-colors">Sua Senha</label>
                {!isSignUp && (
                  <button type="button" className="text-[10px] font-black uppercase tracking-[0.2em] text-accent hover:text-primary transition-colors">
                    Esqueceu?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary/30 group-focus-within:text-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-primary focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-[28px] py-5 pl-16 pr-14 text-primary outline-none transition-all placeholder:text-primary/20 font-bold shadow-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-secondary/30 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {isSignUp && (
                <div className="p-5 bg-white rounded-2xl space-y-3 border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-300 mt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary/40">Requisitos de Segurança</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Requirement label="8+ caracteres" met={passwordStatus.hasMinLen} />
                    <Requirement label="Maiúscula" met={passwordStatus.hasUpper} />
                    <Requirement label="Minúscula" met={passwordStatus.hasLower} />
                    <Requirement label="Número" met={passwordStatus.hasNumber} />
                    <Requirement label="Especial" met={passwordStatus.hasSpecial} />
                  </div>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-400">
                <label className="text-[11px] font-black uppercase tracking-widest text-secondary/40 px-1">Confirmar Senha</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/30 group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-primary focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-[28px] py-5 pl-12 pr-4 text-primary outline-none transition-all placeholder:text-primary/20 font-bold shadow-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && !isPasswordValid)}
              className="w-full bg-primary hover:bg-[#1a3a32] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-[28px] py-6 font-black uppercase tracking-[0.1em] text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-primary/20 group relative overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span className="text-base">{isSignUp ? 'Criar minha conta' : 'Entrar no Sistema'}</span>
                  {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-4">
            <p className="text-secondary/40 text-[11px] font-black uppercase tracking-[0.15em] whitespace-nowrap">
              {isSignUp ? 'Já tem acesso?' : 'Primeiro acesso?'}
            </p>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="flex-1 border-2 border-primary/20 hover:border-primary/60 hover:bg-primary/5 text-primary font-black uppercase tracking-widest text-[10px] py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{isSignUp ? 'Fazer Login' : 'Criar Nova Conta'}</span>
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer info for desktop */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-[0.4em] text-secondary/20 uppercase hidden lg:block">
          Fazenda Vista Bela © 2024
        </div>
      </div>
    </div>
  );
};

const Requirement: React.FC<{ label: string, met: boolean }> = ({ label, met }) => (
  <div className={`flex items-center gap-1.5 transition-colors ${met ? 'text-success' : 'text-slate-300'}`}>
    {met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
    <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
  </div>
);


