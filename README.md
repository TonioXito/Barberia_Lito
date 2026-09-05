# Carnicería · Punto de Venta (App Web)

Aplicación web (funciona en **PC y teléfono**) para administrar una carnicería:
inventario, ventas con ticket, reportes, cuentas por cobrar, cartera de clientes
y envío del ticket por **WhatsApp**. Los datos se guardan en **Firebase Firestore**.

> El proyecto debe estar conectado a un proyecto de Firebase. Sigue la sección
> [Configuración inicial](#configuración-inicial) para activarlo.

---

## Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| **Acceso** | Pantalla simple de **una sola contraseña** para entrar |
| **Suscripción** | Ventana de activación por código, gestionada desde Firebase |
| **Inicio** | Resumen del día, últimas ventas y alertas de stock agotado |
| **Vender (POS)** | Carrito, clientes, método de pago, ventas a **crédito**, descuento |
| **Ticket** | Formato térmico 80 mm, listo para imprimir / guardar PDF / enviar por WhatsApp |
| **Inventario** | Productos por unidades (kg, g, libra, unidad, docena, bandeja…), reponer stock, ajustes, historial de movimientos |
| **Reportes** | Filtros hoy / semana / mes / personalizado, por método de pago, exportar CSV |
| **Cuentas por cobrar** | Saldos por cliente, registrar abonos, historial de pagos |
| **Clientes** | Cartera con nombre y teléfono (para WhatsApp), editar y eliminar |
| **Configuración** | Nombre del negocio, tasa de cambio (Bs/$), datos de **pago móvil**, contraseña y suscripción |

---

## Stack

- React 19 + Vite 6 + Tailwind CSS 4
- Firebase (Firestore, Auth anónimo para reglas, Hosting)
- Lucide icons · React Router

---

## Configuración inicial

1. **Crear un proyecto en Firebase** → https://console.firebase.google.com

2. **Activar Firestore** (Database → Create database → modo *production*, región cercana).

3. **Activar el inicio de sesión anónimo** (Authentication → Sign-in method →
   *Anonymous* → Habilitar). La app lo usa internamente para que las reglas de
   seguridad de Firestore funcionen. El acceso real se controla con la
   **contraseña única** del negocio (no se pide ningún usuario al entrar).

4. **Registrar una app web** (Descripción general del proyecto → configuración →
   *Tus aplicaciones* → Web `</>`). Copia las credenciales.

5. **Configurar credenciales** en `src/firebase/config.js`, o crear un archivo
   `.env` a partir del `.env.example`:

   ```bash
   cp .env.example .env
   # editar .env con tus valores
   ```

6. **Publicar reglas de seguridad e índices** (`settings/config` es de lectura
   pública para poder validar la contraseña; el resto de colecciones exige
   sesión):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,firestore:indexes
   ```

7. **Configurar el documento inicial `settings/config`**:

   Crea el documento `settings/config` en Firestore con esta estructura:

   ```json
   {
     "businessName": "Carnicería El Sol",
     "phone": "04140000000",
     "address": "",
     "exchangeRate": 36.5,
     "banco": "Banco Venezuela",
     "cedula": "V-12345678",
     "telefono": "04140000000",
     "nombre": "Nombre del titular",
     "passwordHash": "",
     "subscription": {
       "active": true,
       "expiresAt": null,
       "code": "CARNICERIA2026"
     }
   }
   ```

   > **Nota**: con `passwordHash` vacío la app entra sin pedir contraseña
   > (útil para la primera vez). Pon tu contraseña desde
   > *Configuración → Contraseña de acceso*; se guarda cifrada (SHA-256).

---

## Ejecutar en desarrollo

```bash
pnpm install        # o npm install
pnpm dev            # o npm run dev
```

Abre http://localhost:5173

---

## Publicar en producción (Firebase Hosting)

```bash
pnpm build
firebase login
firebase deploy    # hosting + firestore (reglas e índices)
```

La app queda disponible en `https://TU-PROYECTO.web.app`.

---

## Cómo funciona el acceso

- La pantalla de acceso pide **una sola contraseña** (sin correo ni usuario).
- La contraseña se guarda cifrada (SHA-256) en `settings/config.passwordHash`.
- La sesión se mantiene por 7 días en el dispositivo; al recargar sigues
  identificado hasta que pulses "Salir".
- En **Configuración → Contraseña de acceso** puedes cambiarla cuando quieras.
  Mientras `passwordHash` esté vacío, la app entra sin pedir contraseña.

## Cómo funciona la suscripción

- La app lee `settings/config.subscription`.
- Si `active === false` o `expiresAt` ya pasó, muestra la pantalla de
  **activación** y pide un código.
- El código por defecto es `subscription.code`. Para "activar" una suscripción,
  el dueño puede:
  - Cambiar `active` a `true` desde la consola de Firebase, o
  - Cambiar el código de activación en **Configuración → Suscripción** y
    entregárselo al cliente, quien lo introduce en la pantalla de activación.
- Desde **Configuración** el dueño también puede activar/desactivar la
  suscripción y ajustar la fecha de expiración.

## Cómo funciona el WhatsApp del ticket

Al finalizar una venta, el ticket muestra botones para:
- **Imprimir** (formato térmico 80 mm).
- **Guardar PDF**.
- **WhatsApp**: genera un enlace `https://wa.me/{teléfono}` con el mensaje del
  ticket preescrito. Del teléfono de la venta: usa el teléfono del **cliente
  facturado**; si no hay, usa el teléfono del negocio de la configuración.