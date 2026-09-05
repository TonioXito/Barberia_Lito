import { useMemo, useState } from "react";
import { Search, Loader2, HandCoins, CheckCircle2, Users } from "lucide-react";
import { useCreditSales, useCreditPayments } from "../hooks/useData";
import { useSettings } from "../hooks/useSettings";
import { registerCreditPayment } from "../firebase/services";
import { fmtUSD, fmtDateTime, fmtDate } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { TabsBar } from "../components/TabsBar";

export function CreditsPage() {
  const { data: creditSales } = useCreditSales();
  const { data: payments } = useCreditPayments();
  const { settings } = useSettings();
  const toast = useToast();
  const rate = Number(settings?.exchangeRate) || 0;
  const [tab, setTab] = useState("pendientes");
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState(null); // sale object
  const [filterAll, setFilterAll] = useState(false);

  const { pendientes, totalDebt, clientTotal } = useMemo(() => {
    const pend = creditSales.filter((s) => Number(s.balanceUsd || 0) > 0);
    const total = pend.reduce((a, s) => a + Number(s.balanceUsd || 0), 0);
    const perClient = {};
    for (const s of pend) {
      const name = s.clientName || "Sin cliente";
      perClient[name] = (perClient[name] || 0) + Number(s.balanceUsd || 0);
    }
    return { pendientes: pend, totalDebt: total, clientTotal: perClient };
  }, [creditSales]);

  const filteredPend = pendientes.filter((s) =>
    !search || (s.clientName || "").toLowerCase().includes(search.toLowerCase()),
  );

  function handleRegisterPago(saleId, amountUsd, method, note) {
    setPaying(null);
    toast.success("Abono registrado");
    return registerCreditPayment({ saleId, amountUsd, exchangeRate: rate, method, note });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cuentas por cobrar</h1>
        <p className="text-sm text-gray-500">Control de ventas a crédito</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total por cobrar" value={fmtUSD(totalDebt)} sub={rate ? `≈ Bs ${(totalDebt * rate).toFixed(2)}` : ""} />
        <SummaryCard label="Ventas a crédito" value={pendientes.length} sub="con saldo pendiente" />
        <SummaryCard label="Clientes deudores" value={Object.keys(clientTotal).length} sub="cuentas activas" />
        <SummaryCard label="Abonos registrados" value={payments.filter((p) => p.type === "ABONO").length} sub="historial" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsBar
          tabs={[
            { value: "pendientes", label: "Pendientes" },
            { value: "todos", label: "Todas las ventas a crédito" },
            { value: "abonos", label: "Abonos" },
          ]}
          value={tab}
          onChange={setTab}
          className="max-w-xl flex-1"
        />
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-3 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {tab === "abonos" ? (
        <Card className="overflow-hidden">
          {payments.filter((p) => p.type === "ABONO").length === 0 ? (
            <EmptyState title="Sin abonos" description="Los pagos parciales a crédito aparecerán aquí" />
          ) : (
            <div className="divide-y divide-gray-100">
              {payments.filter((p) => p.type === "ABONO").map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{p.clientName || "Sin cliente"}</p>
                      <p className="text-xs text-gray-400">
                        Ticket #{p.saleTicket} · {p.date ? fmtDateTime(p.date) : fmtDateTime(p.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">+{fmtUSD(p.amountUsd)}</p>
                    <p className="text-xs text-gray-400">{p.method || "Efectivo"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {filteredPend.length === 0 ? (
            <EmptyState
              title="No hay cuentas pendientes"
              description="Cuando hagas una venta a crédito aparecerá aquí"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPend.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700">#{s.ticketNumber}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users size={15} className="text-gray-400" />
                          {s.clientName || "Sin cliente"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(s.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtUSD(s.totalUsd)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-red-600">{fmtUSD(s.balanceUsd)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="success" onClick={() => setPaying(s)}>
                          <HandCoins size={15} /> Abono
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <PaymentModal
        sale={paying}
        rate={rate}
        onClose={() => setPaying(null)}
        onRegister={handleRegisterPago}
      />
    </div>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </Card>
  );
}

function PaymentModal({ sale, rate, onClose, onRegister }) {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("EFECTIVO");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const n = Number(amount);
    if (!sale || !n || n <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (n > Number(sale.balanceUsd)) {
      toast.error(`El monto supera el saldo (${fmtUSD(sale.balanceUsd)})`);
      return;
    }
    setSaving(true);
    try {
      await onRegister(sale.id, n, method, note);
      setAmount("");
      setNote("");
    } catch (err) {
      toast.error(err.message || "Error al registrar abono");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!sale} onClose={onClose} title="Registrar abono">
      {sale && (
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">
              Cliente: <b>{sale.clientName || "Sin cliente"}</b>
            </p>
            <p className="text-sm text-gray-600">
              Ticket: <b>#{sale.ticketNumber}</b>
            </p>
            <p className="mt-1 text-base font-bold text-red-600">
              Saldo: {fmtUSD(sale.balanceUsd)}
            </p>
          </div>
          <Input
            label="Monto del abono ($)"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">Método de cobro</p>
            <div className="grid grid-cols-2 gap-2">
              {["EFECTIVO", "PUNTO", "PAGO_MOVIL", "TRANSFERENCIA"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    method === m
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {m === "EFECTIVO" ? "Efectivo" : m === "PUNTO" ? "Punto" : m === "PAGO_MOVIL" ? "Pago móvil" : "Transferencia"}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: abonó mitad"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="success" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : "Registrar abono"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}