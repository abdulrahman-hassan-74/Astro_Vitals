import { useEffect, useRef } from "react";

/* ── Types ────────────────────────────────────────────── */

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  phase: number;
  speed: number;
  colorIndex: number;
  flare: boolean;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  len: number;
}

interface Satellite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  blink: number;
}

/* ── Constants ────────────────────────────────────────── */

const TAU = Math.PI * 2;

// Realistic stellar colors (O,B,A,F,G,K,M class approximations)
const STAR_COLORS = [
  "170,200,255", // O/B – blue-white
  "200,220,255", // B/A – white-blue
  "255,255,255", // A/F – white
  "255,250,230", // F/G – warm white
  "255,235,180", // G/K – yellow (Sun-like)
  "255,210,160", // K – orange
  "255,180,140", // M – red-orange
];

const NEBULA_COLORS: Array<[number, number, number, string, number]> = [
  [0.15, 0.22, 0.55, "11,61,145", 0.22], // NASA blue
  [0.85, 0.14, 0.5, "252,61,33", 0.06], // NASA red (subtle)
  [0.52, 0.85, 0.6, "30,90,160", 0.16],
  [0.3, 0.68, 0.42, "60,110,200", 0.14],
  [0.72, 0.4, 0.35, "180,100,220", 0.05],
];


/* ── Builders ─────────────────────────────────────────── */

function pickColor(): number {
  // Weight toward white/warm-white stars
  const weights = [0.06, 0.1, 0.28, 0.24, 0.16, 0.1, 0.06];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i;
  }
  return 2;
}

function buildStars(w: number, h: number): Star[] {
  const count = Math.min(800, Math.floor((w * h) / 2200));
  return Array.from({ length: count }, () => {
    const z = 0.15 + Math.random() ** 2.2 * 0.85;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      z,
      r: 0.25 + z * 1.1 + (Math.random() < 0.04 ? 0.8 : 0),
      phase: Math.random() * TAU,
      speed: 0.5 + Math.random() * 2.5,
      colorIndex: pickColor(),
      flare: z > 0.78 && Math.random() < 0.45,
    };
  });
}

