import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error en la aplicación:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <span className="text-2xl">!</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Ocurrió un error</h1>
            <p className="mt-2 text-sm text-gray-500">
              Algo falló al mostrar esta pantalla. Puedes recargar la aplicación
              para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}