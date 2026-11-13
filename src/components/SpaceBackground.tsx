import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  phase: number;
  speed: number;
  tint: string;
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

interface Ripple {
  x: number;
  y: number;
  age: number;
}

const TAU = Math.PI * 2;
const TINTS = ["255,255,255", "190,235,255", "150,225,240", "255,240,220", "170,200,255"];
const RING_TILT = -0.38;

function pickTint(): string {
  return TINTS[Math.floor(Math.random() * TINTS.length)] ?? "255,255,255";
}

function buildStars(w: number, h: number): Star[] {
  const count = Math.min(650, Math.floor((w * h) / 2600));
  return Array.from({ length: count }, () => {
    const z = 0.2 + Math.random() ** 2 * 0.8;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      z,
      r: 0.3 + z * 1.0 + (Math.random() < 0.05 ? 0.7 : 0),
      phase: Math.random() * TAU,
      speed: 0.6 + Math.random() * 2.2,
      tint: pickTint(),
      flare: z > 0.8 && Math.random() < 0.4,
    };
  });
}

function buildNebula(w: number, h: number): HTMLCanvasElement {
  const nebula = document.createElement("canvas");
  nebula.width = Math.ceil(w / 2);
  nebula.height = Math.ceil(h / 2);
  const nctx = nebula.getContext("2d");
  if (!nctx) return nebula;

  const blobs: Array<[number, number, number, string, number]> = [
    [0.12, 0.2, 0.6, "74,144,255", 0.2],
    [0.86, 0.12, 0.55, "92,72,204", 0.2],
    [0.55, 0.88, 0.65, "32,199,165", 0.13],
    [0.28, 0.72, 0.45, "60,104,224", 0.16],
    [0.72, 0.45, 0.38, "176,84,200", 0.07],
  ];
  const size = Math.max(nebula.width, nebula.height);
  for (const [fx, fy, fr, rgb, alpha] of blobs) {
    const cx = fx * nebula.width;
    const cy = fy * nebula.height;
    const radius = fr * size;
    const g = nctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(0.5, `rgba(${rgb},${alpha * 0.4})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    nctx.fillStyle = g;
    nctx.fillRect(0, 0, nebula.width, nebula.height);
  }
  return nebula;
}

interface SpaceBackgroundProps {
  interactive?: boolean;
}

export function SpaceBackground({ interactive = true }: SpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveRef = useRef(interactive);

  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);

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
    const meteors: Meteor[] = [];
    const ripples: Ripple[] = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -9999, py: -9999, lastMove: -99 };
    let warp = 0;
    let time = 0;
    let nextMeteor = 1.5;
    let last = 0;
    let raf = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = buildStars(w, h);
      nebula = buildNebula(w, h);
      if (reduced) render(0);
    };

    const drawNebula = () => {
      if (!nebula) return;
      const scale = 2.3;
      const drawW = nebula.width * scale;
      const drawH = nebula.height * scale;
      const driftX = Math.sin(time * 0.05) * 30;
      const driftY = Math.cos(time * 0.04) * 20;
      ctx.globalAlpha = 0.85 + Math.sin(time * 0.3) * 0.1;
      ctx.drawImage(
        nebula,
        (w - drawW) / 2 - pointer.x * 22 + driftX,
        (h - drawH) / 2 - pointer.y * 14 + driftY,
        drawW,
        drawH,
      );
      ctx.globalAlpha = 1;
    };

    const drawRing = (front: boolean, radius: number) => {
      ctx.save();
      ctx.rotate(RING_TILT);
      ctx.scale(1, 0.28);
      const rings: Array<[number, number, number]> = [
        [1.38, 0.05, 0.14],
        [1.52, 0.03, 0.22],
        [1.66, 0.07, 0.12],
        [1.84, 0.02, 0.18],
      ];
      for (const [mult, width, alpha] of rings) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * mult, front ? 0 : Math.PI, front ? Math.PI : TAU);
        ctx.strokeStyle = `rgba(160,225,240,${alpha})`;
        ctx.lineWidth = radius * width;
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawMoon = (radius: number, front: boolean) => {
      const angle = time * 0.22;
      const mx = Math.cos(angle) * radius * 2.15;
      const my = Math.sin(angle) * radius * 2.15 * 0.28;
      if (Math.sin(angle) > 0 !== front) return;
      ctx.save();
      ctx.rotate(RING_TILT);
      const mr = radius * 0.09;
      const g = ctx.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, mr * 0.1, mx, my, mr);
      g.addColorStop(0, "#d6e6f0");
      g.addColorStop(1, "#2b3d52");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TAU);
      ctx.fill();
      ctx.restore();
    };

    const drawPlanet = () => {
      const R = Math.min(Math.max(Math.min(w, h) * 0.26, 110), 300);
      const cx = w * 0.84 - pointer.x * 10;
      const cy = h * 0.88 - pointer.y * 6;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = 0.92;

      const glow = ctx.createRadialGradient(0, 0, R * 0.85, 0, 0, R * 1.75);
      glow.addColorStop(0, "rgba(74,144,255,0.24)");
      glow.addColorStop(1, "rgba(74,144,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.75, 0, TAU);
      ctx.fill();

      ctx.save();
      ctx.rotate(RING_TILT);
      ctx.scale(1, 0.28);
      ctx.beginPath();
      ctx.arc(0, 0, R * 2.15, 0, TAU);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      drawMoon(R, false);
      drawRing(false, R);

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.clip();

      const base = ctx.createRadialGradient(-R * 0.4, -R * 0.4, R * 0.1, 0, 0, R * 1.1);
      base.addColorStop(0, "#2f7a96");
      base.addColorStop(0.5, "#17445f");
      base.addColorStop(1, "#091a2e");
      ctx.fillStyle = base;
      ctx.fillRect(-R, -R, R * 2, R * 2);

      const bandCount = 10;
      const bandH = (R * 2) / bandCount;
      for (let i = 0; i < bandCount; i++) {
        const y = -R + i * bandH;
        ctx.beginPath();
        ctx.moveTo(-R, y + bandH);
        for (let x = -R; x <= R; x += 14) {
          ctx.lineTo(x, y + Math.sin(x * 0.02 + time * 0.25 + i * 1.7) * R * 0.018);
        }
        ctx.lineTo(R, y + bandH);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? "rgba(32,199,165,0.09)" : "rgba(10,30,56,0.22)";
        ctx.fill();
      }

      const shade = ctx.createRadialGradient(-R * 0.45, -R * 0.45, R * 0.2, -R * 0.1, -R * 0.1, R * 1.6);
      shade.addColorStop(0, "rgba(3,8,18,0)");
      shade.addColorStop(0.55, "rgba(3,8,18,0.05)");
      shade.addColorStop(1, "rgba(3,8,18,0.9)");
      ctx.fillStyle = shade;
      ctx.fillRect(-R, -R, R * 2, R * 2);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(0, 0, R - 1, Math.PI * 0.92, Math.PI * 1.62);
      ctx.strokeStyle = "rgba(130,235,245,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      drawRing(true, R);
      drawMoon(R, true);
      ctx.restore();
    };

    const drawStars = () => {
      const cx = w / 2;
      const cy = h / 2;
      const interactive = time - pointer.lastMove < 4;
      const near: Array<{ x: number; y: number; d: number }> = [];

      for (const s of stars) {
        s.x -= 3 * s.z * lastDt;
        s.y += 0.8 * s.z * lastDt;
        if (s.x < -20) s.x += w + 40;
        if (s.y > h + 20) s.y -= h + 40;

        let px = s.x + pointer.x * s.z * 28;
        let py = s.y + pointer.y * s.z * 18;

        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;
        px += ux * warp * s.z * 40;
        py += uy * warp * s.z * 40;

        let boost = 0;
        if (interactive) {
          const mdx = px - pointer.px;
          const mdy = py - pointer.py;
          const md = Math.hypot(mdx, mdy) || 1;
          if (md < 150) {
            const f = 1 - md / 150;
            px += (mdx / md) * f * 14 * s.z;
            py += (mdy / md) * f * 14 * s.z;
            boost = f * 0.6;
            if (md < 130 && near.length < 14) near.push({ x: px, y: py, d: md });
          }
        }

        const twinkle = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
        const alpha = Math.min(1, (0.3 + 0.7 * twinkle) * (0.3 + 0.7 * s.z) + boost);
        const streak = warp * (20 + 120 * s.z);

        if (streak > 2) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - ux * streak, py - uy * streak);
          ctx.strokeStyle = `rgba(${s.tint},${alpha})`;
          ctx.lineWidth = s.r;
          ctx.stroke();
          continue;
        }

        ctx.fillStyle = `rgba(${s.tint},${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, TAU);
        ctx.fill();

        if (s.r > 1.2) {
          ctx.fillStyle = `rgba(${s.tint},${alpha * 0.16})`;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 3.2, 0, TAU);
          ctx.fill();
        }

        if (s.flare) {
          const len = s.r * (5 + twinkle * 5);
          ctx.strokeStyle = `rgba(${s.tint},${alpha * 0.45})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(px - len, py);
          ctx.lineTo(px + len, py);
          ctx.moveTo(px, py - len);
          ctx.lineTo(px, py + len);
          ctx.stroke();
        }
      }

      if (near.length > 0) {
        ctx.lineWidth = 0.8;
        for (let i = 0; i < near.length; i++) {
          const a = near[i];
          if (!a) continue;
          ctx.strokeStyle = `rgba(74,144,255,${(1 - a.d / 130) * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(pointer.px, pointer.py);
          ctx.lineTo(a.x, a.y);
          ctx.stroke();
          for (let j = i + 1; j < near.length; j++) {
            const b = near[j];
            if (!b) continue;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 90) {
              ctx.strokeStyle = `rgba(74,144,255,${(1 - d / 90) * 0.4})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }
    };

    const drawMeteors = () => {
      if (time >= nextMeteor) {
        const angle = (22 + Math.random() * 16) * (Math.PI / 180);
        const speed = 520 + Math.random() * 380;
        meteors.push({
          x: w * (0.25 + Math.random() * 0.8),
          y: Math.random() * h * 0.45,
          vx: -Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: 0.9 + Math.random() * 0.6,
          len: 90 + Math.random() * 120,
        });
        nextMeteor = time + 2.5 + Math.random() * 5;
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
        g.addColorStop(0.3, `rgba(120,230,245,${fade * 0.5})`);
        g.addColorStop(1, "rgba(74,144,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${fade})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.6, 0, TAU);
        ctx.fill();
      }
    };

    const drawRipples = () => {
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        if (!r) continue;
        r.age += lastDt;
        if (r.age > 1.2) {
          ripples.splice(i, 1);
          continue;
        }
        const p = r.age / 1.2;
        ctx.strokeStyle = `rgba(74,144,255,${(1 - p) * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, p * 160, 0, TAU);
        ctx.stroke();
      }
    };

    let lastDt = 0;

    const render = (dt: number) => {
      lastDt = dt;
      time += dt;
      if (!interactiveRef.current) {
        pointer.tx = 0;
        pointer.ty = 0;
        pointer.lastMove = -99;
      }
      const ease = Math.min(1, dt * 3);
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      warp = Math.max(0, warp - dt * 1.1);

      ctx.clearRect(0, 0, w, h);
      drawNebula();
      drawStars();
      drawPlanet();
      if (!reduced) {
        drawMeteors();
        drawRipples();
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

    const onMove = (e: PointerEvent) => {
      if (!interactiveRef.current) return;
      pointer.tx = (e.clientX / w - 0.5) * 2;
      pointer.ty = (e.clientY / h - 0.5) * 2;
      pointer.px = e.clientX;
      pointer.py = e.clientY;
      pointer.lastMove = time;
    };

    const onDown = (e: PointerEvent) => {
      if (!interactiveRef.current) return;
      warp = Math.min(1, warp + 0.55);
      ripples.push({ x: e.clientX, y: e.clientY, age: 0 });
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 size-full" />;
}
