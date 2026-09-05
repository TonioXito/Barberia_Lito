import { useMemo, useState, useEffect } from "react";
import { Search, Plus, Pencil, Trash2, Loader2, Phone } from "lucide-react";
import { useClients, useCreditSales } from "../hooks/useData";
import { addClient, updateClientDoc, deleteClientDoc } from "../firebase/services";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";

export function ClientsPage() {
  const { data: clients } = useClients();
  const { data: creditSales } = useCreditSales();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | {mode:'new'} | {mode:'edit', client}
  const [deleting, setDeleting] = useState(null);

  const debts = useMemo(() => {
    const map = {};
    for (const s of creditSales) {
      const bal = Number(s.balanceUsd || 0);
      if (bal > 0) {
        map[s.clientId] = (map[s.clientId] || 0) + bal;
      }
    }
    return map;
  }, [creditSales]);

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase()),
  );

  function initials(name = "") {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">Cartera de clientes de la carnicería</p>
        </div>
        <Button onClick={() => setModal({ mode: "new" })}>
          <Plus size={18} /> Nuevo cliente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-3 text-gray-400" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin clientes"
            description="Agrega a tus clientes para facturar y enviarles el ticket por WhatsApp"
            action={<Button onClick={() => setModal({ mode: "new" })}><Plus size={18} /> Nuevo cliente</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const debt = debts[c.id] || 0;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{c.name}</p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Phone size={12} />
                      {c.phone || "Sin teléfono"}
                    </div>
                    {debt > 0 ? (
                      <span className="mt-2 inline-block">
                        <Badge color="red">Adeuda ${debt.toFixed(2)}</Badge>
                      </span>
                    ) : (
                      <span className="mt-2 inline-block">
                        <Badge color="green">Sin deudas</Badge>
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5 border-t pt-3">
                  <button
                    onClick={() => setModal({ mode: "edit", client: c })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleting(c)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ClientFormModal
        modal={modal}
        onClose={() => setModal(null)}
        onSaved={(msg) => {
          toast.success(msg);
          setModal(null);
        }}
        onError={(msg) => toast.error(msg)}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar cliente"
        message={`¿Seguro que deseas eliminar a "${deleting?.name}"?`}
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          await deleteClientDoc(deleting.id);
          toast.success("Cliente eliminado");
        }}
      />
    </div>
  );
}

function ClientFormModal({ modal, onClose, onSaved, onError }) {
  const isEdit = modal?.mode === "edit";
  const client = modal?.client || null;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!modal) return;
    setName(client?.name || "");
    setPhone(client?.phone || "");
    setNote(client?.note || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      onError("Ingresa el nombre del cliente");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateClientDoc(client.id, { name: name.trim(), phone: phone.trim(), note: note.trim() });
        onSaved("Cliente actualizado");
      } else {
        await addClient({ name, phone, note });
        onSaved("Cliente agregado");
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!modal}
      onClose={onClose}
      title={isEdit ? "Editar cliente" : "Nuevo cliente"}
    >
      <form onSubmit={submit} className="space-y-3">
        <Input
          label="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: María Pérez"
          autoFocus
        />
        <Input
          label="Teléfono (WhatsApp)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0414-0000000"
          hint="Se usará para enviar el ticket por WhatsApp"
        />
        <Input
          label="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observaciones"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : isEdit ? "Guardar cambios" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}