function buildNebula(w: number, h: number): HTMLCanvasElement {
  const nebula = document.createElement("canvas");
  nebula.width = Math.ceil(w / 2);
  nebula.height = Math.ceil(h / 2);
  const nctx = nebula.getContext("2d");
  if (!nctx) return nebula;

  const size = Math.max(nebula.width, nebula.height);
  for (const [fx, fy, fr, rgb, alpha] of NEBULA_COLORS) {
    const cx = fx * nebula.width;
    const cy = fy * nebula.height;
    const radius = fr * size;
    const g = nctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(0.45, `rgba(${rgb},${alpha * 0.35})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    nctx.fillStyle = g;
    nctx.fillRect(0, 0, nebula.width, nebula.height);
  }
  return nebula;
}

/**
 * Pre-renders a soft Milky Way band – a diagonal stripe of dense stars
 * with reddish-brown dust lanes, rendered once to an offscreen canvas.
 */
function buildMilkyWay(w: number, h: number): HTMLCanvasElement {
  const mw = document.createElement("canvas");
  mw.width = w;
  mw.height = h;
  const mwctx = mw.getContext("2d");
  if (!mwctx) return mw;

  mwctx.save();
  // Rotate so the band sweeps diagonally
  mwctx.translate(w * 0.5, h * 0.5);
  mwctx.rotate(-0.42);
  mwctx.translate(-w * 0.5, -h * 0.5);

  const bandH = h * 0.5;
  const cy = h * 0.5;
  const len = Math.hypot(w, h) * 1.1;

  // Base glow
  const grad = mwctx.createLinearGradient(0, cy - bandH, 0, cy + bandH);
  grad.addColorStop(0, "rgba(40,50,80,0)");
  grad.addColorStop(0.35, "rgba(50,60,95,0.06)");
  grad.addColorStop(0.5, "rgba(70,80,120,0.10)");
  grad.addColorStop(0.65, "rgba(50,60,95,0.06)");
  grad.addColorStop(1, "rgba(40,50,80,0)");
  mwctx.fillStyle = grad;
  mwctx.fillRect(-100, cy - bandH, len + 200, bandH * 2);

  // Dense star dust within the band
  const dustCount = Math.floor((w * h) / 1200);
  for (let i = 0; i < dustCount; i++) {
    const px = Math.random() * len - 50;
    const py = cy + (Math.random() - 0.5) * bandH * 1.6;
    const fade = 1 - Math.abs((py - cy) / bandH);
    const a = fade * Math.random() * 0.5;
    const c = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]!;
    mwctx.fillStyle = `rgba(${c},${a})`;
    mwctx.beginPath();
    mwctx.arc(px, py, 0.3 + Math.random() * 0.6, 0, TAU);
    mwctx.fill();
  }

  // Dust lanes (dark reddish-brown obscuration)
  for (let i = 0; i < 4; i++) {
    const dy = cy + (Math.random() - 0.5) * bandH * 0.8;
    const dh = 20 + Math.random() * 50;
    const dg = mwctx.createLinearGradient(0, dy - dh, 0, dy + dh);
    dg.addColorStop(0, "rgba(20,10,5,0)");
    dg.addColorStop(0.5, `rgba(${30 + Math.random() * 20},${15 + Math.random() * 10},${5},${0.15 + Math.random() * 0.1})`);
    dg.addColorStop(1, "rgba(20,10,5,0)");
    mwctx.fillStyle = dg;
    mwctx.fillRect(-100, dy - dh, len + 200, dh * 2);
  }

  // Bright galactic core
  const coreX = w * 0.55;
  const coreY = cy;
  const coreR = bandH * 0.6;
  const coreGrad = mwctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreR);
  coreGrad.addColorStop(0, "rgba(200,180,140,0.12)");
  coreGrad.addColorStop(0.3, "rgba(160,130,100,0.06)");
  coreGrad.addColorStop(1, "rgba(120,90,60,0)");
  mwctx.fillStyle = coreGrad;
  mwctx.beginPath();
  mwctx.arc(coreX, coreY, coreR, 0, TAU);
  mwctx.fill();

  mwctx.restore();
  return mw;
}

/* ── Component ────────────────────────────────────────── */

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let nebula: HTMLCanvasElement | null = null;
    let milkyWay: HTMLCanvasElement | null = null;
    const meteors: Meteor[] = [];
    const satellites: Satellite[] = [];
    let time = 0;
    let nextMeteor = 1.5;
    let nextSat = 6;
    let last = 0;
    let raf = 0;
    let lastDt = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = buildStars(w, h);
      nebula = buildNebula(w, h);
      milkyWay = buildMilkyWay(w, h);
      if (reduced) render(0);
    };

    const drawMilkyWay = () => {
      if (!milkyWay) return;
      const driftX = Math.sin(time * 0.03) * 18;
      const driftY = Math.cos(time * 0.025) * 12;
      ctx.globalAlpha = 0.7 + Math.sin(time * 0.15) * 0.06;
      ctx.drawImage(milkyWay, driftX, driftY, w, h);
      ctx.globalAlpha = 1;
    };

    const drawNebula = () => {
      if (!nebula) return;
      const scale = 2.3;
      const drawW = nebula.width * scale;
      const drawH = nebula.height * scale;
      const driftX = Math.sin(time * 0.04) * 26;
      const driftY = Math.cos(time * 0.035) * 18;
      ctx.globalAlpha = 0.75 + Math.sin(time * 0.2) * 0.08;
      ctx.drawImage(
        nebula,
        (w - drawW) / 2 + driftX,
        (h - drawH) / 2 + driftY,
        drawW,
        drawH,
      );
      ctx.globalAlpha = 1;
    };

    /* ── Earth ────────────────────────────────────────── */

    const drawAtmosphereGlow = (R: number) => {
      const glow = ctx.createRadialGradient(0, 0, R * 0.95, 0, 0, R * 1.25);
      glow.addColorStop(0, "rgba(100,170,255,0)");
      glow.addColorStop(0.3, "rgba(100,170,255,0.15)");
      glow.addColorStop(0.6, "rgba(80,150,255,0.06)");
      glow.addColorStop(1, "rgba(80,150,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.25, 0, TAU);
      ctx.fill();
    };

    const drawContinents = (R: number) => {
      // Simulated continents using overlapping organic blobs
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.clip();

      const rot = time * 0.06;
      ctx.fillStyle = "rgba(40,90,55,0.75)";

      const continents: Array<[number, number, number, number]> = [
        [-0.3, -0.25, 0.35, 0.28],
        [0.15, -0.15, 0.28, 0.22],
        [-0.1, 0.25, 0.22, 0.18],
        [0.35, 0.2, 0.3, 0.25],
        [-0.45, 0.1, 0.18, 0.14],
        [0.5, -0.35, 0.16, 0.12],
      ];

      for (const [bx, by, bw, bh] of continents) {
        const angle = Math.atan2(by, bx) + rot;
        const dist = Math.hypot(bx, by);
        const cx = Math.cos(angle) * dist * R;
        const cy = Math.sin(angle) * dist * R * 0.95;
        // Only draw if on the visible hemisphere
        if (Math.cos(angle) < -0.3) continue;
        const visibility = Math.max(0, Math.cos(angle) + 0.3);
        ctx.globalAlpha = 0.65 * visibility;
        ctx.beginPath();
        ctx.ellipse(cx, cy, bw * R * visibility, bh * R * visibility, angle * 1.5, 0, TAU);
        ctx.fill();
      }

      // Cloud layer
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(220,235,255,0.8)";
      const cloudRot = time * 0.04;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + cloudRot;
        const d = 0.2 + Math.sin(i * 2.3) * 0.5;
        const cx = Math.cos(a) * d * R;
        const cy = Math.sin(a) * d * R * 0.85;
        if (Math.cos(a) < -0.25) continue;
        const vis = Math.max(0, Math.cos(a) + 0.25);
        ctx.globalAlpha = 0.14 * vis;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 0.14 * R * vis, 0.06 * R * vis, a, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawEarth = () => {
      const R = Math.min(Math.max(Math.min(w, h) * 0.22, 90), 260);
      const cx = w * 0.82;
      const cy = h * 0.82;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = 0.9;

      // Outer atmosphere glow
      drawAtmosphereGlow(R);

      // Ocean base
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.clip();

      const ocean = ctx.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.1, 0, 0, R * 1.1);
      ocean.addColorStop(0, "#3a8fcf");
      ocean.addColorStop(0.4, "#1e6ba8");
      ocean.addColorStop(0.7, "#0d4a78");
      ocean.addColorStop(1, "#062340");
      ctx.fillStyle = ocean;
      ctx.fillRect(-R, -R, R * 2, R * 2);

      // Continents and clouds
      drawContinents(R);

      // Day/night terminator shading
      const shade = ctx.createRadialGradient(-R * 0.4, -R * 0.4, R * 0.15, -R * 0.05, -R * 0.05, R * 1.5);
      shade.addColorStop(0, "rgba(255,240,200,0.08)");
      shade.addColorStop(0.4, "rgba(0,0,0,0)");
      shade.addColorStop(0.75, "rgba(0,0,10,0.35)");
      shade.addColorStop(1, "rgba(0,0,10,0.85)");
      ctx.fillStyle = shade;
      ctx.fillRect(-R, -R, R * 2, R * 2);

      // City lights on night side
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(255,200,100,0.6)";
      const nightRot = time * 0.06 + Math.PI;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU + nightRot;
        const d = 0.15 + ((i * 7) % 5) / 5 * 0.6;
        const lx = Math.cos(a) * d * R;
        const ly = Math.sin(a) * d * R * 0.9;
        if (Math.cos(a) < 0.1) continue;
        const vis = Math.max(0, Math.cos(a));
        ctx.globalAlpha = 0.4 * vis;
        ctx.beginPath();
        ctx.arc(lx, ly, 0.6 + (i % 3) * 0.4, 0, TAU);
        ctx.fill();
      }

      ctx.restore();

      // Limb / atmosphere rim
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, R - 0.5, 0, TAU);
      ctx.strokeStyle = "rgba(120,190,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bright crescent highlight
      ctx.beginPath();
      ctx.arc(0, 0, R - 1, Math.PI * 0.95, Math.PI * 1.6);
      ctx.strokeStyle = "rgba(180,220,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    };

    /* ── Stars ────────────────────────────────────────── */

    const drawStars = () => {
      for (const s of stars) {
        s.x -= 2.2 * s.z * lastDt;
        s.y += 0.5 * s.z * lastDt;
        if (s.x < -20) s.x += w + 40;
        if (s.y > h + 20) s.y -= h + 40;

        const px = s.x;
        const py = s.y;

        const twinkle = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
        const alpha = (0.25 + 0.75 * twinkle) * (0.25 + 0.75 * s.z);
        const tint = STAR_COLORS[s.colorIndex]!;

        ctx.fillStyle = `rgba(${tint},${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, TAU);
        ctx.fill();

        if (s.r > 1.1) {
          ctx.fillStyle = `rgba(${tint},${alpha * 0.14})`;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 3.5, 0, TAU);
          ctx.fill();
        }

        if (s.flare) {
          const len = s.r * (4.5 + twinkle * 5.5);
          ctx.strokeStyle = `rgba(${tint},${alpha * 0.4})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(px - len, py);
          ctx.lineTo(px + len, py);
          ctx.moveTo(px, py - len);
          ctx.lineTo(px, py + len);
          ctx.stroke();
        }
      }
    };

    /* ── Meteors ──────────────────────────────────────── */

    const drawMeteors = () => {
      if (time >= nextMeteor) {
        const angle = (20 + Math.random() * 20) * (Math.PI / 180);
        const speed = 480 + Math.random() * 420;
        meteors.push({
          x: w * (0.2 + Math.random() * 0.85),
          y: Math.random() * h * 0.4,
          vx: -Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: 0.8 + Math.random() * 0.7,
          len: 100 + Math.random() * 160,
        });
        nextMeteor = time + 2 + Math.random() * 5;
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        if (!m) continue;
        m.age += lastDt;
        if (m.age > m.life) {
          meteors.splice(i, 1);
          continue;
        }
        m.x += m.vx * lastDt;
        m.y += m.vy * lastDt;
        const fade = Math.sin((m.age / m.life) * Math.PI);
        const speed = Math.hypot(m.vx, m.vy);
        const tx = m.x - (m.vx / speed) * m.len;
        const ty = m.y - (m.vy / speed) * m.len;
        const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, `rgba(255,255,255,${fade})`);
        g.addColorStop(0.25, `rgba(180,220,255,${fade * 0.6})`);
        g.addColorStop(0.6, `rgba(100,160,255,${fade * 0.2})`);
        g.addColorStop(1, "rgba(74,144,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Bright head
        ctx.fillStyle = `rgba(255,255,255,${fade})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(180,220,255,${fade * 0.3})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 4, 0, TAU);
        ctx.fill();
      }
    };

    /* ── Satellites (ISS-like flyby) ──────────────────── */

    const drawSatellites = () => {
      if (time >= nextSat) {
        const fromLeft = Math.random() < 0.5;
        const speed = 90 + Math.random() * 60;
        satellites.push({
          x: fromLeft ? -50 : w + 50,
          y: h * (0.1 + Math.random() * 0.5),
          vx: fromLeft ? speed : -speed,
          vy: (Math.random() - 0.5) * 12,
          age: 0,
          life: (w + 100) / speed,
          blink: 0,
        });
        nextSat = time + 8 + Math.random() * 12;
      }

      for (let i = satellites.length - 1; i >= 0; i--) {
        const s = satellites[i];
        if (!s) continue;
        s.age += lastDt;
        s.x += s.vx * lastDt;
        s.y += s.vy * lastDt;
        s.blink += lastDt;
        if (s.age > s.life) {
          satellites.splice(i, 1);
          continue;
        }

        // Trail
        const trailLen = 40;
        const tx = s.x - Math.sign(s.vx) * trailLen;
        const ty = s.y - s.vy * (trailLen / Math.abs(s.vx));
        const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
        g.addColorStop(0, "rgba(255,220,150,0.5)");
        g.addColorStop(1, "rgba(255,220,150,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Body
        ctx.fillStyle = "rgba(200,200,210,0.85)";
        ctx.fillRect(s.x - 2, s.y - 1, 4, 2);

        // Solar panels
        ctx.fillStyle = "rgba(30,60,120,0.8)";
        ctx.fillRect(s.x - 6, s.y - 0.5, 3, 1);
        ctx.fillRect(s.x + 3, s.y - 0.5, 3, 1);

        // Blinking light
        if (Math.sin(s.blink * 8) > 0.7) {
          ctx.fillStyle = "rgba(252,61,33,0.8)";
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.2, 0, TAU);
          ctx.fill();
        }
      }
    };

    /* ── Render loop ──────────────────────────────────── */

    const render = (dt: number) => {
      lastDt = dt;
      time += dt;

      ctx.clearRect(0, 0, w, h);
      drawNebula();
      drawMilkyWay();
      drawStars();
      drawEarth();
      if (!reduced) {
        drawMeteors();
        drawSatellites();
      }
    };

    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      render(dt);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduced || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 size-full" />;
}
