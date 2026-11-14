import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  ClipboardCheck,
  Play,
  ScanLine,
  ShieldPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/data/types";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/health";

type Finder = string | (() => Element | null);

interface TourStep {
  /** Also the `data-tour` value that takes priority over the fallback finders. */
  id: string;
  route: string;
  eyebrow: string;
  title: string;
  body: string;
  targets: Finder[];
  /** Runs every frame on the step's route until it returns true. */
  prepare?: () => boolean;
  cleanup?: () => void;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const ORGAN_PANEL = 'section[aria-labelledby="scanner-heading"] aside[aria-live]';
let organOpenedByTour = false;

function cardWithHeading(text: string): Finder {
  return () => {
    const wanted = text.toLowerCase();
    const heading = Array.from(document.querySelectorAll("main h2, main h3")).find((h) =>
      h.textContent?.trim().toLowerCase().startsWith(wanted),
    );
    return heading?.closest("section") ?? null;
  };
}

const TOURS: Record<Role, TourStep[]> = {
  astronaut: [
    {
      id: "mission-console",
      route: "/astronaut",
      eyebrow: "Crew console",
      title: "Your mission console",
      body: "Mission day, overall health status and today's points at a glance. Every reading in this build is simulated demo telemetry.",
      targets: ["main section.orbit-grid-bg", "main section.orbit-card"],
    },
    {
      id: "scanner",
      route: "/astronaut",
      eyebrow: "3D Biometric Scanner",
      title: "Holographic body scan",
      body: "A 3D model of your body. Drag to orbit, scroll to zoom, then pick an organ system to read its telemetry and status.",
      targets: ['section[aria-labelledby="scanner-heading"]'],
    },
    {
      id: "countermeasures",
      route: "/astronaut",
      eyebrow: "NASA Health Countermeasures",
      title: "Countermeasures per organ system",
      body: "Every organ panel ends with a numbered countermeasure checklist: the corrective actions for that system, adapted to its current readings.",
      targets: [ORGAN_PANEL, 'section[aria-labelledby="scanner-heading"]'],
      prepare: () => {
        if (document.querySelector(ORGAN_PANEL)) return true;
        const organ = document.querySelector<HTMLButtonElement>('[aria-label="Select organ system"] button');
        if (!organ) return false;
        organ.click();
        organOpenedByTour = true;
        return true;
      },
      cleanup: () => {
        if (!organOpenedByTour) return;
        organOpenedByTour = false;
        document.querySelector<HTMLButtonElement>('button[aria-label="Close organ details"]')?.click();
      },
    },
    {
      id: "vitals",
      route: "/astronaut",
      eyebrow: "Vital Telemetry",
      title: "Current vitals",
      body: "Heart rate, SpO2, body temperature and respiratory rate from your wearable sensors, each compared with your personal baseline.",
      targets: ['section[aria-labelledby="vitals-heading"]'],
    },
    {
      id: "monitoring",
      route: "/astronaut/monitoring",
      eyebrow: "Vital Telemetry",
      title: "Live monitoring stream",
      body: "Start the stream for a new reading every 2 seconds, switch demo scenarios and change the time window. Alerts are raised when a reading drifts.",
      targets: ["main section.orbit-card"],
    },
    {
      id: "ai-analysis",
      route: "/astronaut/ai-analysis",
      eyebrow: "AI Analysis",
      title: "AI health analysis",
      body: "Reviews your last 24 hours of readings, alerts and latest check-in, then returns insights, baseline deviations and recommendations. It supports decisions and never replaces medical advice.",
      targets: [cardWithHeading("AI health analysis"), "main section.orbit-card"],
    },
    {
      id: "assessment",
      route: "/astronaut/assessment",
      eyebrow: "Daily Assessment",
      title: "Check-in, AI chatbot and analysis cards",
      body: "Answer the short daily check-in. On submit you get a wellness score, an AI analysis card and an AI chatbot for follow-up questions about your results.",
      targets: ['main ol[aria-label="Progress"] + section', "main section.orbit-card"],
    },
  ],
  medical: [
    {
      id: "crew-overview",
      route: "/medical",
      eyebrow: "Medical console",
      title: "Crew at a glance",
      body: "Crew size, who is stable, who needs attention and how many critical alerts are still unresolved.",
      targets: ["main > div > .grid", "main section.orbit-card"],
    },
    {
      id: "mission-health",
      route: "/medical",
      eyebrow: "Medical console",
      title: "Mission health trends",
      body: "The composite health index for each astronaut across the last 14 days, next to the current status distribution.",
      targets: [cardWithHeading("Mission health overview")],
    },
    {
      id: "directory",
      route: "/medical/directory",
      eyebrow: "Astronaut Directory",
      title: "Find any crew member",
      body: "Search the crew and open an astronaut's full medical profile.",
      targets: ["main > div > :nth-child(2)", "main > div"],
    },
    {
      id: "alerts",
      route: "/medical/alerts",
      eyebrow: "Medical Alerts",
      title: "Triage active alerts",
      body: "Track critical alerts, warnings and anything still awaiting acknowledgement, then filter the list below.",
      targets: ["main > div > .grid", "main > div"],
    },
    {
      id: "reports",
      route: "/medical/reports",
      eyebrow: "Health Reports",
      title: "Crew-wide reporting",
      body: "Summaries of who requires attention and how alerts are being handled across the crew.",
      targets: ["main > div > .grid", "main > div"],
    },
  ],
};

const FEATURES: { stepId: string; icon: LucideIcon; title: string; text: string }[] = [
  {
    stepId: "scanner",
    icon: ScanLine,
    title: "3D Biometric Scanner",
    text: "Holographic body model with per-organ telemetry.",
  },
  {
    stepId: "vitals",
    icon: Activity,
    title: "Vital Telemetry",
    text: "Heart rate, SpO2, temperature and respiration, live.",
  },
  {
    stepId: "ai-analysis",
    icon: BrainCircuit,
    title: "AI Analysis",
    text: "Insights and recommendations from your last 24 hours.",
  },
  {
    stepId: "assessment",
    icon: ClipboardCheck,
    title: "Daily Assessment",
    text: "Daily check-in with an AI chatbot and analysis cards.",
  },
  {
    stepId: "countermeasures",
    icon: ShieldPlus,
    title: "NASA Health Countermeasures",
    text: "Corrective actions for each organ system.",
  },
];

const DIM = "rgb(3 5 10 / 0.74)";
const SPOT_PAD = 6;
const CARD_GAP = 14;
const EDGE = 12;
const TOPBAR_CLEARANCE = 80;
const TARGET_TIMEOUT_MS = 3500;
const SETTLE_MS = 140;

const STYLES = `
@keyframes bb-float { from { transform: translateY(1.5px); } to { transform: translateY(-2px); } }
@keyframes bb-rotor { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.2); } }
@keyframes bb-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.12); } }
@keyframes bb-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.95; } }
@keyframes bb-ping { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes bb-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.bb-float { animation: bb-float 2.6s ease-in-out infinite alternate; }
.bb-rotor { transform-box: fill-box; transform-origin: center; animation: bb-rotor 0.22s linear infinite; }
.bb-eye { transform-box: fill-box; transform-origin: center; animation: bb-blink 4.5s infinite; }
.bb-pulse { animation: bb-pulse 1.8s ease-in-out infinite; }
.bb-beam { animation: bb-pulse 2.6s ease-in-out infinite; }
.bb-ping { animation: bb-ping 2.4s ease-out infinite; }
.bb-in { animation: bb-in 0.28s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .bb-float, .bb-rotor, .bb-eye, .bb-pulse, .bb-beam, .bb-ping, .bb-in { animation: none; }
}
`;

function isRendered(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function resolveTarget(step: TourStep): Element | null {
  const tagged = document.querySelector(`[data-tour="${step.id}"]`);
  if (tagged && isRendered(tagged)) return tagged;
  for (const finder of step.targets) {
    const el = typeof finder === "string" ? document.querySelector(finder) : finder();
    if (el && isRendered(el)) return el;
  }
  return null;
}

function scrollToTarget(el: Element) {
  const r = el.getBoundingClientRect();
  const offset = Math.max(TOPBAR_CLEARANCE, (window.innerHeight - r.height) / 2);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: window.scrollY + r.top - offset, behavior: reduced ? "auto" : "smooth" });
}

