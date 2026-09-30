import { Card } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { passwordLoginAllowed } from "@/lib/auth";
import { googleSsoEnabled } from "@/lib/google-oauth";
import { PasswordLoginForm } from "./PasswordLoginForm";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  google_disabled: "Google-Login ist nicht eingerichtet.",
  google_state: "Sitzung abgelaufen – bitte erneut versuchen.",
  google_exchange: "Google-Anmeldung fehlgeschlagen – bitte erneut versuchen.",
  google_unverified: "Diese Google-E-Mail-Adresse ist nicht bestätigt.",
  google_domain: "Zugang nur für Mitarbeiter der Organisation.",
  google_no_account:
    "Kein Zugang für diese Adresse. Bitte einen Administrator bitten, dich unter Einstellungen → Nutzer anzulegen.",
};

/** Google-"G"-Logo (offizielle Mehrfarb-Variante) – nur als Icon im Button. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.2-5.5l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C40.9 36.9 44 31.1 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const googleEnabled = googleSsoEnabled();
  const passwordEnabled = passwordLoginAllowed();
  const errorMessage = searchParams?.error ? ERROR_MESSAGES[searchParams.error] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm p-8">
        <Logo className="text-2xl" />
        <p className="mb-6 mt-2 text-sm text-slate-500">Bitte anmelden</p>

        {errorMessage && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        {googleEnabled && (
          <a
            href="/api/auth/google/start"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <GoogleIcon />
            Mit Google anmelden
          </a>
        )}

        {googleEnabled && passwordEnabled && (
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            oder
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        )}

        {passwordEnabled && <PasswordLoginForm />}

        {!googleEnabled && !passwordEnabled && (
          <p className="text-sm text-red-600">
            Kein Login-Verfahren aktiviert – bitte Konfiguration prüfen.
          </p>
        )}
      </Card>
    </div>
  );
}
