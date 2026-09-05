import { UNIT_MAP } from "./constants";

export function round(n, decimals = 2) {
  const f = Math.pow(10, decimals);
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function fmtUSD(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtBs(amount) {
  const n = Number(amount) || 0;
  return (
    "Bs " +
    n.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function fmtQty(qty, unit) {
  const u = UNIT_MAP[unit];
  const decimals = u ? u.decimals : 2;
  const n = Number(qty) || 0;
  return `${n.toLocaleString("es-VE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}${u ? " " + u.symbol : ""}`;
}

export function fmtDateTime(ts) {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(ts) {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtTime(ts) {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - day);
  return x;
}

export function startOfMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x;
}

export function shortId() {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function normalizePhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/[^\d]/g, "");
  if (p.startsWith("0")) p = "58" + p.slice(1);
  else if (p.startsWith("584")) p = p;
  else if (p.startsWith("58")) p = p;
  else if (p.startsWith("+")) p = String(phone).replace(/^\D+/g, "");
  else if (p.length <= 11 && !p.startsWith("58")) p = "58" + p;
  return p;
}