function placeCard(box: Box | null, vw: number, vh: number, w: number, h: number) {
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), Math.max(EDGE, vw - w - EDGE));
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), Math.max(EDGE, vh - h - EDGE));
  if (!box) return { top: clampY((vh - h) / 2), left: clampX((vw - w) / 2) };

  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const bottom = box.top + box.height;
  const right = box.left + box.width;

  if (vw < 640) return { left: EDGE, top: cy > vh * 0.55 ? EDGE : clampY(vh) };
  if (bottom + CARD_GAP + h <= vh - EDGE) return { top: bottom + CARD_GAP, left: clampX(cx - w / 2) };
  if (box.top - CARD_GAP - h >= EDGE) return { top: box.top - CARD_GAP - h, left: clampX(cx - w / 2) };
  if (right + CARD_GAP + w <= vw - EDGE) return { top: clampY(cy - h / 2), left: right + CARD_GAP };
  if (box.left - CARD_GAP - w >= EDGE) return { top: clampY(cy - h / 2), left: box.left - CARD_GAP - w };
  return { top: clampY(vh), left: clampX(vw) };
}

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

function Drone({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const hull = `bb-hull-${uid}`;
  const beam = `bb-beam-${uid}`;

  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={hull} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26344f" />
          <stop offset="1" stopColor="#0b0f19" />
        </linearGradient>
        <linearGradient id={beam} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0.6" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path className="bb-beam" d="M31 51h10l9 18H22z" fill={`url(#${beam})`} />

      <g className="bb-float">
        <line x1="36" y1="14" x2="36" y2="8.5" stroke="#d0d5dd" strokeWidth="1.5" strokeLinecap="round" />
        <circle className="bb-pulse" cx="36" cy="6.5" r="2.2" fill="#3b82f6" />

        <path d="M19 31H11M53 31h8" stroke="#d0d5dd" strokeWidth="2" strokeLinecap="round" />
        <rect x="5" y="27.5" width="8" height="7" rx="2" fill="#111827" stroke="rgb(255 255 255 / 0.3)" />
        <rect x="59" y="27.5" width="8" height="7" rx="2" fill="#111827" stroke="rgb(255 255 255 / 0.3)" />
        <ellipse className="bb-rotor" cx="9" cy="25" rx="8" ry="1.4" fill="#f8fafc" opacity="0.75" />
        <ellipse className="bb-rotor" cx="63" cy="25" rx="8" ry="1.4" fill="#f8fafc" opacity="0.75" />

        <rect x="18" y="14" width="36" height="36" rx="13" fill={`url(#${hull})`} stroke="rgb(255 255 255 / 0.32)" />
        <rect x="23" y="19.5" width="26" height="12" rx="6" fill="#06080f" stroke="rgb(59 130 246 / 0.55)" />
        <rect className="bb-eye" x="28.5" y="23" width="4" height="5" rx="2" fill="#3b82f6" />
        <rect className="bb-eye" x="39.5" y="23" width="4" height="5" rx="2" fill="#3b82f6" />

        <path d="M34.5 35.5h3v3h3v3h-3v3h-3v-3h-3v-3h3z" fill="#f8fafc" />
        <ellipse className="bb-pulse" cx="36" cy="51.5" rx="7" ry="1.6" fill="#3b82f6" />
      </g>
    </svg>
  );
}

