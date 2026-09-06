import { useMemo, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Check,
  Loader2,
} from "lucide-react";
import { useProducts, useClients } from "../hooks/useData";
import { useSettings } from "../hooks/useSettings";
import { addSale, addClient } from "../firebase/services";
import { CATEGORIES, CATEGORY_MAP, PAYMENT_METHODS, UNIT_MAP, isPaymentMethodActive, methodUsesReference } from "../lib/constants";
import { fmtUSD, fmtBs, fmtQty, round } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { TicketModal } from "../components/TicketModal";

export function PosPage() {
  const { data: products } = useProducts();
  const { data: clients } = useClients();
  const { settings } = useSettings();
  const toast = useToast();
  const rate = Number(settings?.exchangeRate) || 0;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("TODOS");
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState(null);
  const [clientModal, setClientModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [transferRef, setTransferRef] = useState("");
  const [discount, setDiscount] = useState("");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [lastSale, setLastSale] = useState(null);

  const activeMethods = useMemo(
    () => PAYMENT_METHODS.filter((m) => isPaymentMethodActive(settings, m.value)),
    [settings],
  );
  const needsRef = methodUsesReference(settings, paymentMethod);

  useEffect(() => {
    if (!isPaymentMethodActive(settings, paymentMethod)) {
      setPaymentMethod("EFECTIVO");
      setTransferRef("");
    }
  }, [settings?.paymentMethods, paymentMethod]);

  const activeProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.active &&
          (category === "TODOS" || p.category === category) &&
          (!search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.category || "").toLowerCase().includes(search.toLowerCase())),
      ),
    [products, search, category],
  );

  const totals = useMemo(() => {
    const subtotal = cart.reduce((a, it) => a + Number(it.quantity) * Number(it.priceUsd), 0);
    const disc = Math.min(Number(discount) || 0, subtotal);
    const total = Math.max(0, subtotal - disc);
    return { subtotal: round(subtotal), discount: round(disc), total: round(total) };
  }, [cart, discount]);

  function addToCart(product) {
    setCart((prev) => {
      const exist = prev.find((i) => i.productId === product.id);
      if (exist) {
        if (exist.quantity + 1 > Number(product.stock)) {
          toast.error(`Stock insuficiente de ${product.name}`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      if (Number(product.stock) <= 0) {
        toast.error(`${product.name} sin stock`);
        return prev;
      }
      return [...prev, { productId: product.id, name: product.name, unit: product.unit, priceUsd: Number(product.priceUsd), quantity: 1 }];
    });
  }

  function setQty(productId, qty) {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const product = products.find((p) => p.id === productId);
        const max = product ? Number(product.stock) : Infinity;
        const v = Math.max(1, Math.min(Number(qty) || 1, max));
        return { ...i, quantity: v };
      }),
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleSave() {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    if (paymentMethod === "CREDITO" && !client) {
      toast.error("Para venta a crédito debes seleccionar un cliente");
      setClientModal(true);
      return;
    }
    if (needsRef && !String(transferRef || "").trim()) {
      toast.error("Agrega el N° de referencia");
      return;
    }
    setSaving(true);
    try {
      const sale = await addSale({
        client,
        items: cart,
        paymentMethod,
        exchangeRate: rate,
        discountUsd: totals.discount,
        transferRef,
        usesReference: needsRef,
      });
      setLastSale(sale);
      setTicket({
        ...sale,
        items: sale.items,
        totalUsd: sale.totalUsd,
        subtotalUsd: sale.subtotalUsd,
        discountUsd: sale.discountUsd,
        balanceUsd: sale.balanceUsd,
      });
      setCart([]);
      setDiscount("");
      setTransferRef("");
      setClient(null);
      setPaymentMethod("EFECTIVO");
    } catch (e) {
      toast.error(e.message || "No se pudo registrar la venta");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddClient(data) {
    try {
      if (client) {
        setClient(client);
      }
      const id = await addClient(data);
      const newClient = { id, name: data.name, phone: data.phone, note: data.note };
      setClient(newClient);
      setClientModal(false);
      toast.success("Cliente agregado");
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vender</h1>
        <p className="text-sm text-gray-500">
          Tasa actual: <b>{rate > 0 ? `Bs ${rate} / $` : "Sin configurar"}</b>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Columna productos */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto…"
                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500"
            >
              <option value="TODOS">Todas las categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {activeProducts.length === 0 ? (
            <Card>
              <EmptyState title="Sin productos" description="Agrega productos desde Inventario" />
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {activeProducts.map((p) => {
                const unit = UNIT_MAP[p.unit];
                const out = Number(p.stock) <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={`group flex flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition-colors ${
                      out
                        ? "cursor-not-allowed border-gray-200 opacity-50"
                        : "border-gray-200 hover:border-brand-400 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-2xl">{p.emoji || "🥩"}</span>
                      <Badge color={out ? "red" : "green"}>
                        {out ? "Agotado" : `${fmtQty(p.stock, p.unit)}`}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {unit?.label || p.unit}
                    </p>
                    <p className="mt-1 font-bold text-brand-600">{fmtUSD(p.priceUsd)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-gray-500" />
                <h2 className="font-semibold text-gray-900">Carrito</h2>
                <Badge color="brand">{cart.length}</Badge>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs font-medium text-red-500 hover:text-red-600"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Cliente */}
            <div className="border-b px-4 py-3">
              {client ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">{client.name}</p>
                      {client.phone && <p className="text-xs text-emerald-700">{client.phone}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => setClient(null)}
                    className="text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      const c = clients.find((x) => x.id === e.target.value);
                      if (c) setClient(c);
                    }}
                    className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                  >
                    <option value="">Seleccionar cliente…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Button variant="secondary" size="sm" onClick={() => setClientModal(true)}>
                    <Plus size={15} /> Nuevo
                  </Button>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="max-h-80 flex-1 overflow-y-auto px-4 py-2">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Agrega productos tocando la tarjeta
                </p>
              ) : (
                cart.map((it) => {
                  const prod = products.find((p) => p.id === it.productId);
                  return (
                    <div key={it.productId} className="flex items-start gap-2 border-b border-gray-100 py-2.5 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{it.name}</p>
                        <p className="text-xs text-gray-400">{fmtUSD(it.priceUsd)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQty(it.productId, it.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => setQty(it.productId, e.target.value)}
                          className="h-7 w-14 rounded-md border border-gray-300 text-center text-sm"
                        />
                        <button
                          onClick={() => setQty(it.productId, it.quantity + 1)}
                          disabled={prod && it.quantity >= Number(prod.stock)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="w-16 text-right text-sm font-semibold text-gray-900">
                        {fmtUSD(it.quantity * it.priceUsd)}
                      </span>
                      <button
                        onClick={() => removeItem(it.productId)}
                        className="mt-1 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Método de pago y descuento */}
            <div className="space-y-2 border-t px-4 py-3">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Método de pago</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.filter(
                    (m) => m.value !== "CREDITO" && isPaymentMethodActive(settings, m.value),
                  ).map((m) => (
                    <PaymentButton
                      key={m.value}
                      label={m.label}
                      active={paymentMethod === m.value}
                      onClick={() => setPaymentMethod(m.value)}
                    />
                  ))}
                </div>
                {isPaymentMethodActive(settings, "CREDITO") && (
                  <div className="mt-1.5">
                    <PaymentButton
                      label="Crédito"
                      active={paymentMethod === "CREDITO"}
                      onClick={() => setPaymentMethod("CREDITO")}
                      extra={client ? `→ ${client.name.split(" ")[0]}` : ""}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">Descuento ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="h-8 w-24 rounded-lg border border-gray-300 px-2 text-right text-sm outline-none focus:border-brand-500"
                />
              </div>

              {needsRef && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    N° de referencia
                  </label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="Ej: 8492 7183 5562 9104"
                    className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand-500"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Lo usarás en Reportes para conciliar con el banco.
                  </p>
                </div>
              )}
            </div>

            {/* Totales */}
            <div className="space-y-1 border-t px-4 py-3">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{fmtUSD(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Descuento</span>
                  <span>-{fmtUSD(totals.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-brand-600">{fmtUSD(totals.total)}</p>
                  <p className="text-xs text-gray-500">{fmtBs(totals.total * rate)}</p>
                </div>
              </div>
            </div>

            <div className="border-t p-3">
              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0 || saving}
                onClick={handleSave}
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                {paymentMethod === "CREDITO" ? "Registrar venta a crédito" : "Cobrar venta"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <TicketModal sale={ticket} saleItems={lastSale?.items} onClose={() => setTicket(null)} />

      <ClientModal
        open={clientModal}
        onClose={() => setClientModal(false)}
        onSave={handleAddClient}
      />
    </div>
  );
}

function PaymentButton({ label, active, onClick, extra }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
      {extra && <span className="block text-[10px] opacity-80">{extra}</span>}
    </button>
  );
}

function ClientModal({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ingresa el nombre del cliente");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name, phone, note });
      setName("");
      setPhone("");
      setNote("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente">
      <form onSubmit={submit} className="space-y-3">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" autoFocus />
        <Input label="Teléfono (WhatsApp)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0414-0000000" />
        <Input label="Nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}