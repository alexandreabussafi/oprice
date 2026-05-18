import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const loginCodeFragments: Array<{
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
    width: string;
    rotate: string;
    opacity: number;
    lines: string[];
}> = [
    {
        left: 'max(1.25rem, 4vw)',
        top: '12%',
        width: '18rem',
        rotate: '-5deg',
        opacity: 0.52,
        lines: [
            'const gearbox = await pricing.readAsset({',
            "  unit: 'industrial-drive',",
            "  mode: 'capex',",
            '  safetyFactor: 1.18',
            '});',
        ],
    },
    {
        right: 'max(1.5rem, 5vw)',
        top: '16%',
        width: '19rem',
        rotate: '4deg',
        opacity: 0.46,
        lines: [
            'pipeline.quote.create({',
            "  stage: 'technical-review',",
            '  margin: rules.targetMargin,',
            '  leadTimeDays: 21',
            '});',
        ],
    },
    {
        left: 'max(2rem, 7vw)',
        bottom: '13%',
        width: '20rem',
        rotate: '3deg',
        opacity: 0.38,
        lines: [
            'if (proposal.approved) {',
            '  crm.nextStep.scheduleVisit();',
            '  inventory.reserveComponents();',
            '}',
        ],
    },
    {
        right: 'max(1rem, 6vw)',
        bottom: '12%',
        width: '17rem',
        rotate: '-4deg',
        opacity: 0.42,
        lines: [
            'risk.matrix.score({',
            '  downtimeCost,',
            '  replacementWindow,',
            '  warrantyPlan',
            '});',
        ],
    },
];

const loginFlowPaths: Array<{
    d: string;
    tone: 'cyan' | 'amber';
    width: number;
    dash: string;
    duration: string;
    delay: string;
    opacity: number;
}> = [
    {
        d: 'M -80 560 C 125 468 252 356 430 302 C 552 266 638 268 742 304',
        tone: 'cyan',
        width: 8,
        dash: '110 560',
        duration: '16s',
        delay: '-3s',
        opacity: 0.26,
    },
    {
        d: 'M 2010 440 C 1772 410 1622 492 1460 585 C 1372 636 1284 650 1210 618',
        tone: 'cyan',
        width: 8,
        dash: '96 510',
        duration: '18s',
        delay: '-7s',
        opacity: 0.24,
    },
    {
        d: 'M 40 838 C 270 800 412 790 596 824 C 765 855 922 884 1118 825 C 1308 768 1495 762 1790 818',
        tone: 'amber',
        width: 7,
        dash: '72 500',
        duration: '20s',
        delay: '-9s',
        opacity: 0.2,
    },
    {
        d: 'M 190 206 C 374 188 520 214 652 288 C 710 320 760 344 820 346',
        tone: 'cyan',
        width: 5,
        dash: '62 430',
        duration: '14s',
        delay: '-4s',
        opacity: 0.18,
    },
    {
        d: 'M 1805 178 C 1605 206 1512 300 1435 392 C 1372 468 1305 490 1230 466',
        tone: 'amber',
        width: 5,
        dash: '58 430',
        duration: '17s',
        delay: '-6s',
        opacity: 0.16,
    },
];

