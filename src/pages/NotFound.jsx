import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <p className="text-6xl font-black text-brand-600">404</p>
      <h1 className="mt-2 text-xl font-bold text-gray-900">Página no encontrada</h1>
      <p className="mt-1 text-sm text-gray-500">
        La página que buscas no existe.
      </p>
      <Link to="/" className="mt-6">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}