import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit as fireLimit,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

const now = () => serverTimestamp();

/* ============ SETTINGS ============ */

export const DEFAULT_SETTINGS = {
  businessName: "Carnicería",
  phone: "",
  address: "",
  exchangeRate: 0,
  banco: "",
  cedula: "",
  telefono: "",
  nombre: "",
  passwordHash: "",
  subscription: {
    active: false,
    expiresAt: null,
    code: "CARNICERIA2025",
  },
};

export async function getSettings() {
  const ref = doc(db, "settings", "config");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    try {
      await setDoc(ref, { ...DEFAULT_SETTINGS, updatedAt: now() });
    } catch (e) {
      // sin permisos de escritura aún (antes del login): se devuelve el valor por defecto
    }
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...snap.data() };
}

export async function updateSettings(partial) {
  const ref = doc(db, "settings", "config");
  await updateDoc(ref, { ...partial, updatedAt: now() });
}

export function onSettings(cb, onError) {
  const ref = doc(db, "settings", "config");
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        cb({ ...DEFAULT_SETTINGS });
        return;
      }
      cb({ ...DEFAULT_SETTINGS, ...snap.data() });
    },
    (err) => {
      if (onError) onError(err);
    },
  );
}

/* ============ PRODUCTS ============ */

export function onProducts(cb) {
  const q = query(collection(db, "products"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

export async function addProduct(data) {
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    stock: Number(data.stock) || 0,
    priceUsd: Number(data.priceUsd) || 0,
    active: true,
    createdAt: now(),
  });
  return ref.id;
}

export async function updateProductDoc(id, data) {
  await updateDoc(doc(db, "products", id), { ...data, updatedAt: now() });
}

export async function deleteProductDoc(id) {
  await deleteDoc(doc(db, "products", id));
}

export async function toggleProduct(id, active) {
  await updateDoc(doc(db, "products", id), { active, updatedAt: now() });
}

/* ============ MOVEMENTS (inventory) ============ */

export function onMovements(cb, limit = 100) {
  const q = query(
    collection(db, "movements"),
    orderBy("createdAt", "desc"),
    fireLimit(limit),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

export async function addMovement({ productId, productName, unit, type, quantity, note }) {
  const productRef = doc(db, "products", productId);

  await runTransaction(db, async (tx) => {
    const prodSnap = await tx.get(productRef);
    if (!prodSnap.exists()) throw new Error("Producto no existe");
    const prod = prodSnap.data();
    const qty = Number(quantity) || 0;
    let newStock = prod.stock;

    if (type === "VENTA" || (type === "AJUSTE" && qty < 0)) {
      newStock = prod.stock - qty;
    } else {
      newStock = prod.stock + qty;
    }
    if (newStock < 0) newStock = 0;

    tx.update(productRef, { stock: newStock, updatedAt: now() });
    const mvRef = doc(collection(db, "movements"));
    tx.set(mvRef, {
      productId,
      productName,
      unit,
      type,
      quantity: qty,
      previousStock: prod.stock,
      newStock,
      note: note || "",
      createdAt: now(),
    });
  });
}

export async function restockMovement({ productId, productName, unit, quantity, note }) {
  const productRef = doc(db, "products", productId);
  await runTransaction(db, async (tx) => {
    const prodSnap = await tx.get(productRef);
    if (!prodSnap.exists()) throw new Error("Producto no existe");
    const prod = prodSnap.data();
    const qty = Number(quantity) || 0;
    const newStock = prod.stock + qty;
    tx.update(productRef, { stock: newStock, updatedAt: now() });
    const mvRef = doc(collection(db, "movements"));
    tx.set(mvRef, {
      productId,
      productName,
      unit,
      type: "CARGA",
      quantity: qty,
      previousStock: prod.stock,
      newStock,
      note: note || "",
      createdAt: now(),
    });
  });
}

/* ============ CLIENTS ============ */

export function onClients(cb) {
  const q = query(collection(db, "clients"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

export async function addClient({ name, phone, note }) {
  const ref = await addDoc(collection(db, "clients"), {
    name: String(name || "").trim(),
    phone: String(phone || "").trim(),
    note: String(note || "").trim(),
    createdAt: now(),
  });
  return ref.id;
}

export async function updateClientDoc(id, data) {
  await updateDoc(doc(db, "clients", id), { ...data, updatedAt: now() });
}

export async function deleteClientDoc(id) {
  await deleteDoc(doc(db, "clients", id));
}

/* ============ SALES ============ */

let ticketCounter = 1000;

export async function addSale({ client, items, paymentMethod, exchangeRate, discountUsd, note }) {
  const productsRefById = items.map((it) => ({ it, ref: doc(db, "products", it.productId) }));

  const ticketNumber = await getNextTicketNumber();

  const result = await runTransaction(db, async (tx) => {
    let subtotalUsd = 0;
    const saleItems = [];
    for (const { it, ref } of productsRefById) {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Producto no existe");
      const prod = snap.data();
      const qty = Number(it.quantity) || 0;
      const price = Number(it.priceUsd ?? prod.priceUsd) || 0;
      const lineTotal = roundMoney(qty * price);
      subtotalUsd += lineTotal;
      const newStock = (prod.stock || 0) - qty;
      tx.update(ref, { stock: newStock < 0 ? 0 : newStock, updatedAt: now() });
      tx.set(doc(collection(db, "movements")), {
        productId: prod.id || it.productId,
        productName: prod.name,
        unit: prod.unit,
        type: "VENTA",
        quantity: qty,
        previousStock: prod.stock,
        newStock: newStock < 0 ? 0 : newStock,
        note: `Ticket #${ticketNumber}`,
        createdAt: now(),
      });
      saleItems.push({
        productId: it.productId,
        productName: prod.name,
        unit: prod.unit,
        unitSymbol: unitSymbol(prod.unit),
        quantity: qty,
        productPrice: price,
        subtotalUsd: lineTotal,
      });
    }

    const discount = Math.min(Number(discountUsd) || 0, subtotalUsd);
    const totalUsd = Math.max(0, subtotalUsd - discount);
    const balanceUsd = paymentMethod === "CREDITO" ? totalUsd : 0;

    const saleRef = doc(collection(db, "sales"));
    tx.set(saleRef, {
      ticketNumber,
      clientId: client?.id || null,
      clientName: client?.name || "",
      clientPhone: client?.phone || "",
      items: saleItems,
      subtotalUsd: roundMoney(subtotalUsd),
      discountUsd: roundMoney(discount),
      totalUsd: roundMoney(totalUsd),
      totalBs: roundMoney(totalUsd * (Number(exchangeRate) || 0)),
      exchangeRate: Number(exchangeRate) || 0,
      itemCount: saleItems.length,
      paymentMethod,
      paymentLabel: paymentLabel(paymentMethod),
      isCredit: paymentMethod === "CREDITO",
      creditStatus: paymentMethod === "CREDITO" ? "PENDIENTE" : "CONTADO",
      balanceUsd: roundMoney(balanceUsd),
      note: note || "",
      createdAt: now(),
    });

    if (paymentMethod === "CREDITO") {
      tx.set(doc(collection(db, "credit_payments")), {
        saleId: saleRef.id,
        clientId: client?.id || null,
        clientName: client?.name || "",
        type: "COMPRA",
        amountUsd: 0,
        createdAt: now(),
        note: `Compra a crédito Ticket #${ticketNumber}`,
      });
    }

    return {
      id: saleRef.id,
      ticketNumber,
      subtotalUsd,
      discount,
      totalUsd,
      balanceUsd,
      isCredit: paymentMethod === "CREDITO",
      items: saleItems,
    };
  });

  return {
    ...result,
    clientName: client?.name || "",
    clientPhone: client?.phone || "",
    exchangeRate: Number(exchangeRate) || 0,
    paymentMethod,
    paymentLabel: paymentLabel(paymentMethod),
    paymentDate: new Date(),
  };
}

function roundMoney(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function paymentLabel(method) {
  const map = {
    EFECTIVO: "Efectivo",
    PUNTO: "Punto de venta",
    PAGO_MOVIL: "Pago móvil",
    TRANSFERENCIA: "Transferencia",
    CREDITO: "Crédito",
  };
  return map[method] || "Contado";
}

function unitSymbol(unit) {
  const map = {
    KILO: "kg",
    MEDIO_KILO: "1/2 kg",
    GRAMO: "g",
    LIBRA: "lb",
    UNIDAD: "und",
    DOCENA: "doc",
    BANDEJA: "bnd",
  };
  return map[unit] || "";
}

async function getNextTicketNumber() {
  try {
    const q = query(collection(db, "sales"), orderBy("ticketNumber", "desc"), fireLimit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const last = snap.docs[0].data().ticketNumber;
      return (Number(last) || 1000) + 1;
    }
  } catch (e) {
    // ignora errores de índice y usa el contador local
  }
  ticketCounter += 1;
  return ticketCounter;
}

export function onSales(cb, opts = {}) {
  let q = query(collection(db, "sales"), orderBy("createdAt", "desc"), fireLimit(opts.limit || 500));
  if (opts.paymentMethod && opts.paymentMethod !== "TODOS") {
    q = query(q, where("paymentMethod", "==", opts.paymentMethod));
  }
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

export async function getAllSales() {
  const q = query(collection(db, "sales"), orderBy("createdAt", "desc"), fireLimit(500));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ============ CRÉDITO / CUENTAS POR COBRAR ============ */

export function onCreditSales(cb) {
  const q = query(
    collection(db, "sales"),
    where("isCredit", "==", true),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

export async function registerCreditPayment({ saleId, amountUsd, exchangeRate, method, note }) {
  const saleRef = doc(db, "sales", saleId);
  const result = await runTransaction(db, async (tx) => {
    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists()) throw new Error("Venta no existe");
    const sale = saleSnap.data();
    const amt = Number(amountUsd) || 0;
    if (amt <= 0) throw new Error("Monto inválido");
    const newBalance = Math.max(0, roundMoney((sale.balanceUsd || 0) - amt));
    const status = newBalance <= 0 ? "PAGADO" : "PENDIENTE";
    tx.update(saleRef, {
      balanceUsd: newBalance,
      creditStatus: status,
      updatedAt: now(),
    });
    const payRef = doc(collection(db, "credit_payments"));
    tx.set(payRef, {
      saleId,
      clientId: sale.clientId || null,
      clientName: sale.clientName || "",
      type: "ABONO",
      amountUsd: roundMoney(amt),
      amountBs: roundMoney(amt * (Number(exchangeRate) || 0)),
      exchangeRate: Number(exchangeRate) || 0,
      method: method || "EFECTIVO",
      saleTicket: sale.ticketNumber,
      date: new Date().toISOString(),
      createdAt: now(),
      note: note || "",
    });
    return { newBalance, status, payId: payRef.id };
  });
  return result;
}

export function onCreditPayments(cb) {
  const q = query(
    collection(db, "credit_payments"),
    orderBy("createdAt", "desc"),
    fireLimit(300),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

/* ============ SUSCRIPCIÓN Y ACCESO ============ */

export async function checkSubscription() {
  const settings = await getSettings();
  const sub = settings.subscription || {};
  if (!sub.active) return { ok: false, settings };
  if (sub.expiresAt) {
    const exp = sub.expiresAt.toDate ? sub.expiresAt.toDate() : new Date(sub.expiresAt);
    if (exp < new Date()) {
      return { ok: false, settings, expired: true };
    }
  }
  return { ok: true, settings };
}

export async function activateSubscription(code) {
  const settings = await getSettings();
  const sub = settings.subscription || {};
  if (String(code).trim() !== String(sub.code || "").trim()) {
    throw new Error("Código de activación incorrecto");
  }
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  await updateSettings({
    subscription: {
      ...sub,
      active: true,
      activatedAt: new Date().toISOString(),
      expiresAt,
    },
  });
  return true;
}

export async function setSubscriptionStatus({ active, expiresAt }) {
  const settings = await getSettings();
  const sub = settings.subscription || {};
  await updateSettings({
    subscription: { ...sub, active, expiresAt: expiresAt || sub.expiresAt },
  });
}

export async function verifyPassword(password) {
  const settings = await getSettings();
  if (!settings.passwordHash) return true; // sin contraseña configurada aún
  const hash = await sha256(password);
  return hash === settings.passwordHash;
}

export async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}