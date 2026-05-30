import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

function rand(min, max) { return min + Math.random() * (max - min); }

const BG_COLORS = [
  [255,255,255],[255,255,255],[255,255,255],[255,255,255],[255,255,255],
  [255,255,255],[255,255,255],[200,220,255],[200,220,255],[255,240,200],
];
const FG_TINTS = [[200,220,255],[255,248,220],[255,255,255]];

function buildScene(w, h, reducedMem, noNebula) {
  const f = reducedMem ? 0.5 : 1;

  const dust = Array.from({ length: Math.floor(rand(800, 1200) * f) }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(0.3, 0.8), a: rand(0.1, 0.3),
  }));

  const bgStars = Array.from({ length: Math.floor(rand(300, 400) * f) }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(0.5, 1.5), a: rand(0.2, 0.6),
    col: BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)],
  }));

  const mgStars = Array.from({ length: Math.floor(rand(80, 120) * f) }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(1.5, 2.5), a: rand(0.5, 0.8), ga: rand(0.05, 0.15),
  }));

  const fgStars = Array.from({ length: Math.floor(rand(15, 25)) }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(2, 4), a: rand(0.8, 1.0),
    spike: rand(8, 15),
    col: FG_TINTS[Math.floor(Math.random() * FG_TINTS.length)],
  }));

  const sign = () => (Math.random() < 0.5 ? 1 : -1);
  const nebulas = noNebula ? [] : [
    { cx: w*0.15, cy: h*0.15, r: rand(300,500), c:[120,40,180], a:0.08, dx: rand(0.002,0.005)*sign(), dy: rand(0.001,0.003)*sign(), ox:0, oy:0 },
    { cx: w*0.85, cy: h*0.50, r: rand(350,600), c:[0,180,160],  a:0.07, dx: rand(0.002,0.004)*sign(), dy: rand(0.001,0.003)*sign(), ox:0, oy:0 },
    { cx: w*0.50, cy: h*0.85, r: rand(300,500), c:[40,80,200],  a:0.06, dx: rand(0.003,0.005)*sign(), dy: rand(0.001,0.003)*sign(), ox:0, oy:0 },
    { cx: w*0.80, cy: h*0.10, r: rand(250,450), c:[180,100,20], a:0.05, dx: rand(0.002,0.004)*sign(), dy: rand(0.002,0.004)*sign(), ox:0, oy:0 },
  ];

  return {
    dust, bgStars, mgStars, fgStars, nebulas,
    phoenix: { x: rand(w*0.05, w*0.22), y: rand(h*0.72, h*0.88) },
  };
}

