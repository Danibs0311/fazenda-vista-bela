
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
    <div className="h-screen w-full flex bg-background overflow-hidden selection:bg-primary/10">
      {/* Left Side: Branding & Image */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=2078" 
            alt="Coffee Farm" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/40 to-primary/95" />
               <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-6 gap-6">
            <div className="flex flex-col items-center group">
              <div className="bg-white p-3.5 rounded-[32px] shadow-2xl border border-white/20 transform hover:rotate-2 transition-transform duration-500">
                <img src="/logo_fazenda.png" alt="Logo" className="w-28 h-28 xl:w-40 xl:h-40 object-contain" />
              </div>
            </div>

            <div className="space-y-4 text-center max-w-xl">
              <h2 className="text-3xl xl:text-6xl font-black text-white leading-[0.9] tracking-tighter uppercase drop-shadow-2xl">
                EXCELÊNCIA <br />
                <span className="text-accent italic font-serif font-normal lowercase tracking-normal block -mt-1">do grão</span>
                À XÍCARA.
              </h2>
              <div className="w-20 h-1.5 bg-accent rounded-full mx-auto shadow-lg shadow-accent/40" />
              <p className="text-sm xl:text-lg text-white/90 font-medium leading-relaxed max-w-sm mx-auto uppercase tracking-wide">
                Gestão inteligente de colheita para quem valoriza a qualidade e o trabalho no campo.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 relative bg-background overflow-hidden">
        <div className="w-full max-w-[380px] flex flex-col animate-in fade-in zoom-in-95 duration-700">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-4">
              <div className="bg-white p-4 rounded-3xl shadow-xl mb-2 overflow-hidden border border-slate-100">
                <img src="/logo_fazenda.png" alt="Logo" className="w-24 h-24 object-contain" />
              </div>
          </div>

          <div className="space-y-1 text-center lg:text-left mb-6">
            <h3 className="text-3xl xl:text-5xl font-black text-dark tracking-tight leading-none italic">
              {isSignUp ? 'Criar Nova' : 'Seja'} <span className="text-primary not-italic">{isSignUp ? 'Conta' : 'Bem-vindo'}</span>
            </h3>
            <p className="text-secondary/60 font-medium text-sm xl:text-base">
              {isSignUp ? 'Preencha os dados abaixo.' : 'Portal de gestão da fazenda.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5 group">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40 px-1 group-focus-within:text-primary transition-colors">Endereço de E-mail</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary/30 group-focus-within:text-primary transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-primary focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 pl-14 pr-4 text-primary outline-none transition-all placeholder:text-primary/10 font-bold shadow-sm text-sm"
                  placeholder="exemplo@vistabela.com"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40 group-focus-within:text-primary transition-colors">Sua Senha</label>
                {!isSignUp && (
                  <button type="button" className="text-[9px] font-black uppercase tracking-[0.2em] text-accent hover:text-primary transition-colors">
                    Esqueceu?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary/30 group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-primary focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 pl-14 pr-12 text-primary outline-none transition-all placeholder:text-primary/10 font-bold shadow-sm text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/30 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {isSignUp && (
                <div className="p-4 bg-white rounded-xl space-y-2 border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <Requirement label="8+ chars" met={passwordStatus.hasMinLen} />
                    <Requirement label="Maiúscula" met={passwordStatus.hasUpper} />
                    <Requirement label="Minúscula" met={passwordStatus.hasLower} />
                    <Requirement label="Número" met={passwordStatus.hasNumber} />
                  </div>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-400">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 px-1">Confirmar Senha</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary/30 group-focus-within:text-primary transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-primary focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 pl-14 pr-4 text-primary outline-none transition-all placeholder:text-primary/10 font-bold shadow-sm text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && !isPasswordValid)}
              className="w-full bg-[#2F5D50] hover:bg-[#1a3a32] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl py-5 font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-primary/30 group relative overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="relative z-10">{isSignUp ? 'Criar minha conta' : 'Entrar no Sistema'}</span>
                  {isSignUp ? <UserPlus className="w-5 h-5 relative z-10" /> : <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />}
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] font-bold text-secondary/60">
              {isSignUp ? 'Já possui acesso?' : 'Ainda não tem uma conta?'} <br />
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="mt-2 text-primary font-black uppercase tracking-widest hover:text-accent transition-all text-xs"
              >
                {isSignUp ? 'Fazer Login agora' : 'Criar minha conta agora'}
              </button>
            </p>
          </div>

          <div className="pt-6 text-center">
            <p className="text-[9px] font-black tracking-[0.2em] text-secondary/30 uppercase">
              Desenvolvido por <br />
              <span className="text-primary/60">DGTECH SOLUÇÕES TECNOLÓGICAS</span>
            </p>
          </div>
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


