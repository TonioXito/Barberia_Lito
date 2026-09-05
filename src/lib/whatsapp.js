import { normalizePhone } from "./format";

export function buildWaLink(phone, message) {
  const p = normalizePhone(phone);
  const url = "https://wa.me/" + p + "?text=" + encodeURIComponent(message);
  return { url, phone: p };
}

export function openWhatsApp(phone, message) {
  const { url } = buildWaLink(phone, message);
  window.open(url, "_blank", "noopener");
}

export function saleMessage({ sale, settings, items }) {
  const sep = "-----------------------------------";
  const lines = [];
  lines.push(`*${settings.businessName || "Carnicería"}*`);
  if (settings.phone) lines.push(`Tel: ${settings.phone}`);
  lines.push(sep);
  lines.push(`*TICKET N° ${sale.ticketNumber}*`);
  lines.push(`Fecha: ${new Date(sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date()).toLocaleString("es-VE")}`);
  if (sale.clientName) lines.push(`Cliente: ${sale.clientName}`);
  lines.push(sep);
  for (const it of items || sale.items || []) {
    lines.push(
      `${it.quantity} ${it.unitSymbol || ""} ${it.productName}`,
    );
    lines.push(`      ${fmtPriceLine(it, sale.exchangeRate)}`);
  }
  lines.push(sep);
  lines.push(`Subtotal: ${money(sale.totalUsd, sale.exchangeRate)}`);
  if (sale.discount && sale.discount > 0)
    lines.push(`Descuento: -${money(sale.discount, sale.exchangeRate)}`);
  lines.push(`*TOTAL: ${money(sale.totalUsd, sale.exchangeRate)}*`);
  lines.push(`= ${bs(sale.totalUsd, sale.exchangeRate)} =`);
  lines.push(`Pago: ${sale.paymentLabel || "Contado"}`);
  if (sale.paymentMethod === "CREDITO") {
    lines.push(
      `Saldo pendiente: ${money(sale.balanceUsd || sale.totalUsd, sale.exchangeRate)}`,
    );
  }
  lines.push(sep);
  if (sale.paymentMethod === "PAGO_MOVIL" && settings.banco) {
    lines.push("*Datos de pago móvil:*");
    if (settings.banco) lines.push(`Banco: ${settings.banco}`);
    if (settings.cedula) lines.push(`Cédula: ${settings.cedula}`);
    if (settings.telefono) lines.push(`Teléfono: ${settings.telefono}`);
    if (settings.nombre) lines.push(`Titular: ${settings.nombre}`);
    lines.push(sep);
  }
  lines.push("¡Gracias por su compra!");
  return lines.join("\n");
}

function fmtPriceLine(it, rate) {
  const total = Number(it.subtotalUsd ?? it.totalUsd ?? it.productPrice * it.quantity);
  return `${money(total, rate)}`;
}

function money(amount, rate) {
  const n = Number(amount) || 0;
  return "$" + n.toFixed(2);
}

function bs(amount, rate) {
  const n = (Number(amount) || 0) * (Number(rate) || 1);
  return "Bs " + n.toFixed(2);
}