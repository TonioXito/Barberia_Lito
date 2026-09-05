import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useProducts, useSales, useClients, useCreditSales } from "../hooks/useData";
import { useSettings } from "../hooks/useSettings";
import { startOfDay, fmtUSD, fmtBs, fmtQty } from "../lib/format";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { PageLoader } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="truncate text-lg font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { data: products } = useProducts();
  const { data: sales, loading } = useSales();
  const { data: clients } = useClients();
  const { data: creditSales } = useCreditSales();
  const { settings } = useSettings();
  const rate = Number(settings?.exchangeRate) || 0;

  const stats = useMemo(() => {
    const today = startOfDay();
    const todaySales = sales.filter((s) => {
      const t = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
      return t >= today;
    });
    const totalToday = todaySales.reduce((a, s) => a + Number(s.totalUsd || 0), 0);
    const totalGeneral = sales.reduce((a, s) => a + Number(s.totalUsd || 0), 0);
    const activeProducts = products.filter((p) => p.active);
    const lowStock = products.filter((p) => p.active && Number(p.stock) <= 0);
    const totalDebt = creditSales.reduce(
      (a, s) => a + Number(s.balanceUsd || 0),
      0,
    );
    const newest = [...sales]
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return tb - ta;
      })
      .slice(0, 8);
    return { totalToday, totalGeneral, activeProducts, lowStock, totalDebt, newest };
  }, [products, sales, creditSales]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resumen del día</h1>
          <p className="text-sm text-gray-500">Bienvenido de nuevo</p>
        </div>
        <Link
          to="/pos"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <ShoppingCart size={18} />
          Nueva venta
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Ventas de hoy"
          value={fmtUSD(stats.totalToday)}
          sub={rate ? fmtBs(stats.totalToday * rate) : ""}
          color="bg-emerald-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Ventas totales"
          value={fmtUSD(stats.totalGeneral)}
          sub={`${sales.length} ventas`}
          color="bg-blue-500"
        />
        <StatCard
          icon={Package}
          label="Productos activos"
          value={activeProducts.length}
          sub={`${stats.lowStock.length} sin stock`}
          color="bg-amber-500"
        />
        <StatCard
          icon={Users}
          label="Clientes"
          value={clients.length}
          sub="en cartera"
          color="bg-purple-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Últimas ventas</h3>
            <Link to="/reportes" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              Ver reportes <ArrowRight size={14} />
            </Link>
          </div>
          {stats.newest.length === 0 ? (
            <EmptyState title="Sin ventas todavía" description="Comienza a vender desde el punto de venta" />
          ) : (
            <div className="space-y-2">
              {stats.newest.map((s) => {
                const t = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {s.clientName || "Cliente general"}
                      </p>
                      <p className="text-xs text-gray-400">
                        #{s.ticketNumber} · {t.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.isCredit && <Badge color="amber">Crédito</Badge>}
                      <span className="font-semibold text-gray-900">{fmtUSD(s.totalUsd)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Sin stock</h3>
            <Link to="/inventario" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              Inventario <ArrowRight size={14} />
            </Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <EmptyState title="Todo en stock" description="No hay productos agotados" />
          ) : (
            <div className="space-y-2">
              {stats.lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2"
                >
                  <AlertTriangle size={16} className="shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-red-600">
                      Sin existencia ({fmtQty(p.stock, p.unit)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}