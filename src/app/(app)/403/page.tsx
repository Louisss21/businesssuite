import { LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function NoAccessPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">Kein Zugriff</h1>
      <p className="mt-2 text-sm text-slate-500">
        Deine Rolle hat keine Berechtigung für diesen Bereich. Wende dich an einen
        Administrator, falls du Zugriff benötigst.
      </p>
      <div className="mt-6">
        <LinkButton href="/">Zum Dashboard</LinkButton>
      </div>
    </div>
  );
}
