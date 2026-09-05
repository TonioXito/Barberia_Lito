import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Plus,
  Package,
  RefreshCw,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { useProducts, useMovements } from "../hooks/useData";
import { useSettings } from "../hooks/useSettings";
import {
  addProduct,
  updateProductDoc,
  toggleProduct,
  deleteProductDoc,
  addMovement,
  restockMovement,
} from "../firebase/services";
import { UNITS, CATEGORIES, CATEGORY_MAP, MOVEMENT_TYPES } from "../lib/constants";
import { fmtUSD, fmtQty, fmtDateTime } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Input, Textarea } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";

export function InventoryPage() {
  const { data: products } = useProducts();
  const { data: movements } = useMovements();
  const { settings } = useSettings();
  const rate = Number(settings?.exchangeRate) || 0;
  const toast = useToast();
  const [tab, setTab] = useState("catalogo");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("TODOS");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [restocking, setRestocking] = useState(null);
  const [movementModal, setMovementModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === "TODOS" || p.category === category) &&
          (!search || p.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [products, search, category],
  );

  const typeColor = {
    CARGA: "green",
    AJUSTE: "blue",
    DEVOLUCION: "purple",
    VENTA: "red",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500">Control de productos y existencias</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus size={18} /> Nuevo producto
        </Button>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        <TabBtn active={tab === "catalogo"} onClick={() => setTab("catalogo")}>
          <Package size={16} /> Catálogo
        </TabBtn>
        <TabBtn active={tab === "movimientos"} onClick={() => setTab("movimientos")}>
          <ClipboardList size={16} /> Movimientos
        </TabBtn>
      </div>

      {tab === "catalogo" && (
        <>
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

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                title="Sin productos"
                description="Agrega tu primer producto"
                action={<Button onClick={() => { setEditing(null); setShowModal(true); }}><Plus size={18} /> Nuevo producto</Button>}
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="hidden grid-cols-[1fr_110px_110px_130px_160px] gap-2 border-b bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 md:grid">
                <span>Producto</span>
                <span>Unidad</span>
                <span>Precio</span>
                <span>Precio Bs</span>
                <span className="text-right">Acciones</span>
              </div>
              <div className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className={`grid grid-cols-2 items-center gap-2 px-4 py-3 md:grid-cols-[1fr_110px_110px_130px_160px] ${
                      !p.active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                      <span className="text-xl">{p.emoji || "🥩"}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{CATEGORY_MAP[p.category] || p.category}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{fmtQty(p.stock, p.unit)}</p>
                      <p className="text-xs text-gray-400">{p.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fmtUSD(p.priceUsd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {rate > 0 ? `Bs ${(Number(p.priceUsd) * rate).toFixed(2)}` : "—"}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center justify-start gap-1.5 md:col-span-1 md:justify-end">
                      <StockBadge stock={p.stock} />
                      <button
                        onClick={() => { setRestocking(p); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        title="Reponer stock"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        onClick={() => { setEditing(p); setShowModal(true); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => toggleProduct(p.id, !p.active)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title={p.active ? "Desactivar" : "Activar"}
                      >
                        {p.active ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        onClick={() => { setMovementModal(p); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                        title="Ajustar existencia"
                      >
                        <ClipboardList size={15} />
                      </button>
                      <button
                        onClick={() => setDeleting(p)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {tab === "movimientos" && (
        <Card className="overflow-hidden">
          {movements.length === 0 ? (
            <EmptyState title="Sin movimientos" description="Los movimientos de inventario aparecerán aquí" />
          ) : (
            <div className="divide-y divide-gray-100">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge color={typeColor[m.type] || "gray"}>
                      {MOVEMENT_TYPES.find((t) => t.value === m.type)?.label || m.type}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{m.productName}</p>
                      <p className="text-xs text-gray-400">
                        {fmtDateTime(m.createdAt)}
                        {m.note ? ` · ${m.note}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {m.type === "VENTA" ? "-" : "+"}{fmtQty(m.quantity, m.unit)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Stock: {fmtQty(m.newStock, m.unit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ProductModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editing}
      />
      <RestockModal product={restocking} onClose={() => setRestocking(null)} />
      <MovementModal product={movementModal} onClose={() => setMovementModal(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar producto"
        message={`¿Seguro que deseas eliminar "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          await deleteProductDoc(deleting.id);
          toast.success("Producto eliminado");
        }}
      />
    </div>
  );
}

function StockBadge({ stock }) {
  if (Number(stock) <= 0) return <Badge color="red">Agotado</Badge>;
  return <Badge color={Number(stock) <= 5 ? "amber" : "green"}>OK</Badge>;
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function ProductModal({ open, onClose, editing }) {
  const isEdit = !!editing;
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    name: "",
    category: "RES",
    unit: "KILO",
    emoji: "🥩",
    priceUsd: "",
    stock: "0",
  }));

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name || "",
        category: editing.category || "RES",
        unit: editing.unit || "KILO",
        emoji: editing.emoji || "🥩",
        priceUsd: editing.priceUsd ?? "",
        stock: editing.stock ?? "0",
      });
    } else {
      setForm({ name: "", category: "RES", unit: "KILO", emoji: "🥩", priceUsd: "", stock: "0" });
    }
  }, [open, editing]);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Ingresa el nombre del producto");
      return;
    }
    if (!form.priceUsd || Number(form.priceUsd) <= 0) {
      toast.error("El precio debe ser mayor a 0");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        emoji: form.emoji || "🥩",
        priceUsd: Number(form.priceUsd),
        stock: Number(form.stock) || 0,
      };
      if (isEdit) {
        await updateProductDoc(editing.id, {
          name: data.name,
          category: data.category,
          unit: data.unit,
          emoji: data.emoji,
          priceUsd: data.priceUsd,
        });
        toast.success("Producto actualizado");
      } else {
        await addProduct(data);
        toast.success("Producto creado");
      }
      onClose();
    } catch (e) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar producto" : "Nuevo producto"}
    >
      <form onSubmit={submit} className="space-y-3">
        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ej: Lomo de res"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoría"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={CATEGORIES}
          />
          <Select
            label="Unidad de venta"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            options={UNITS}
          />
        </div>
        <Input
          label="Emoji"
          value={form.emoji}
          onChange={(e) => setForm({ ...form, emoji: e.target.value })}
          hint="Icono que se muestra en la pantalla de venta"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Precio ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.priceUsd}
            onChange={(e) => setForm({ ...form, priceUsd: e.target.value })}
            placeholder="0.00"
          />
          <Input
            label={isEdit ? "Stock (no editar para venta)" : "Stock inicial"}
            type="number"
            min="0"
            step="any"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : isEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RestockModal({ product, onClose }) {
  const toast = useToast();
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const n = Number(qty);
    if (!product || !n || n <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }
    setSaving(true);
    try {
      await restockMovement({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: n,
        note,
      });
      toast.success(`Stock de ${product.name} repuesto en ${fmtQty(n, product.unit)}`);
      setQty("");
      setNote("");
      onClose();
    } catch (e) {
      toast.error(e.message || "Error al reponer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!product} onClose={onClose} title="Reponer stock">
      {product && (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-gray-500">
            <b>{product.name}</b> · existencia actual: <b>{fmtQty(product.stock, product.unit)}</b>
          </p>
          <Input
            label={`Cantidad a agregar (${(UNITS.find((u) => u.value === product.unit)?.label) || product.unit})`}
            type="number"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Llegó proveedor"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="success" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} Reponer
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function MovementModal({ product, onClose }) {
  const toast = useToast();
  const [type, setType] = useState("AJUSTE");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const n = Number(qty);
    if (!product || !n || n <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }
    setSaving(true);
    try {
      await addMovement({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        type,
        quantity: n,
        note,
      });
      toast.success("Movimiento registrado");
      setQty("");
      setNote("");
      onClose();
    } catch (e) {
      toast.error(e.message || "Error al registrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!product} onClose={onClose} title="Movimiento de inventario">
      {product && (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-gray-500">
            <b>{product.name}</b> · existencia actual: <b>{fmtQty(product.stock, product.unit)}</b>
          </p>
          <Select
            label="Tipo de movimiento"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={MOVEMENT_TYPES}
          />
          <Input
            label={`Cantidad (${(UNITS.find((u) => u.value === product.unit)?.label) || product.unit})`}
            type="number"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : "Registrar"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}