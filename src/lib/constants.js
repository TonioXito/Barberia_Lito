export const UNITS = [
  { value: "KILO", label: "Kilogramo", symbol: "kg", decimals: 3 },
  { value: "MEDIO_KILO", label: "Medio kilo", symbol: "1/2 kg", decimals: 3 },
  { value: "GRAMO", label: "Gramo", symbol: "g", decimals: 0 },
  { value: "LIBRA", label: "Libra", symbol: "lb", decimals: 2 },
  { value: "UNIDAD", label: "Unidad", symbol: "und", decimals: 0 },
  { value: "DOCENA", label: "Docena", symbol: "doc", decimals: 0 },
  { value: "BANDEJA", label: "Bandeja", symbol: "bnd", decimals: 1 },
];

export const UNIT_MAP = Object.fromEntries(UNITS.map((u) => [u.value, u]));

export const PAYMENT_METHODS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "PUNTO", label: "Punto de venta" },
  { value: "PAGO_MOVIL", label: "Pago móvil" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CREDITO", label: "Crédito" },
];

export const PAYMENT_METHOD_MAP = Object.fromEntries(
  PAYMENT_METHODS.map((p) => [p.value, p.label]),
);

export const CATEGORIES = [
  { value: "RES", label: "Res" },
  { value: "POLLO", label: "Pollo" },
  { value: "CERDO", label: "Cerdo" },
  { value: "CHARCUTERIA", label: "Charcutería" },
  { value: "EMBUTIDOS", label: "Embutidos" },
  { value: "OTROS", label: "Otros" },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export const MOVEMENT_TYPES = [
  { value: "CARGA", label: "Carga / Reposición" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "DEVOLUCION", label: "Devolución" },
  { value: "VENTA", label: "Venta" },
];

export const RECONCILIATION_FILTERS = [
  { value: "TODOS", label: "Todos" },
  { value: "SIN_CONCILIAR", label: "Sin conciliar" },
  { value: "CONCILIADO", label: "Conciliado" },
];

export const EMAIL_OWNER = "admin@carniceria.app";