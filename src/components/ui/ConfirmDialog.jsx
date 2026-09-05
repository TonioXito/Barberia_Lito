import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "¿Confirmar?",
  message,
  confirmLabel = "Confirmar",
  danger = false,
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      onClose();
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? <Spinner size={16} className="text-white" /> : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}