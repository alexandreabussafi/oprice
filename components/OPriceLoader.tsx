import React from 'react';

interface OPriceLoaderProps {
  size?: number;
  label?: string;
  className?: string;
}

export const OPriceLoader: React.FC<OPriceLoaderProps> = ({ size = 22, label = 'Carregando', className = '' }) => {
  const gradientId = React.useId().replace(/:/g, '');
  const gradientUrl = `url(#${gradientId})`;

  return (
    <span
      className={`oprice-loader ${className}`.trim()}
      role="status"
      aria-label={label}
      style={{ width: size, height: size } as React.CSSProperties}
    >
      <style>{`
        .oprice-loader {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          filter: drop-shadow(0 0 10px rgba(255, 47, 166, 0.32));
        }
        .oprice-loader svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .oprice-loader-ring,
        .oprice-loader-arrow,
        .oprice-loader-bar {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .oprice-loader-ring {
          stroke-width: 4.5;
          stroke-dasharray: 64 100;
          transform-origin: 24px 24px;
          animation: opriceLoaderSpin 1s linear infinite, opriceLoaderDash 1.6s ease-in-out infinite;
        }
        .oprice-loader-arrow {
          stroke-width: 4.2;
          animation: opriceLoaderArrow 1.6s ease-in-out infinite;
        }
        .oprice-loader-bar {
          stroke-width: 4.4;
          animation: opriceLoaderBars 1.2s ease-in-out infinite;
        }
        .oprice-loader .loader-bar-b {
          animation-delay: 0.12s;
        }
        .oprice-loader .loader-bar-c {
          animation-delay: 0.24s;
        }
        @keyframes opriceLoaderSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes opriceLoaderDash {
          0%, 100% { stroke-dasharray: 48 100; }
          50% { stroke-dasharray: 78 100; }
        }
        @keyframes opriceLoaderArrow {
          0%, 100% { opacity: 0.62; transform: translate3d(-1px, 1px, 0); }
          50% { opacity: 1; transform: translate3d(1px, -1px, 0); }
        }
        @keyframes opriceLoaderBars {
          0%, 100% { opacity: 0.52; transform: translateY(1px); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .oprice-loader-ring,
          .oprice-loader-arrow,
          .oprice-loader-bar {
            animation: none !important;
          }
        }
      `}</style>
      <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="7" y1="42" x2="42" y2="7" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1d5cff" />
            <stop offset="46%" stopColor="#b53dff" />
            <stop offset="78%" stopColor="#ff2fa6" />
            <stop offset="100%" stopColor="#ff74cf" />
          </linearGradient>
        </defs>
        <path
          className="oprice-loader-ring"
          d="M39.2 13.2A18.4 18.4 0 1 0 24 42.4"
          pathLength="100"
          stroke={gradientUrl}
        />
        <path
          className="oprice-loader-arrow"
          d="M33.4 5.8h8.2v8.2M41 6.6 30.8 16.8"
          stroke={gradientUrl}
        />
        <path className="oprice-loader-bar loader-bar-a" d="M17 31V22" stroke={gradientUrl} />
        <path className="oprice-loader-bar loader-bar-b" d="M24 31V17" stroke={gradientUrl} />
        <path className="oprice-loader-bar loader-bar-c" d="M31 31V25" stroke={gradientUrl} />
      </svg>
    </span>
  );
};