const loginFlowPulses: Array<{
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
    size: number;
    color: 'cyan' | 'amber';
    delay: string;
    duration: string;
    driftX: string;
    driftY: string;
}> = [
    { left: '11%', top: '46%', size: 9, color: 'cyan', delay: '-1s', duration: '10s', driftX: '64px', driftY: '-92px' },
    { left: '24%', top: '73%', size: 7, color: 'amber', delay: '-5s', duration: '13s', driftX: '118px', driftY: '-36px' },
    { right: '18%', top: '55%', size: 8, color: 'cyan', delay: '-3s', duration: '12s', driftX: '-92px', driftY: '44px' },
    { right: '11%', bottom: '18%', size: 6, color: 'amber', delay: '-8s', duration: '15s', driftX: '-78px', driftY: '-58px' },
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
            setError(error.message || 'Erro de autenticacao.');
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
                    background: #04101d;
                }
                .login-industrial-bg {
                    background-image: url('/login-industrial-bg.png');
                    background-size: cover;
                    background-position: center;
                    transform: scale(1.01);
                }
                .login-industrial-overlay {
                    background:
                        radial-gradient(ellipse at center, rgba(5, 15, 27, 0.16) 0%, rgba(4, 11, 22, 0.34) 34%, rgba(2, 6, 23, 0.78) 100%),
                        linear-gradient(90deg, rgba(2, 6, 23, 0.7) 0%, rgba(2, 6, 23, 0.2) 34%, rgba(2, 6, 23, 0.22) 66%, rgba(2, 6, 23, 0.74) 100%),
                        linear-gradient(180deg, rgba(2, 6, 23, 0.54) 0%, rgba(2, 6, 23, 0.04) 46%, rgba(2, 6, 23, 0.74) 100%);
                }
                .login-industrial-grid {
                    background-image:
                        linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px);
                    background-size: 44px 44px;
                    mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.58), transparent 78%);
                    opacity: 0.38;
                }
                @keyframes loginFlowMove {
                    from { stroke-dashoffset: 0; }
                    to { stroke-dashoffset: -680; }
                }
                @keyframes loginFlowBreath {
                    0%, 100% { filter: url(#login-flow-blur) brightness(0.86); }
                    50% { filter: url(#login-flow-blur) brightness(1.16); }
                }
                @keyframes loginOilPulse {
                    0% {
                        transform: translate3d(0, 0, 0) scale(0.72);
                        opacity: 0;
                    }
                    18% {
                        opacity: 0.72;
                    }
                    68% {
                        opacity: 0.44;
                    }
                    100% {
                        transform: translate3d(var(--pulse-drift-x), var(--pulse-drift-y), 0) scale(1.34);
                        opacity: 0;
                    }
                }
                .login-flow-layer {
                    mix-blend-mode: screen;
                    opacity: 0.74;
                }
                .login-flow-base {
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    opacity: 0.18;
                }
                .login-flow-glow {
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    filter: url(#login-flow-blur);
                    opacity: var(--flow-glow-opacity);
                    animation: loginFlowBreath 11s ease-in-out infinite;
                    animation-delay: var(--flow-delay);
                }
                .login-flow-active {
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    stroke-dasharray: var(--flow-dash);
                    stroke-dashoffset: 0;
                    opacity: var(--flow-opacity);
                    animation: loginFlowMove var(--flow-duration) linear infinite;
                    animation-delay: var(--flow-delay);
                }
                .login-flow-cyan {
                    stroke: rgba(103, 232, 249, 0.72);
                }
                .login-flow-amber {
                    stroke: rgba(245, 158, 11, 0.58);
                }
                .login-oil-pulse {
                    width: var(--pulse-size);
                    height: var(--pulse-size);
                    background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.9), var(--pulse-color) 42%, rgba(2, 6, 23, 0) 72%);
                    filter: blur(0.5px) drop-shadow(0 0 18px var(--pulse-color));
                    animation: loginOilPulse var(--pulse-duration) ease-in-out infinite;
                    animation-delay: var(--pulse-delay);
                    opacity: 0;
                }
                .login-code-collage {
                    border: 1px solid rgba(103, 232, 249, 0.16);
                    background: linear-gradient(135deg, rgba(5, 18, 31, 0.46), rgba(2, 6, 23, 0.16));
                    box-shadow: 0 18px 56px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.05);
                    color: rgba(186, 245, 255, 0.82);
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
                    text-shadow: 0 0 20px rgba(103, 232, 249, 0.2);
                    backdrop-filter: blur(5px);
                }
                .login-code-collage pre {
                    margin: 0;
                    white-space: pre-wrap;
                }
                .login-logo-mark {
                    background: rgba(255, 255, 255, 0.07);
                    box-shadow: 0 18px 60px rgba(56, 189, 248, 0.26), 0 0 0 1px rgba(103, 232, 249, 0.2);
                }
                .login-brand-accent {
                    color: #67e8f9;
                }
                .login-card {
                    background: rgba(2, 6, 23, 0.76);
                }
                .login-auth-input {
                    background: rgba(15, 23, 42, 0.82);
                    color: #f8fafc;
                    caret-color: #67e8f9;
                    -webkit-text-fill-color: #f8fafc;
                }
                .login-auth-input:focus {
                    border-color: rgba(103, 232, 249, 0.6);
                    box-shadow: 0 0 0 2px rgba(103, 232, 249, 0.2);
                }
                .login-auth-input::placeholder {
                    color: rgba(148, 163, 184, 0.72);
                    -webkit-text-fill-color: rgba(148, 163, 184, 0.72);
                }
                .login-auth-input:-webkit-autofill,
                .login-auth-input:-webkit-autofill:hover,
                .login-auth-input:-webkit-autofill:focus {
                    border-color: rgba(103, 232, 249, 0.38);
                    -webkit-box-shadow: 0 0 0 1000px #101a2b inset;
                    box-shadow: 0 0 0 1000px #101a2b inset;
                    -webkit-text-fill-color: #f8fafc;
                    caret-color: #67e8f9;
                    transition: background-color 9999s ease-out 0s;
                }
                .login-submit {
                    background: linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%);
                    color: #062436;
                }
                .login-submit:hover:not(:disabled) {
                    background: linear-gradient(135deg, #a5f3fc 0%, #67e8f9 100%);
                }
                .login-icon-button:hover,
                .login-link-button:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                @media (max-width: 1023px) {
                    .login-code-collage {
                        display: none !important;
                    }
                }
                @media (max-width: 640px) {
                    .login-industrial-bg {
                        background-position: 22% center;
                    }
                    .login-industrial-overlay {
                        background:
                            radial-gradient(ellipse at center, rgba(5, 15, 27, 0.22) 0%, rgba(4, 11, 22, 0.5) 42%, rgba(2, 6, 23, 0.86) 100%),
                            linear-gradient(180deg, rgba(2, 6, 23, 0.68) 0%, rgba(2, 6, 23, 0.12) 46%, rgba(2, 6, 23, 0.78) 100%);
                    }
                    .login-flow-layer {
                        opacity: 0.62;
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .login-flow-active,
                    .login-flow-glow,
                    .login-oil-pulse {
                        animation: none !important;
                    }
                    .login-flow-active,
                    .login-flow-glow {
                        opacity: 0.18 !important;
                    }
                    .login-oil-pulse {
                        opacity: 0.16 !important;
                    }
                }
            `}</style>
            <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-5" style={{ minHeight: 'max(100vh, 100dvh)', backgroundColor: '#04101d' }}>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="login-industrial-bg absolute inset-0" />
                    <div className="login-industrial-overlay absolute inset-0" />
                    <div className="login-flow-layer absolute inset-0">
                        <svg
                            className="h-full w-full"
                            viewBox="0 0 1920 960"
                            preserveAspectRatio="none"
                            focusable="false"
                            role="presentation"
                        >
                            <defs>
                                <filter id="login-flow-blur" x="-20%" y="-40%" width="140%" height="180%">
                                    <feGaussianBlur stdDeviation="4" />
                                </filter>
                            </defs>
                            {loginFlowPaths.map((flow, index) => (
                                <g key={`flow-${index}`}>
                                    <path
                                        className={`login-flow-base login-flow-${flow.tone}`}
                                        d={flow.d}
                                        strokeWidth={flow.width + 10}
                                    />
                                    <path
                                        className={`login-flow-glow login-flow-${flow.tone}`}
                                        d={flow.d}
                                        strokeWidth={flow.width + 16}
                                        style={{
                                            '--flow-glow-opacity': flow.opacity * 0.62,
                                            '--flow-delay': flow.delay,
                                        } as React.CSSProperties}
                                    />
                                    <path
                                        className={`login-flow-active login-flow-${flow.tone}`}
                                        d={flow.d}
                                        strokeWidth={flow.width}
                                        style={{
                                            '--flow-dash': flow.dash,
                                            '--flow-duration': flow.duration,
                                            '--flow-delay': flow.delay,
                                            '--flow-opacity': flow.opacity,
                                        } as React.CSSProperties}
                                    />
                                </g>
                            ))}
                        </svg>
                        {loginFlowPulses.map((pulse, index) => (
                            <span
                                key={`flow-pulse-${index}`}
                                className="login-oil-pulse absolute rounded-full"
                                style={{
                                    left: pulse.left,
                                    right: pulse.right,
                                    top: pulse.top,
                                    bottom: pulse.bottom,
                                    '--pulse-size': `${pulse.size}px`,
                                    '--pulse-duration': pulse.duration,
                                    '--pulse-delay': pulse.delay,
                                    '--pulse-drift-x': pulse.driftX,
                                    '--pulse-drift-y': pulse.driftY,
                                    '--pulse-color': pulse.color === 'cyan' ? 'rgba(103, 232, 249, 0.82)' : 'rgba(245, 158, 11, 0.72)',
                                } as React.CSSProperties}
                            />
                        ))}
                    </div>
                    <div className="login-industrial-grid absolute inset-0" />
                    {loginCodeFragments.map((fragment, index) => (
                        <div
                            key={`code-fragment-${index}`}
                            className="login-code-collage absolute hidden rounded-lg p-4 text-[10px] font-semibold leading-5 tracking-normal lg:block"
                            style={{
                                left: fragment.left,
                                right: fragment.right,
                                top: fragment.top,
                                bottom: fragment.bottom,
                                width: fragment.width,
                                opacity: fragment.opacity,
                                transform: `rotate(${fragment.rotate})`,
                            } as React.CSSProperties}
                        >
                            <pre>{fragment.lines.join('\n')}</pre>
                        </div>
                    ))}
                </div>

                <div className="relative z-10 w-full" style={{ maxWidth: '22rem' }}>
                    <div className="mb-6 text-center sm:mb-8">
                        <div className="login-logo-mark mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg border border-white/10 text-white backdrop-blur-xl">
                            <Zap size={30} />
                        </div>
                        <h1 className="text-3xl font-black tracking-normal text-white sm:text-4xl">
                            o<span className="login-brand-accent">Price</span>
                        </h1>
                    </div>

                    <div className="login-card rounded-lg border border-white/10 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.58)] backdrop-blur-2xl sm:p-7">
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
                                    className="login-auth-input min-h-12 w-full rounded-lg border border-white/10 px-4 py-3 text-white placeholder-slate-500 outline-none transition"
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
                                    className="login-auth-input min-h-12 w-full rounded-lg border border-white/10 px-4 py-3 pr-12 text-white placeholder-slate-500 outline-none transition"
                                    placeholder="********"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="login-icon-button absolute bottom-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition hover:text-white"
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
                                className="login-submit flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black shadow-[0_18px_42px_rgba(34,211,238,0.28)] transition active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100"
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
                                    className="login-link-button min-h-11 rounded-md px-4 text-sm font-bold text-slate-300 transition hover:text-white"
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
