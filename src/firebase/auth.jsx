import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInAnonymously, signOut as fbSignOut } from "firebase/auth";
import { auth } from "./config";
import { verifyPassword } from "./services";

const SESSION_KEY = "carniceria_session";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);

  // Sesión anónima de Firebase: permite que las reglas de Firestore
  // protejan los datos (solo con sesión). El acceso real de la app
  // se controla con la contraseña única del negocio.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        signInAnonymously(auth).catch((e) => {
          console.error("No se pudo iniciar sesión anónima en Firebase", e);
        });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const check = () => {
      try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (s && s.expires && new Date(s.expires) > new Date()) {
          setIsAuthed(true);
        } else {
          localStorage.removeItem(SESSION_KEY);
          setIsAuthed(false);
        }
      } catch {
        setIsAuthed(false);
      }
      setReady(true);
    };
    check();
  }, []);

  const login = useCallback(async (password) => {
    const ok = await verifyPassword(password);
    if (!ok) throw new Error("Contraseña incorrecta");
    const session = { at: Date.now(), expires: Date.now() + 1000 * 60 * 60 * 24 * 7 };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setIsAuthed(true);
    return true;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthed(false);
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignora: cierre de sesión anónimo
    }
  }, []);

  return (
    <AuthCtx.Provider value={{ authUser, isAuthed, ready, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}