import { Settings, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/Button";

export function ConfigNotice({ error }) {
  const isPlaceholder = !import.meta.env.VITE_FIREBASE_API_KEY;
  const msg = error?.code === "permission-denied" || error?.code === "unavailable"
    ? "No se pudo conectar con Firebase. Revisa tu conexión o la configuración."
    : isPlaceholder ? "Aún no has configurado Firebase en esta app."
    : "No se pudo conectar con Firebase.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Settings size={28} />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Configuración necesaria</h1>
        <p className="mt-2 text-sm text-gray-500">{msg}</p>
        <ul className="mt-4 space-y-1 text-left text-sm text-gray-600">
          <li>1. Crea un proyecto en <b>console.firebase.google.com</b></li>
          <li>2. Activa <b>Firestore</b> y el acceso <b>Anónimo</b> en Authentication</li>
          <li>3. Copia tus credenciales en <code className="rounded bg-gray-100 px-1 font-mono text-xs">src/firebase/config.js</code></li>
          <li>4. Publica las reglas con <code className="rounded bg-gray-100 px-1 font-mono text-xs">firebase deploy</code></li>
          <li>5. Crea el documento <code className="rounded bg-gray-100 px-1 font-mono text-xs">settings/config</code> (ver README)</li>
        </ul>
        <div className="mt-6 flex justify-center gap-2">
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
          >
            <Button>
              <ExternalLink size={16} /> Ir a Firebase
            </Button>
          </a>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Consulta el README del proyecto para el paso a paso completo.
        </p>
      </div>
    </div>
  );
}