/**
 * Sustable-Wortmarke: "sustable" mit orangem Quadratpunkt (wie im Logo-PNG,
 * public/sustable-logo.png). Als Text/CSS umgesetzt, damit sie in Dark
 * (weiße Schrift) und White Mode (schwarze Schrift) automatisch passt –
 * der Punkt bleibt immer Sustable-Orange.
 */
export function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-bold tracking-tight text-slate-900 ${className}`}
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      sustable
      <span
        className="ml-[0.1em] inline-block"
        style={{ width: "0.16em", height: "0.16em", backgroundColor: "#F07D00" }}
        aria-hidden
      />
    </span>
  );
}
