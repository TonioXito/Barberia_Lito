import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Beef } from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import { activateSubscription } from "../firebase/services";
import { Button } from "../components/ui/Button";
import { ToastProvider, useToast } from "../components/ui/Toast";
import { ConfigNotice } from "../components/ConfigNotice";

function ActivationInner() {
  const { settings, error } = useSettings();
  const navigate = useNavigate();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (error) return <ConfigNotice error={error} />;

  async function handleActivate(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      await activateSubscription(code);
      toast.success("Suscripción activada correctamente");
      navigate("/login");
    } catch (err) {
      setErr(err.message || "No se pudo activar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Beef size={34} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {settings?.businessName || "Carnicería"}
          </h1>
          <p className="text-sm text-gray-500">Suscripción requerida</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tu suscripción no está activa o ha expirado. Introduce el código de
          activación para continuar usando el sistema.
        </div>

        <form
          onSubmit={handleActivate}
          className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-3 z-10 text-gray-400" size={18} />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de activación"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm uppercase tracking-widest text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

          <Button
            type="submit"
            className="mt-4 w-full"
            disabled={loading}
            size="lg"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Activar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Para activar o desactivar desde Firebase, edita el documento{" "}
          <code className="rounded bg-gray-100 px-1">settings/config</code> →{" "}
          <code className="rounded bg-gray-100 px-1">subscription.active</code>
        </p>
      </div>
    </div>
  );
}

export function ActivationPage() {
  return (
    <ToastProvider>
      <ActivationInner />
    </ToastProvider>
  );
}