export function BioBotAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { w: vw, h: vh } = useViewport();

  const [menuOpen, setMenuOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Box | null>(null);
  const [missing, setMissing] = useState(false);
  const [cardHeight, setCardHeight] = useState(240);

  const rootRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const navigateRef = useRef(navigate);
  const lastPlacement = useRef<{ top: number; left: number } | null>(null);
  const wasTouring = useRef(false);

  const menuId = useId();
  const titleId = useId();
  const bodyId = useId();

  const steps = user ? TOURS[user.role] : [];
  const step = stepIndex === null ? null : (steps[stepIndex] ?? null);
  const total = steps.length;
  const touring = step !== null;

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const endTour = useCallback(() => setStepIndex(null), []);
  const goNext = useCallback(
    () => setStepIndex((i) => (i === null || i >= total - 1 ? null : i + 1)),
    [total],
  );
  const goBack = useCallback(() => setStepIndex((i) => (i === null ? null : Math.max(0, i - 1))), []);

  // Back is disabled on the first step, so a keyboard user who just pressed it would lose focus.
  useEffect(() => {
    if (stepIndex !== 0 || !wasTouring.current) return;
    const active = document.activeElement;
    const stranded = !active || active === document.body || (active instanceof HTMLButtonElement && active.disabled);
    if (stranded) nextRef.current?.focus({ preventScroll: true });
  }, [stepIndex]);

  const startTour = (index: number) => {
    setMenuOpen(false);
    setStepIndex(index);
  };

  useEffect(() => {
    if (!step) return;
    setRect(null);
    setMissing(false);
    if (window.location.pathname !== step.route) navigateRef.current(step.route);

    const startedAt = performance.now();
    let frame = 0;
    let prepared = !step.prepare;
    let scrolled = false;
    let settled = false;
    let stableSince = 0;
    let flaggedMissing = false;
    let last: Box | null = null;
    let current: Element | null = null;

    const tick = () => {
      frame = requestAnimationFrame(tick);

      let el: Element | null = null;
      if (window.location.pathname === step.route) {
        if (!prepared && step.prepare) prepared = step.prepare();
        el = resolveTarget(step);
      }

      if (!el) {
        if (!flaggedMissing && performance.now() - startedAt > TARGET_TIMEOUT_MS) {
          flaggedMissing = true;
          setMissing(true);
        }
        if (last) {
          last = null;
          current = null;
          settled = false;
          stableSince = 0;
          setRect(null);
        }
        return;
      }

      if (flaggedMissing) {
        flaggedMissing = false;
        setMissing(false);
      }
      // A route change can briefly resolve to the outgoing page's element; restart for the real one.
      if (el !== current) {
        if (settled) setRect(null);
        current = el;
        scrolled = false;
        settled = false;
        stableSince = 0;
        last = null;
      }
      if (!scrolled) {
        scrolled = true;
        scrollToTarget(el);
      }

      const r = el.getBoundingClientRect();
      const next: Box = { top: r.top, left: r.left, width: r.width, height: r.height };
      const moved =
        !last ||
        Math.abs(last.top - next.top) > 0.5 ||
        Math.abs(last.left - next.left) > 0.5 ||
        Math.abs(last.width - next.width) > 0.5 ||
        Math.abs(last.height - next.height) > 0.5;
      last = next;

      // Hold the spotlight back until the smooth scroll and any layout shift have finished.
      if (!settled) {
        const now = performance.now();
        if (moved || stableSince === 0) {
          stableSince = now;
          return;
        }
        if (now - stableSince < SETTLE_MS) return;
        settled = true;
        setRect(next);
        return;
      }
      if (moved) setRect(next);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      step.cleanup?.();
    };
  }, [step]);

  useEffect(() => {
    if (!touring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endTour();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [touring, endTour, goNext, goBack]);

  useEffect(() => {
    if (touring && !wasTouring.current) {
      cardRef.current?.focus({ preventScroll: true });
    } else if (!touring && wasTouring.current) {
      lastPlacement.current = null;
      launcherRef.current?.focus({ preventScroll: true });
    }
    wasTouring.current = touring;
  }, [touring]);

  useEffect(() => {
    if (!menuOpen) return;
    startRef.current?.focus({ preventScroll: true });
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      launcherRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && h !== cardHeight) setCardHeight(h);
  });

  const spot = useMemo<Box | null>(() => {
    if (!rect) return null;
    const top = Math.max(rect.top - SPOT_PAD, 4);
    const left = Math.max(rect.left - SPOT_PAD, 4);
    const bottom = Math.min(rect.top + rect.height + SPOT_PAD, vh - 4);
    const right = Math.min(rect.left + rect.width + SPOT_PAD, vw - 4);
    if (bottom - top < 40 || right - left < 40) return null;
    return { top, left, width: right - left, height: bottom - top };
  }, [rect, vw, vh]);

  const cardWidth = Math.min(340, vw - EDGE * 2);
  const anchored = spot ? placeCard(spot, vw, vh, cardWidth, cardHeight) : null;
  const placement =
    anchored ?? (missing ? null : lastPlacement.current) ?? placeCard(null, vw, vh, cardWidth, cardHeight);

  useEffect(() => {
    if (anchored) lastPlacement.current = anchored;
  });

  const trapFocus = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === e.currentTarget)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!user) return null;

  const isLast = stepIndex !== null && stepIndex === total - 1;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <style>{STYLES}</style>

      {step && stepIndex !== null ? (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[70] print:hidden"
            style={{ backgroundColor: spot ? "transparent" : DIM }}
          />

          {spot ? (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-[71] rounded-xl border border-orbit-cyan/80 print:hidden"
              style={{
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
                boxShadow: `0 0 0 9999px ${DIM}, 0 0 36px -6px rgb(59 130 246 / 0.7)`,
              }}
            >
              <span className="absolute -left-1 -top-1 size-3.5 rounded-tl-md border-l-2 border-t-2 border-ink" />
              <span className="absolute -right-1 -top-1 size-3.5 rounded-tr-md border-r-2 border-t-2 border-ink" />
              <span className="absolute -bottom-1 -left-1 size-3.5 rounded-bl-md border-b-2 border-l-2 border-ink" />
              <span className="absolute -bottom-1 -right-1 size-3.5 rounded-br-md border-b-2 border-r-2 border-ink" />
            </div>
          ) : null}

          <div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            tabIndex={-1}
            onKeyDown={trapFocus}
            className="fixed z-[72] rounded-xl border border-orbit-cyan/40 bg-[#070b16]/95 p-4 shadow-2xl shadow-black/60 outline-none backdrop-blur-md print:hidden"
            style={{ top: placement.top, left: placement.left, width: cardWidth }}
          >
            <div className="flex items-center gap-2.5">
              <Drone className="size-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-orbit-cyan">
                  {step.eyebrow}
                </p>
                <p className="font-mono text-[11px] tracking-[0.14em] text-orbit-dim">
                  STEP {pad(stepIndex + 1)} / {pad(total)}
                </p>
              </div>
              <button
                type="button"
                onClick={endTour}
                aria-label="Close guided tour"
                className="rounded-md p-1.5 text-orbit-muted transition-colors hover:bg-white/10 hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div key={step.id} className="bb-in mt-3" aria-live="polite">
              <h2 id={titleId} className="text-base font-semibold tracking-tight text-ink text-balance">
                {step.title}
              </h2>
              <p id={bodyId} className="mt-1.5 text-sm leading-relaxed text-orbit-muted text-pretty">
                {step.body}
              </p>
              {missing ? (
                <p className="mt-2 text-xs leading-relaxed text-orbit-warn">
                  This section isn&apos;t on screen right now, so nothing is highlighted.
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex gap-1" aria-hidden="true">
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={cn("h-0.5 flex-1 rounded-full", i <= stepIndex ? "bg-orbit-cyan" : "bg-white/12")}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-sm text-ink transition-colors hover:bg-white/5 disabled:invisible"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </button>
              <button
                ref={nextRef}
                type="button"
                onClick={goNext}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orbit-cyan px-4 text-sm font-semibold text-orbit-bg transition-colors hover:bg-orbit-cyan/90"
              >
                {isLast ? "Finish" : "Next"}
                {isLast ? null : <ArrowRight className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div ref={rootRef} className="fixed bottom-5 right-5 z-50 print:hidden">
          {menuOpen ? (
            <div
              id={menuId}
              role="dialog"
              aria-label="Bio-Bot mission guide"
              className="bb-in absolute bottom-[calc(100%+12px)] right-0 max-h-[calc(100dvh-7.5rem)] w-[340px] max-w-[calc(100vw-2.5rem)] overflow-y-auto sm:bottom-0 sm:right-[calc(100%+12px)] sm:max-h-[calc(100dvh-2.5rem)] rounded-xl border border-white/12 bg-[#070b16]/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-orbit-dim">
                    <span className="bb-pulse size-1.5 rounded-full bg-orbit-teal" aria-hidden="true" />
                    Bio-Bot · Medical drone
                  </p>
                  <h2 className="mt-1 text-base font-semibold tracking-tight text-ink">Mission guide</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    launcherRef.current?.focus({ preventScroll: true });
                  }}
                  aria-label="Close Bio-Bot menu"
                  className="rounded-md p-1.5 text-orbit-muted transition-colors hover:bg-white/10 hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <button
                ref={startRef}
                type="button"
                onClick={() => startTour(0)}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orbit-cyan px-4 text-sm font-semibold text-orbit-bg transition-colors hover:bg-orbit-cyan/90"
              >
                <Play className="size-4" aria-hidden="true" />
                Start Guided Tour
                <span className="font-mono text-[11px] font-medium opacity-80">· {total} stops</span>
              </button>

              <p className="mt-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-orbit-dim">
                Platform features
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {FEATURES.map(({ stepId, icon: Icon, title, text }) => {
                  const index = steps.findIndex((s) => s.id === stepId);
                  const content = (
                    <>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-orbit-cyan">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-orbit-muted">{text}</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={stepId}>
                      {index >= 0 ? (
                        <button
                          type="button"
                          onClick={() => startTour(index)}
                          className="group flex w-full items-start gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                        >
                          {content}
                          <ChevronRight
                            className="mt-2 size-4 shrink-0 text-orbit-dim transition-colors group-hover:text-ink"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Show on the page</span>
                        </button>
                      ) : (
                        <div className="flex items-start gap-3 p-2">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <button
            ref={launcherRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            aria-label={menuOpen ? "Close Bio-Bot assistant" : "Open Bio-Bot assistant"}
            className="group relative flex size-14 items-center justify-center rounded-full border border-white/15 bg-[#0b0f19]/90 shadow-[0_10px_32px_-10px_rgb(59_130_246/0.75)] backdrop-blur-md transition-colors hover:border-orbit-cyan/60 sm:size-16"
          >
            {menuOpen ? null : (
              <>
                <span
                  aria-hidden="true"
                  className="bb-ping pointer-events-none absolute inset-0 rounded-full border border-orbit-cyan/60"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-md border border-white/10 bg-[#070b16]/95 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-orbit-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
                >
                  Bio-Bot · Guided tour
                </span>
              </>
            )}
            <Drone className="size-11 sm:size-12" />
          </button>
        </div>
      )}
    </>
  );
}
