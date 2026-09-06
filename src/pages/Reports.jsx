import { useMemo, useState } from "react";
import { Download, Calendar, TrendingUp, Receipt, Package, Landmark, ClipboardCheck, Loader2 } from "lucide-react";
import { useSales } from "../hooks/useData";
import { useSettings } from "../hooks/useSettings";
import { setSaleReconciled } from "../firebase/services";
import { PAYMENT_METHODS, RECONCILIATION_FILTERS } from "../lib/constants";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  fmtUSD,
  fmtBs,
  fmtDate,
  fmtTime,
  fmtDateTime,
} from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { TabsBar } from "../components/TabsBar";

const PERIODS = [
  { value: "TODOS", label: "Todo" },
  { value: "HOY", label: "Hoy" },
  { value: "SEMANA", label: "Semana" },
  { value: "MES", label: "Mes" },
  { value: "RANGO", label: "Personalizado" },
];

export function ReportsPage() {
  const { data: sales } = useSales();
  const { settings } = useSettings();
  const toast = useToast();
  const rate = Number(settings?.exchangeRate) || 0;

  const [period, setPeriod] = useState("HOY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payment, setPayment] = useState("TODOS");
  const [recon, setRecon] = useState("TODOS");

  const filtered = useMemo(() => {
    let min = null;
    let max = null;
    const now = new Date();
    if (period === "HOY") {
      min = startOfDay(now);
    } else if (period === "SEMANA") {
      min = startOfWeek(now);
    } else if (period === "MES") {
      min = startOfMonth(now);
    } else if (period === "RANGO") {
      min = from ? new Date(from + "T00:00:00") : null;
      max = to ? new Date(to + "T23:59:59") : null;
    }

    return sales.filter((s) => {
      const t = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
      if (min && t < min) return false;
      if (max && t > max) return false;
      if (payment !== "TODOS" && s.paymentMethod !== payment) return false;
      if (recon === "SIN_CONCILIAR" && s.reconciled) return false;
      if (recon === "CONCILIADO" && !s.reconciled) return false;
      return true;
    });
  }, [sales, period, from, to, payment, recon]);

  const stats = useMemo(() => {
    const totalUsd = filtered.reduce((a, s) => a + Number(s.totalUsd || 0), 0);
    const totalBs = filtered.reduce((a, s) => a + Number(s.totalBs || 0), 0);
    const items = filtered.reduce((a, s) => a + Number(s.itemCount || 0), 0);
    const avg = filtered.length ? totalUsd / filtered.length : 0;
    const credit = filtered.reduce(
      (a, s) => a + (s.isCredit ? Number(s.balanceUsd || 0) : 0),
      0,
    );
    const byMethod = {};
    for (const s of filtered) {
      byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + Number(s.totalUsd || 0);
    }
    const transfers = filtered.filter((s) => s.paymentMethod === "TRANSFERENCIA");
    const pendingTransfers = transfers.filter((s) => !s.reconciled);
    const reconcileTotalUsd = transfers.reduce((a, s) => a + Number(s.totalUsd || 0), 0);
    const pendingReconcileUsd = pendingTransfers.reduce((a, s) => a + Number(s.totalUsd || 0), 0);
    return {
      totalUsd,
      totalBs,
      items,
      avg,
      credit,
      byMethod,
      count: filtered.length,
      transfers: transfers.length,
      pendingTransfers: pendingTransfers.length,
      reconcileTotalUsd,
      pendingReconcileUsd,
    };
  }, [filtered]);

  const [reconciling, setReconciling] = useState(null);

  async function markReconciled(id) {
    setReconciling(id);
    try {
      await setSaleReconciled(id, true);
      toast.success("Transferencia marcada como conciliada");
    } catch (e) {
      toast.error(e.message || "No se pudo conciliar");
    } finally {
      setReconciling(null);
    }
  }

  const daily = useMemo(() => {
    if (period === "TODOS") return [];
    const map = {};
    for (const s of filtered) {
      const t = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
      const key = t.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + Number(s.totalUsd || 0);
    }
    const keys = Object.keys(map).sort();
    const max = Math.max(1, ...keys.map((k) => map[k]));
    return keys.map((k) => ({ date: k, total: map[k], pct: (map[k] / max) * 100 }));
  }, [filtered, period]);

  function exportCsv() {
    if (filtered.length === 0) {
      toast.error("No hay ventas para exportar");
      return;
    }
    const rows = [
      ["Ticket", "Fecha", "Cliente", "Metodo", "Referencia", "Conciliado", "Subtotal USD", "Descuento USD", "Total USD", "Total Bs", "Saldo USD"],
      ...filtered.map((s) => [
        s.ticketNumber,
        fmtDateTime(s.createdAt),
        s.clientName || "",
        s.paymentLabel || "",
        s.transferRef || "",
        s.reconciled ? "SI" : (s.paymentMethod === "TRANSFERENCIA" ? "NO" : ""),
        s.subtotalUsd ?? "",
        s.discountUsd ?? "",
        s.totalUsd,
        s.totalBs ?? "",
        s.balanceUsd ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-ventas-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte CSV descargado");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500">Ventas, filtros y exportación</p>
        </div>
        <Button variant="secondary" onClick={exportCsv}>
          <Download size={16} /> Exportar CSV
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <TabsBar tabs={PERIODS} value={period} onChange={setPeriod} className="max-w-xl" />

          {period === "RANGO" && (
            <div className="flex items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Desde</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Hasta</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                />
              </label>
            </div>
          )}

          <label className="block lg:w-48">
            <span className="mb-1 block text-xs font-medium text-gray-500">Método de pago</span>
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm"
            >
              <option value="TODOS">Todos</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>

          <label className="block lg:w-48">
            <span className="mb-1 block text-xs font-medium text-gray-500">Conciliación</span>
            <select
              value={recon}
              onChange={(e) => setRecon(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm"
            >
              {RECONCILIATION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Ventas" value={String(stats.count)} icon={Receipt} color="bg-blue-500" />
        <Stat label="Total USD" value={fmtUSD(stats.totalUsd)} icon={TrendingUp} color="bg-emerald-500" />
        <Stat label="Total Bs" value={fmtBs(stats.totalBs)} icon={Calendar} color="bg-amber-500" />
        <Stat label="Ticket promedio" value={fmtUSD(stats.avg)} icon={Package} color="bg-purple-500" />
        <Stat label="Por cobrar (crédito)" value={fmtUSD(stats.credit)} icon={Calendar} color="bg-red-500" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Landmark size={18} className="text-brand-600" />
              Conciliación de transferencias
            </h3>
            <p className="text-xs text-gray-500">
              Verifica en tu banco la transferencia y márcala cuando el pago haya caído.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Pendientes</p>
            <p className="flex items-center gap-1 font-bold text-amber-600">
              <ClipboardCheck size={18} />
              {fmtUSD(stats.pendingReconcileUsd)} ({stats.pendingTransfers})
            </p>
          </div>
        </div>
        {stats.pendingTransfers === 0 ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Sin transferencias pendientes. ¡Todo conciliado!
          </p>
        ) : (
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
            {filtered
              .filter((s) => s.paymentMethod === "TRANSFERENCIA" && !s.reconciled)
              .slice()
              .sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return tb - ta;
              })
              .map((s) => (
                <div
                  key={`rec-${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      #{s.ticketNumber} · {s.clientName || "Cliente general"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Ref: <b>{s.transferRef || "sin referencia"}</b> · {fmtDate(s.createdAt)} {fmtTime(s.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{fmtUSD(s.totalUsd)}</span>
                    <button
                      onClick={() => markReconciled(s.id)}
                      disabled={reconciling === s.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {reconciling === s.id ? <Loader2 className="animate-spin" size={14} /> : "Conciliado"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {daily.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-4 font-semibold text-gray-900">Ventas por día</h3>
          <div className="flex h-40 items-end gap-1.5">
            {daily.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-gray-600">{fmtUSD(d.total)}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400"
                  style={{ height: `${Math.max(d.pct, 3)}%` }}
                />
                <span className="text-[10px] text-gray-400">
                  {new Date(d.date).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-gray-900">Ventas registradas</h3>
          {filtered.length === 0 ? (
            <EmptyState title="Sin ventas en este período" description="Ajusta los filtros o realiza ventas" />
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {filtered
                .slice()
                .sort((a, b) => {
                  const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                  const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                  return tb - ta;
                })
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        #{s.ticketNumber} · {s.clientName || "Cliente general"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {fmtDate(s.createdAt)} {fmtTime(s.createdAt)} · {s.paymentLabel}
                        {s.paymentMethod === "TRANSFERENCIA" &&
                          (s.transferRef ? ` · Ref: ${s.transferRef}` : " · sin referencia")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {s.isCredit && <Badge color="red">Crédito</Badge>}
                      {s.paymentMethod === "TRANSFERENCIA" && (
                        s.reconciled ? (
                          <Badge color="green">Conciliado</Badge>
                        ) : (
                          <Badge color="amber">Pendiente</Badge>
                        )
                      )}
                      <span className="font-semibold text-gray-900">{fmtUSD(s.totalUsd)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-semibold text-gray-900">Por método de pago</h3>
          {Object.keys(stats.byMethod).length === 0 ? (
            <EmptyState title="Sin datos" />
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.byMethod)
                .sort((a, b) => b[1] - a[1])
                .map(([method, total]) => {
                  const pct = stats.totalUsd ? (total / stats.totalUsd) * 100 : 0;
                  const label = PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
                  return (
                    <div key={method}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-gray-700">{label}</span>
                        <span className="font-medium text-gray-900">{fmtUSD(total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-brand-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="mt-2 truncate text-lg font-bold text-gray-900">{value}</p>
    </Card>
  );
}