import { useState, useEffect } from "react";
import { Lock, Loader2, Save, ShieldCheck, CreditCard } from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import { updateSettings, sha256, getSubStatus } from "../firebase/services";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Card, CardHeader } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { fmtDate } from "../lib/format";
import { PAYMENT_METHODS, DEFAULT_PAYMENT_CONFIG } from "../lib/constants";

export function SettingsPage() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const sub = settings?.subscription || {};

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [banco, setBanco] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const [pmConfig, setPmConfig] = useState(() =>
    PAYMENT_METHODS.reduce((acc, m) => {
      acc[m.value] = { ...(DEFAULT_PAYMENT_CONFIG[m.value] || { active: true, reference: false }) };
      return acc;
    }, {}),
  );
  const [savingPm, setSavingPm] = useState(false);

  useEffect(() => {
    const stored = settings?.paymentMethods;
    if (!stored) return;
    const merged = {};
    for (const m of PAYMENT_METHODS) {
      const c = stored[m.value];
      merged[m.value] = {
        active: c ? c.active !== false : DEFAULT_PAYMENT_CONFIG[m.value]?.active !== false,
        reference: c ? !!c.reference : !!DEFAULT_PAYMENT_CONFIG[m.value]?.reference,
      };
    }
    setPmConfig(merged);
  }, [settings?.paymentMethods]);

  function togglePmActive(m) {
    setPmConfig((prev) => ({ ...prev, [m.value]: { ...prev[m.value], active: !prev[m.value].active } }));
  }

  function togglePmReference(m) {
    setPmConfig((prev) => ({ ...prev, [m.value]: { ...prev[m.value], reference: !prev[m.value].reference } }));
  }

  async function savePaymentMethods() {
    setSavingPm(true);
    try {
      await updateSettings({ paymentMethods: pmConfig });
      toast.success("Métodos de pago guardados");
    } catch (e) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSavingPm(false);
    }
  }

  const subStatus = sub ? getSubStatus(sub) : { ok: false, daysLeft: 0, expired: false };

  useEffect(() => {
    if (!settings) return;
    setBusinessName(settings.businessName || "");
    setPhone(settings.phone || "");
    setAddress(settings.address || "");
    setExchangeRate(settings.exchangeRate?.toString() || "");
    setBanco(settings.banco || "");
    setCedula(settings.cedula || "");
    setTelefono(settings.telefono || "");
    setNombre(settings.nombre || "");
  }, [settings]);

  async function saveBusiness() {
    setSaving(true);
    try {
      await updateSettings({
        businessName: businessName.trim() || "Carnicería",
        phone: phone.trim(),
        address: address.trim(),
        exchangeRate: Number(exchangeRate) || 0,
      });
      toast.success("Configuración guardada");
    } catch (e) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function savePayment() {
    setSaving(true);
    try {
      await updateSettings({ banco: banco.trim(), cedula: cedula.trim(), telefono: telefono.trim(), nombre: nombre.trim() });
      toast.success("Datos de pago móvil guardados");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (newPass.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setSavingPass(true);
    try {
      const hash = await sha256(newPass);
      await updateSettings({ passwordHash: hash });
      setNewPass("");
      setConfirmPass("");
      toast.success("Contraseña actualizada");
    } catch (err) {
      toast.error(err.message || "Error al cambiar contraseña");
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">Datos del negocio, tasa y accesos</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Datos del negocio" subtitle="Nombre y datos de la carnicería" />
          <div className="space-y-3 px-5 pb-5">
            <Input
              label="Nombre de la carnicería"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej: Carnicería El Sol"
            />
            <Input
              label="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0414-0000000"
            />
            <Input
              label="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección del local"
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Tasa de cambio (Bs por $)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="Ej: 36.50"
                />
              </div>
              <Button onClick={saveBusiness} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Pago móvil" subtitle="Se envía en el ticket de ventas con pago móvil" />
          <div className="space-y-3 px-5 pb-5">
            <Input
              label="Banco"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              placeholder="Ej: Banco Venezuela"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cédula"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="V-12345678"
              />
              <Input
                label="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="0414-0000000"
              />
            </div>
            <Input
              label="Titular"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del titular de la cuenta"
            />
            <div className="flex justify-end">
              <Button onClick={savePayment} disabled={saving} variant="secondary">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Métodos de pago"
            subtitle="Elige cuáles se usan al vender y cuáles piden N° de referencia"
          />
          <div className="space-y-2 px-5 pb-5">
            {PAYMENT_METHODS.map((m) => (
              <div
                key={m.value}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                    <CreditCard size={15} className="text-gray-400" />
                    {m.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {pmConfig[m.value]?.active ? "Activo" : "Desactivado"}
                    {pmConfig[m.value]?.reference ? " · pide N° de referencia" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.value !== "EFECTIVO" && m.value !== "CREDITO" && (
                    <MethodToggle
                      on={!!pmConfig[m.value]?.reference}
                      onClick={() => togglePmReference(m)}
                      onLabel="Referencia"
                      offLabel="Referencia"
                      activeClass="bg-emerald-100 text-emerald-700"
                    />
                  )}
                  <MethodToggle
                    on={pmConfig[m.value]?.active !== false}
                    onClick={() => togglePmActive(m)}
                    onLabel="Activo"
                    offLabel="Inactivo"
                    activeClass="bg-emerald-100 text-emerald-700"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <Button onClick={savePaymentMethods} disabled={savingPm} variant="secondary">
                {savingPm ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar métodos
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contraseña de acceso" subtitle="Única contraseña para entrar a la aplicación" />
          <form onSubmit={changePassword} className="space-y-3 px-5 pb-5">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              <ShieldCheck size={16} className="shrink-0 text-emerald-500" />
              {settings?.passwordHash ? (
                <span>Hay una contraseña configurada. Cámbiala aquí.</span>
              ) : (
                <span>
                  Sin contraseña configurada: la aplicación entrará escribiendo
                  cualquier cosa hasta que pongas una.
                </span>
              )}
            </div>
            <Input
              label="Nueva contraseña"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Mínimo 4 caracteres"
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Repite la contraseña"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={savingPass} variant="secondary">
                {savingPass ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />} Guardar contraseña
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Suscripción"
            subtitle="Estado de la suscripción de la aplicación"
            action={
              <Badge color={subStatus.ok ? "green" : "red"}>
                {subStatus.ok ? "Activa" : subStatus.expired ? "Expirada" : "Inactiva"}
              </Badge>
            }
          />
          <div className="space-y-3 px-5 pb-5">
            {subStatus.ok && sub.expiresAt && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Activa · expira el <b>{fmtDate(sub.expiresAt)}</b>
                {subStatus.daysLeft < Infinity &&
                  ` · ${subStatus.daysLeft} día(s) restante(s)`}
              </p>
            )}
            {subStatus.ok && !sub.expiresAt && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Activa · sin fecha de vencimiento
              </p>
            )}
            {!subStatus.ok && !subStatus.expired && (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
                La suscripción está desactivada. El sistema pedirá el código de
                activación al entrar.
              </p>
            )}
            {subStatus.expired && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                La suscripción expiró el <b>{fmtDate(sub.expiresAt)}</b>.
              </p>
            )}
            {sub.code && (
              <p className="text-xs text-gray-400">
                Código de activación vigente:{" "}
                <code className="rounded bg-gray-100 px-1">{sub.code}</code>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MethodToggle({ on, onClick, onLabel, offLabel, activeClass }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        on ? activeClass : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}