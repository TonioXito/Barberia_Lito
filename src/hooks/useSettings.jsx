import { createContext, useContext, useState, useEffect } from "react";
import { onSettings, DEFAULT_SETTINGS, updateSettings } from "../firebase/services";

const SettingsCtx = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // settings/config es de lectura pública para poder mostrar el login
    // y el estado de suscripción antes de iniciar sesión.
    let unsub = null;
    try {
      unsub = onSettings(
        (s) => {
          setSettings(s);
          setReady(true);
        },
        (err) => {
          console.error("No se pudo leer la configuración de Firebase", err);
          setError(err);
          setReady(true);
        },
      );
    } catch (e) {
      console.error("No se pudo escuchar settings", e);
      setError(e);
      setReady(true);
    }
    return () => unsub && unsub();
  }, []);

  return (
    <SettingsCtx.Provider value={{ settings, error, ready, update: updateSettings }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings debe usarse dentro de SettingsProvider");
  return ctx;
}