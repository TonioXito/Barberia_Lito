import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  HandCoins,
  Settings,
  LogOut,
  Menu,
  X,
  Beef,
} from "lucide-react";
import { useAuth } from "../firebase/auth";
import { useSettings } from "../hooks/useSettings";

const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/pos", label: "Vender", icon: ShoppingCart },
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/creditos", label: "Cuentas por cobrar", icon: HandCoins },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand-600 text-white"
                : "text-gray-600 hover:bg-brand-50 hover:text-brand-700"
            }`
          }
        >
          <item.icon size={19} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Layout({ children }) {
  const { logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const brand = (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Beef size={20} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold text-gray-900">
          {settings?.businessName || "Carnicería"}
        </p>
        <p className="text-[11px] text-gray-400">Punto de venta</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 flex-col border-r border-gray-200 bg-white md:flex">
        {brand}
        <NavItems />
        <div className="border-t p-3">
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut size={19} />
            Salir
          </button>
        </div>
      </aside>

      {/* Drawer móvil */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <div className="border-t p-3">
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
              >
                <LogOut size={19} />
                Salir
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <Menu size={22} />
          </button>
          <p className="truncate font-semibold text-gray-900">
            {settings?.businessName || "Carnicería"}
          </p>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}