import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const loginParticles = [
    { left: '8%', top: '18%', size: 5, color: '#67e8f9', delay: '0s', duration: '6.8s', drift: '18px' },
    { left: '16%', top: '72%', size: 7, color: '#60a5fa', delay: '1.2s', duration: '7.5s', drift: '-12px' },
    { left: '22%', top: '34%', size: 4, color: '#f59e0b', delay: '0.6s', duration: '6.1s', drift: '26px' },
    { left: '30%', top: '88%', size: 6, color: '#a78bfa', delay: '2.1s', duration: '8.2s', drift: '-20px' },
    { left: '40%', top: '22%', size: 5, color: '#22d3ee', delay: '1.8s', duration: '7.1s', drift: '16px' },
    { left: '48%', top: '62%', size: 8, color: '#34d399', delay: '0.3s', duration: '6.5s', drift: '-16px' },
    { left: '58%', top: '12%', size: 4, color: '#f472b6', delay: '2.8s', duration: '7.8s', drift: '22px' },
    { left: '66%', top: '76%', size: 6, color: '#38bdf8', delay: '1.5s', duration: '6.9s', drift: '-24px' },
    { left: '74%', top: '28%', size: 7, color: '#fbbf24', delay: '0.9s', duration: '7.4s', drift: '14px' },
    { left: '86%', top: '54%', size: 5, color: '#818cf8', delay: '2.4s', duration: '8s', drift: '-18px' },
    { left: '92%', top: '84%', size: 4, color: '#5eead4', delay: '3s', duration: '6.6s', drift: '20px' },
    { left: '10%', top: '48%', size: 4, color: '#c084fc', delay: '3.4s', duration: '7.7s', drift: '-14px' },
];

const loginStreaks = [
    { left: '6%', top: '26%', width: 96, color: '#38bdf8', angle: '-18deg', delay: '0.2s', duration: '6.2s' },
    { left: '62%', top: '18%', width: 122, color: '#f59e0b', angle: '14deg', delay: '1.5s', duration: '7.2s' },
    { left: '18%', top: '82%', width: 110, color: '#a78bfa', angle: '10deg', delay: '2.6s', duration: '6.8s' },
    { left: '72%', top: '68%', width: 86, color: '#34d399', angle: '-22deg', delay: '3.2s', duration: '7.8s' },
];

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

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
                    setMessage('Conta criada. Verifique seu e-mail.');
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
        <>
            <style>{`
                html,
                body,
                #root {
                    min-height: 100%;
                    background: #08111f;
                }
                @keyframes loginParticleFloat {
                    0% { transform: translate3d(0, 30px, 0) scale(0.72); opacity: 0; }
                    18% { opacity: 0.95; }
                    72% { opacity: 0.85; }
                    100% { transform: translate3d(var(--particle-drift), -88px, 0) scale(1.25); opacity: 0; }
                }
                @keyframes loginStreakSweep {
                    0% { transform: translate3d(-24px, 20px, 0) rotate(var(--streak-angle)); opacity: 0; }
                    20% { opacity: 0.8; }
                    70% { opacity: 0.55; }
                    100% { transform: translate3d(46px, -54px, 0) rotate(var(--streak-angle)); opacity: 0; }
                }
                .login-particle {
                    animation: loginParticleFloat var(--particle-duration) ease-in-out infinite;
                    animation-delay: var(--particle-delay);
                }
                .login-streak {
                    animation: loginStreakSweep var(--streak-duration) ease-in-out infinite;
                    animation-delay: var(--streak-delay);
                }
                @media (prefers-reduced-motion: reduce) {
                    .login-particle,
                    .login-streak {
                        animation: none !important;
                        opacity: 0.45 !important;
                    }
                }
            `}</style>
            <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#08111f] px-4 py-5" style={{ minHeight: 'max(100vh, 100dvh)' }}>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-35"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.09) 1px, transparent 1px)',
                            backgroundSize: '42px 42px',
                        }}
                    />
                    {loginStreaks.map((streak, index) => (
                        <span
                            key={`streak-${index}`}
                            className="login-streak absolute h-px rounded-full opacity-0"
                            style={{
                                left: streak.left,
                                top: streak.top,
                                width: streak.width,
                                background: `linear-gradient(90deg, transparent, ${streak.color}, transparent)`,
                                boxShadow: `0 0 22px ${streak.color}`,
                                '--streak-angle': streak.angle,
                                '--streak-delay': streak.delay,
                                '--streak-duration': streak.duration,
                            } as React.CSSProperties}
                        />
                    ))}
                    {loginParticles.map((particle, index) => (
                        <span
                            key={`particle-${index}`}
                            className="login-particle absolute rounded-full opacity-0"
                            style={{
                                left: particle.left,
                                top: particle.top,
                                width: particle.size,
                                height: particle.size,
                                backgroundColor: particle.color,
                                boxShadow: `0 0 24px ${particle.color}, 0 0 48px ${particle.color}`,
                                '--particle-delay': particle.delay,
                                '--particle-duration': particle.duration,
                                '--particle-drift': particle.drift,
                            } as React.CSSProperties}
                        />
                    ))}
                </div>

                <div className="relative z-10 w-full" style={{ maxWidth: '22rem' }}>
                    <div className="mb-6 text-center sm:mb-8">
                        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white shadow-[0_18px_60px_rgba(56,189,248,0.32)] ring-1 ring-cyan-300/20 backdrop-blur-xl">
                            <Zap size={30} />
                        </div>
                        <h1 className="text-3xl font-black tracking-normal text-white sm:text-4xl">
                            OP<span className="text-cyan-300">CAPEX</span>
                        </h1>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.58)] backdrop-blur-2xl sm:p-7">
                        <form className="space-y-4" onSubmit={handleAuth}>
                            <div>
                                <label htmlFor="email" className="mb-2 block px-1 text-xs font-bold uppercase tracking-normal text-slate-300">
                                    E-mail
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                    placeholder="email@empresa.com"
                                />
                            </div>

                            <div className="relative">
                                <label htmlFor="password" className="mb-2 block px-1 text-xs font-bold uppercase tracking-normal text-slate-300">
                                    Senha
                                </label>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 pr-12 text-white placeholder-slate-500 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                    placeholder="********"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute bottom-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
                                    <AlertCircle size={18} className="shrink-0 text-red-300" />
                                    <span className="min-w-0">{error}</span>
                                </div>
                            )}

                            {message && (
                                <div className="flex items-center gap-3 rounded-lg border border-emerald-300/20 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-100">
                                    <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
                                    <span className="min-w-0">{message}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_18px_42px_rgba(34,211,238,0.28)] transition hover:bg-cyan-300 active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100"
                            >
                                {loading ? <Loader2 size={19} className="animate-spin" /> : (isSignUp ? 'Criar conta' : 'Entrar')}
                            </button>

                            <div className="pt-1 text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSignUp(!isSignUp);
                                        setError(null);
                                        setMessage(null);
                                    }}
                                    className="min-h-11 rounded-md px-4 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
                                >
                                    {isSignUp ? 'Entrar' : 'Criar conta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
