import { cn } from "@/lib/health";

export function LogoMark({ size = 36, alt = "" }: { size?: number; alt?: string }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className="shrink-0 select-none"
    />
  );
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-extrabold tracking-[-0.035em] text-ink", className)}>
      Astro<span className="text-brand-sky">Vitals</span>
    </span>
  );
}

export function Wordmark({ showText = true }: { showText?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark alt={showText ? "" : "AstroVitals"} />
      {showText ? (
        <span className="flex flex-col leading-none">
          <BrandName className="text-[22px] leading-none" />
          <span className="mt-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-orbit-dim">NASA Health Command</span>
        </span>
      ) : null}
    </span>
  );
}
