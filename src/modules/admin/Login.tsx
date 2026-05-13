
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
    <div className="min-h-screen flex bg-background">
      {/* Left Side: Branding & Image */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
          <img 
            src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=2078" 
            alt="Coffee Farm" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-105 hover:scale-100 transition-transform duration-[10000ms]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/40 to-transparent" />
          
          <div className="relative z-10 flex flex-col justify-between p-24 w-full">
            <div className="flex flex-col items-center gap-6 group">
              <div className="bg-white p-4 rounded-[40px] border border-white/20 animate-float shadow-2xl overflow-hidden">
                <img src="/logo_fazenda.png" alt="Logo" className="w-48 h-48 object-contain" />
              </div>
            </div>

            <div className="space-y-8 max-w-2xl">
              <h2 className="text-7xl xl:text-8xl font-black text-white leading-[0.85] tracking-tighter">
                EXCELÊNCIA <br />
                <span className="text-accent italic font-serif">DO GRÃO</span> <br />
                À XÍCARA.
              </h2>
              <div className="w-24 h-1.5 bg-accent rounded-full shadow-lg shadow-accent/20" />
              <p className="text-xl text-white/80 max-w-md font-medium leading-relaxed">
                Gestão inteligente de colheita para quem valoriza a qualidade e o trabalho no campo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-white/40 text-sm font-bold tracking-widest uppercase">
            <Leaf className="w-5 h-5" />
            <span>Sustentabilidade • Tradição • Tecnologia</span>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 relative bg-background">
        <div className="w-full max-w-[480px] space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="bg-white p-4 rounded-3xl shadow-xl mb-4 overflow-hidden border border-slate-100">
                <img src="/logo_fazenda.png" alt="Logo" className="w-32 h-32 object-contain" />
              </div>
          </div>

          <div className="space-y-4">
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
                  className="w-full bg-white border-2 border-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 rounded-[28px] py-5 pl-16 pr-6 text-primary outline-none transition-all placeholder:text-primary/20 font-bold shadow-sm"
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
                  className="w-full bg-white border-2 border-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 rounded-[28px] py-5 pl-16 pr-14 text-primary outline-none transition-all placeholder:text-primary/20 font-bold shadow-sm"
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
                    className="w-full bg-white border-2 border-slate-200/60 focus:border-primary/30 focus:bg-white rounded-2xl py-4.5 pl-12 pr-4 text-dark outline-none transition-all placeholder:text-slate-300 font-medium shadow-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && !isPasswordValid)}
              className="w-full bg-primary hover:bg-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl py-5 font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-primary/10 group relative overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span className="text-lg">{isSignUp ? 'Criar minha conta' : 'Entrar no Sistema'}</span>
                  {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </>
              )}
            </button>
          </form>

          <div className="pt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="group text-secondary font-bold hover:text-primary transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <span className="border-b-2 border-transparent group-hover:border-primary transition-all">
                {isSignUp ? 'Já possui uma conta? Entre aqui' : 'Ainda não tem conta? Cadastre-se'}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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


