import { Printer, Send, Download } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { TicketPreview } from "./TicketPreview";
import { useSettings } from "../hooks/useSettings";
import { saleMessage, openWhatsApp } from "../lib/whatsapp";
import { useToast } from "./ui/Toast";

export function TicketModal({ sale, saleItems, onClose }) {
  const { settings } = useSettings();
  const toast = useToast();

  if (!sale) return null;

  function handlePrint() {
    window.print();
  }

  function handleWhatsApp() {
    const target = sale.clientPhone || settings?.phone;
    if (!target) {
      toast.error("No hay número de teléfono para enviar el ticket");
      return;
    }
    const message = saleMessage({ sale, settings, items: saleItems || sale.items });
    openWhatsApp(target, message);
  }

  function handlePdf() {
    window.print();
  }

  return (
    <Modal open={!!sale} onClose={onClose} title="Ticket de venta" size="sm">
      <div className="overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2">
        <TicketPreview sale={sale} settings={settings} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="primary" onClick={handlePrint} className="flex-col gap-1 py-3 text-xs">
          <Printer size={20} />
          Imprimir
        </Button>
        <Button variant="whatsapp" onClick={handleWhatsApp} className="flex-col gap-1 py-3 text-xs">
          <Send size={20} />
          WhatsApp
        </Button>
        <Button variant="secondary" onClick={handlePdf} className="flex-col gap-1 py-3 text-xs">
          <Download size={20} />
          PDF
        </Button>
      </div>

      <div className="no-print">
        <p className="mt-3 text-center text-xs text-gray-500">
          Para imprimir en formato térmico, usa un navegador con impresora de
          tickets. El botón PDF guarda el ticket como archivo PDF.
        </p>
      </div>
    </Modal>
  );
}