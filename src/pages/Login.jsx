import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Beef, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../firebase/auth";
import { useSettings } from "../hooks/useSettings";
import { Button } from "../components/ui/Button";
import { ConfigNotice } from "../components/ConfigNotice";

function LoginInner() {
  const { login } = useAuth();
  const { settings, error: settingsError } = useSettings();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (settingsError) return <ConfigNotice error={settingsError} />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) {
      setError("Escribe la contraseña");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Contraseña incorrecta");
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
          <p className="text-sm text-gray-500">Punto de venta · Acceso protegido</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-3 z-10 text-gray-400" size={18} />
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoFocus
              className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-10 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" className="mt-4 w-full" disabled={loading} size="lg">
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Aplicación para el control de ventas e inventario
        </p>
      </div>
    </div>
  );
}

export function LoginPage() {
  return <LoginInner />;
}