import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import UPNG from 'upng-js';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const root = process.cwd();
const publicDir = path.join(root, 'public');
const svgPath = path.join(publicDir, 'oprice-loader.svg');
const apngPath = path.join(publicDir, 'oprice-loader.apng');
const gifPath = path.join(publicDir, 'oprice-loader.gif');

const APNG_SIZE = 192;
const GIF_SIZE = 144;
const FRAME_COUNT = 36;
const DELAY_MS = 40;
const DARK_MATTE = '#0a1222';

const cleanSvg = svg => `${svg.replace(/[ \t]+$/gm, '').trim()}\n`;

const svgStaticStyle = `
  .base { fill: none; stroke: rgba(255,255,255,.13); stroke-width: 7.6; stroke-linecap: round; }
  .ring { fill: none; stroke: url(#opriceGradient); stroke-width: 7.2; stroke-linecap: round; stroke-dasharray: 72 116; transform-origin: 48px 48px; }
  .spark { fill: none; stroke: url(#opriceGradient); stroke-width: 6.4; stroke-linecap: round; stroke-linejoin: round; }
  .bar { fill: none; stroke: url(#opriceGradient); stroke-width: 7.4; stroke-linecap: round; }
  .glint { fill: #fff; opacity: .9; }
`;

const svgAnimatedStyle = `
  ${svgStaticStyle}
  .ring { animation: ringSpin 1.15s linear infinite, ringDash 1.65s ease-in-out infinite; }
  .spark { animation: sparkLift 1.65s ease-in-out infinite; transform-origin: 72px 16px; }
  .bar-a { animation: barLift 1.2s ease-in-out infinite; transform-origin: 34px 62px; }
  .bar-b { animation: barLift 1.2s ease-in-out infinite .12s; transform-origin: 48px 62px; }
  .bar-c { animation: barLift 1.2s ease-in-out infinite .24s; transform-origin: 62px 62px; }
  @keyframes ringSpin { to { transform: rotate(360deg); } }
  @keyframes ringDash {
    0%, 100% { stroke-dasharray: 56 116; }
    50% { stroke-dasharray: 88 116; }
  }
  @keyframes sparkLift {
    0%, 100% { opacity: .76; transform: translate3d(-1px, 1px, 0); }
    50% { opacity: 1; transform: translate3d(1px, -1px, 0); }
  }
  @keyframes barLift {
    0%, 100% { opacity: .58; transform: scaleY(.82); }
    50% { opacity: 1; transform: scaleY(1.08); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ring, .spark, .bar { animation: none !important; }
  }
`;

const loaderSvg = ({ phase = 0, animated = false, matte = false } = {}) => {
  const angle = phase * 360;
  const dashOffset = -phase * 92;
  const sparkX = Math.sin(phase * Math.PI * 2) * 1.1;
  const sparkY = Math.cos(phase * Math.PI * 2) * 1.1;
  const barLift = offset => Math.sin(phase * Math.PI * 2 + offset);
  const barScaleA = 0.86 + Math.max(0, barLift(0)) * 0.24;
  const barScaleB = 0.86 + Math.max(0, barLift(1.2)) * 0.24;
  const barScaleC = 0.86 + Math.max(0, barLift(2.4)) * 0.24;

  return cleanSvg(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <linearGradient id="opriceGradient" x1="10" y1="84" x2="84" y2="10" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1d5cff"/>
      <stop offset="42%" stop-color="#7a35ff"/>
      <stop offset="73%" stop-color="#ff2fa6"/>
      <stop offset="100%" stop-color="#ff74cf"/>
    </linearGradient>
    <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.1" flood-color="#ff2fa6" flood-opacity=".22"/>
    </filter>
  </defs>
  <style>${animated ? svgAnimatedStyle : svgStaticStyle}</style>
  ${matte ? `<rect width="96" height="96" rx="12" fill="${DARK_MATTE}"/>` : ''}
  <g filter="url(#softGlow)">
    <path class="base" d="M78.4 26.4A36.8 36.8 0 1 0 48 84.8"/>
    <path class="ring" d="M78.4 26.4A36.8 36.8 0 1 0 48 84.8" pathLength="116"${animated ? '' : ` style="transform: rotate(${angle.toFixed(2)}deg); transform-origin: 48px 48px; stroke-dashoffset: ${dashOffset.toFixed(2)};"`}/>
    <g class="spark"${animated ? '' : ` transform="translate(${sparkX.toFixed(2)} ${sparkY.toFixed(2)})"`}>
      <path d="M66.8 11.6h16.4v16.4M82 13.2 61.6 33.6"/>
      <circle class="glint" cx="83.8" cy="10.8" r="2.2"/>
    </g>
    <path class="bar bar-a" d="M34 62V44"${animated ? '' : ` transform="translate(0 62) scale(1 ${barScaleA.toFixed(3)}) translate(0 -62)"`}/>
    <path class="bar bar-b" d="M48 62V32"${animated ? '' : ` transform="translate(0 62) scale(1 ${barScaleB.toFixed(3)}) translate(0 -62)"`}/>
    <path class="bar bar-c" d="M62 62V50"${animated ? '' : ` transform="translate(0 62) scale(1 ${barScaleC.toFixed(3)}) translate(0 -62)"`}/>
  </g>
</svg>`);
};

const svgDataUrl = svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const renderFrame = async (page, svg, size, matte = null) => {
  const dataUrl = svgDataUrl(svg);
  const data = await page.evaluate(async ({ dataUrl, size, matte }) => {
    const img = new Image();
    img.decoding = 'sync';
    img.src = dataUrl;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (matte) {
      ctx.fillStyle = matte;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.drawImage(img, 0, 0, size, size);
    return Array.from(ctx.getImageData(0, 0, size, size).data);
  }, { dataUrl, size, matte });
  return Uint8Array.from(data);
};

const encodeApng = async page => {
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const phase = i / FRAME_COUNT;
    const rgba = await renderFrame(page, loaderSvg({ phase }), APNG_SIZE);
    frames.push(rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength));
  }
  const delays = Array(FRAME_COUNT).fill(DELAY_MS);
  return Buffer.from(UPNG.encode(frames, APNG_SIZE, APNG_SIZE, 0, delays));
};

const encodeGif = async page => {
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i += 2) {
    const phase = i / FRAME_COUNT;
    frames.push(await renderFrame(page, loaderSvg({ phase, matte: true }), GIF_SIZE, DARK_MATTE));
  }

  const combined = new Uint8Array(frames.length * frames[0].length);
  frames.forEach((frame, index) => combined.set(frame, index * frame.length));
  const palette = quantize(combined, 96, { format: 'rgb565' });
  const gif = GIFEncoder();
  frames.forEach(frame => {
    const indexed = applyPalette(frame, palette, 'rgb565');
    gif.writeFrame(indexed, GIF_SIZE, GIF_SIZE, { palette, delay: DELAY_MS * 2, repeat: 0 });
  });
  gif.finish();
  return Buffer.from(gif.bytes());
};

const main = async () => {
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(svgPath, loaderSvg({ animated: true }));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: APNG_SIZE, height: APNG_SIZE }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><html><body></body></html>');

  try {
    fs.writeFileSync(apngPath, await encodeApng(page));
    fs.writeFileSync(gifPath, await encodeGif(page));
  } finally {
    await browser.close();
  }

  console.log(`Generated ${svgPath}`);
  console.log(`Generated ${apngPath}`);
  console.log(`Generated ${gifPath}`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
