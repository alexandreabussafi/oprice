import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.session) {
                    // Successfully signed up and logged in
                } else {
                    setMessage('Conta criada! Se necessário, verifique seu email para confirmar (ou tente fazer login agora).');
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setError(error.message || 'Erro de autenticação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4 ring-4 ring-white/5">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        OP<span className="text-blue-500">CAPEX</span>
                    </h1>
                    <p className="text-slate-400 font-medium">
                        Industrial Viability Engine
                    </p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    <form className="space-y-5" onSubmit={handleAuth}>
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                E-mail Institucional
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                placeholder="exemplo@lubrin.com.br"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                Senha de Acesso
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl flex items-center gap-3">
                                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-xl flex items-center gap-3">
                                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (isSignUp ? 'Criar Conta' : 'Entrar no Sistema')}
                        </button>

                        <div className="pt-4 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                    setMessage(null);
                                }}
                                className="text-sm font-semibold text-slate-500 hover:text-white transition-colors"
                            >
                                {isSignUp ? 'Já tem uma conta? Faça login' : 'Ainda não tem conta? Cadastre-se'}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="mt-8 text-center text-xs text-slate-600 font-medium uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} Lubrin Grupo. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
