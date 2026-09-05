import { fmtDateTime, fmtQty, fmtUSD } from "../lib/format";

export function TicketPreview({ sale, settings }) {
  const items = sale.items || [];
  const rate = Number(sale.exchangeRate ?? settings?.exchangeRate) ?? 0;
  const date = sale.createdAt?.toDate
    ? sale.createdAt.toDate()
    : sale.paymentDate
      ? sale.paymentDate
      : new Date();

  const bs = (usd) => (Number(usd || 0) * rate).toFixed(2);

  return (
    <div id="ticket-print" className="ticket mx-auto">
      <div className="t-c">
        <p className="t-b text-[15px]">{settings?.businessName || "Carnicería"}</p>
        {settings?.phone && <p>Tel: {settings.phone}</p>}
        {settings?.address && <p>{settings.address}</p>}
      </div>

      <hr className="t-sep" />

      <div>
        <p>
          <span className="t-b">TICKET:</span> {sale.ticketNumber}
        </p>
        <p>Fecha: {fmtDateTime(date)}</p>
        {sale.clientName && <p>Cliente: {sale.clientName}</p>}
        {sale.clientPhone && <p>Tel: {sale.clientPhone}</p>}
      </div>

      <hr className="t-sep" />

      {items.map((it, i) => (
        <div key={i}>
          <p>
            {fmtQty(it.quantity, it.unit)} {it.productName}
          </p>
          <p className="t-r">{fmtUSD(it.subtotalUsd ?? it.productPrice * it.quantity)}</p>
        </div>
      ))}

      <hr className="t-sep" />

      <div>
        <p className="t-r">Subtotal: {fmtUSD(sale.subtotalUsd)}</p>
        {Number(sale.discountUsd) > 0 && (
          <p className="t-r">Desc: -{fmtUSD(sale.discountUsd)}</p>
        )}
        <p className="t-r t-b text-[15px]">TOTAL: {fmtUSD(sale.totalUsd)}</p>
        <p className="t-r">= Bs {bs(sale.totalUsd)} =</p>
        <p className="t-r">Pago: {sale.paymentLabel}</p>
        {sale.isCredit && (
          <p className="t-r t-b">
            Saldo: {fmtUSD(sale.balanceUsd ?? sale.totalUsd)}
          </p>
        )}
      </div>

      {sale.paymentMethod === "PAGO_MOVIL" && settings?.banco && (
        <>
          <hr className="t-sep" />
          <div className="t-c">
            <p className="t-b">Datos de pago móvil</p>
            {settings.banco && <p>Banco: {settings.banco}</p>}
            {settings.cedula && <p>Cédula: {settings.cedula}</p>}
            {settings.telefono && <p>Teléfono: {settings.telefono}</p>}
            {settings.nombre && <p>Titular: {settings.nombre}</p>}
          </div>
        </>
      )}

      <hr className="t-sep" />

      <p className="t-c t-b">¡Gracias por su compra!</p>
      <p className="t-c" style={{ fontSize: 10 }}>
        {rate > 0 ? `Tasa Bs: ${rate}` : ""}
      </p>
    </div>
  );
}