function drawFrame(ctx, w, h, scene, ts, animated) {
  if (!scene) return;
  ctx.clearRect(0, 0, w, h);

  // Layer 1 — Deep space gradient
  const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) * 0.75);
  bg.addColorStop(0,   '#0d0d2e');
  bg.addColorStop(0.5, '#080818');
  bg.addColorStop(1,   '#050510');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Layer 2 — Nebula clouds
  scene.nebulas.forEach(n => {
    if (animated) { n.ox += n.dx; n.oy += n.dy; }
    const nx = n.cx + n.ox, ny = n.cy + n.oy;
    const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
    g.addColorStop(0,   `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${n.a})`);
    g.addColorStop(0.5, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${(n.a*0.5).toFixed(3)})`);
    g.addColorStop(1,   `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // Layer 3 — Stardust
  scene.dust.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${d.a})`;
    ctx.fill();
  });

  // Layer 4 — Background stars with subtle twinkle
  scene.bgStars.forEach(s => {
    if (animated && Math.random() < 0.01) {
      s.a = Math.max(0.2, Math.min(0.6, s.a + (Math.random() - 0.5) * 0.04));
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${s.a.toFixed(3)})`;
    ctx.fill();
  });

  // Layer 5 — Midground stars with glow
  scene.mgStars.forEach(s => {
    if (animated && Math.random() < 0.02) {
      s.a = Math.max(0.5, Math.min(0.8, s.a + (Math.random() - 0.5) * 0.04));
    }
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
    g.addColorStop(0, `rgba(255,255,255,${s.ga})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(3)})`;
    ctx.fill();
  });

  // Layer 6 — Foreground bright stars with 4-point spikes
  scene.fgStars.forEach(s => {
    const [r, g, b] = s.col;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const ex = s.x + Math.cos(angle) * s.spike;
      const ey = s.y + Math.sin(angle) * s.spike;
      const sg = ctx.createLinearGradient(s.x, s.y, ex, ey);
      sg.addColorStop(0, `rgba(${r},${g},${b},${(s.a * 0.8).toFixed(3)})`);
      sg.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = sg;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${s.a.toFixed(3)})`;
    ctx.fill();
  });

  // Layer 7 — The Phoenix Star (warm amber, lower-left area)
  const { x: px, y: py } = scene.phoenix;
  const glowR = animated ? (80 + Math.sin((ts / 2000) * Math.PI) * 5) : 80;
  const pg = ctx.createRadialGradient(px, py, 0, px, py, glowR);
  pg.addColorStop(0,   'rgba(255,120,20,0.15)');
  pg.addColorStop(0.4, 'rgba(255,100,10,0.08)');
  pg.addColorStop(1,   'rgba(255,80,0,0)');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(px, py, glowR, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const ex = px + Math.cos(angle) * 12;
    const ey = py + Math.sin(angle) * 12;
    const sg = ctx.createLinearGradient(px, py, ex, ey);
    sg.addColorStop(0, 'rgba(255,160,50,0.9)');
    sg.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = sg;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(px, py, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,160,50,0.9)';
  ctx.fill();
}

function EmberLayer() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return null;

  const isMobile = window.innerWidth < 768;
  const count = isMobile ? 10 : 20;
  const EMBER_COLORS = ['#ff6600', '#ff9900', '#ffcc00', '#ff3300'];

  const [embers] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.floor(rand(2, 98))}%`,
      width:  `${rand(2, 4).toFixed(1)}px`,
      height: `${rand(3, 6).toFixed(1)}px`,
      color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
      duration: `${rand(3, 8).toFixed(2)}s`,
      delay: `-${rand(0, 8).toFixed(2)}s`,
      anim: Math.random() < 0.5 ? 'emberRiseL' : 'emberRiseR',
    }))
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      {embers.map(e => (
        <div key={e.id} style={{
          position: 'absolute',
          bottom: 0,
          left: e.left,
          width: e.width,
          height: e.height,
          borderRadius: '50% 50% 60% 60%',
          background: e.color,
          filter: `drop-shadow(0 0 3px ${e.color})`,
          animation: `${e.anim} ${e.duration} ${e.delay} ease-out infinite`,
        }} />
      ))}
    </div>
  );
}

export default function SpaceBackground() {
  const { prefs } = useTheme();
  const canvasRef = useRef(null);
  const sceneRef  = useRef(null);
  const enabled   = prefs?.starfield !== false;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const deviceMem  = (typeof navigator !== 'undefined' && navigator.deviceMemory) ?? 8;
    const noNebula   = deviceMem <= 2;
    const reducedMem = deviceMem < 4;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      sceneRef.current = buildScene(canvas.width, canvas.height, reducedMem, noNebula);
    }
    resize();
    window.addEventListener('resize', resize);

    if (reducedMotion) {
      drawFrame(ctx, canvas.width, canvas.height, sceneRef.current, 0, false);
      return () => window.removeEventListener('resize', resize);
    }

    let rafId;
    let running  = true;
    let lastTime = 0;
    const FRAME_MS = 1000 / 30;

    function loop(ts) {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (ts - lastTime < FRAME_MS) return;
      lastTime = ts;
      drawFrame(ctx, canvas.width, canvas.height, sceneRef.current, ts, true);
    }

    rafId = requestAnimationFrame(loop);

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else {
        running = true;
        rafId = requestAnimationFrame(loop);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', display: 'block' }}
      />
      <EmberLayer />
    </>
  );
}
