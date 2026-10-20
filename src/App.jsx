import React, { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "mago-sys-r3";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const money = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const usd = (value) => `$${Number(value || 0).toFixed(2)}`;

const bs = (value) => `Bs. ${Number(value || 0).toFixed(2)}`;

const numberCode = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${uid()
    .slice(-5)
    .toUpperCase()}`;

const dateText = (value) => new Date(value).toLocaleString();

const todayKey = (value) => new Date(value).toDateString();

const METHODS = [
  "Efectivo USD",
  "Efectivo VES",
  "Pago Móvil",
  "Punto de Venta",
  "Zelle",
  "Transferencia",
];

const SERVICE_STATUSES = [
  "RECIBIDO",
  "DIAGNOSTICO",
  "EN_REPARACION",
  "LISTO",
  "ENTREGADO",
  "CANCELADO",
];

const emptyProduct = () => ({
  code: "",
  name: "",
  category: "General",
  description: "",
  unit: "und",
  costUSD: "",
  priceUSD: "",
  stock: "",
});

const emptyClient = () => ({
  name: "",
  rif: "",
  phone: "",
  address: "",
  notes: "",
});

const emptyService = () => ({
  clientId: "",
  equipment: "",
  brand: "",
  model: "",
  serial: "",
  fault: "",
  diagnosis: "",
  laborUSD: "",
  partsUSD: "",
  status: "RECIBIDO",
  notes: "",
});

function seedDatabase() {
  return {
    version: 3,
    users: [
      { id: 1, username: "mago", pin: "1452", name: "Miguel González", role: "admin" },
      { id: 2, username: "cajero1", pin: "5678", name: "María Cajera", role: "cajero" },
    ],
    config: {
      storeName: "MAGO SYS VENEZUELA C.A.",
      rif: "J-50123456-7",
      address: "Caracas, Venezuela",
      phone: "",
      footerMessage: "¡Gracias por su compra!",
      bcvRate: 36.5,
      servicePrefix: "ST",
    },
    inventory: [
      {
        id: 1,
        code: "PROD-001",
        name: "Servicio de Consultoría / Asesoría",
        category: "Servicios",
        description: "Asesoría profesional",
        unit: "hora",
        costUSD: 10,
        priceUSD: 25,
        stock: 100,
      },
    ],
    clients: [
      {
        id: 1,
        name: "Cliente Genérico",
        rif: "V-00000000-0",
        phone: "",
        address: "Caracas",
        notes: "",
      },
    ],
    selectedClientId: 1,
    cart: [],
    standby: [],
    sales: [],
    services: [],
    debts: [],
    zReports: [],
  };
}

function loadDatabase() {
  const initial = seedDatabase();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { database: initial, error: "" };
    const parsed = JSON.parse(raw);
    const arrays = ["users", "inventory", "clients", "cart", "standby", "sales", "services", "debts", "zReports"];
    if (
      parsed.version !== 3 ||
      !parsed.config ||
      arrays.some((key) => !Array.isArray(parsed[key])) ||
      !parsed.users.length ||
      !parsed.clients.length
    ) {
      throw new Error("Formato local incompatible.");
    }
    return {
      database: {
        ...initial,
        ...parsed,
        config: { ...initial.config, ...parsed.config },
      },
      error: "",
    };
  } catch {
    return {
      database: initial,
      error: "No se pudo leer el almacenamiento local.",
    };
  }
}

function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

function Modal({ title, children, onClose, printable = false }) {
  return (
    <div className="modal-backdrop">
      <section className={`modal ${printable ? "printable" : ""}`}>
        <div className="row between">
          <h3>{title}</h3>
          <button className="secondary no-print" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
        {printable && (
          <button className="no-print" onClick={() => window.print()}>
            Imprimir en Comandera
          </button>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [loaded] = useState(loadDatabase);
  const [db, setDb] = useState(loaded.database);
  const [storageError, setStorageError] = useState(loaded.error);

  const [currentUser, setCurrentUser] = useState(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPin, setLoginPin] = useState("");

  const [activeTab, setActiveTab] = useState("pos");
  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const [productForm, setProductForm] = useState(emptyProduct());
  const [editingProductId, setEditingProductId] = useState(null);
  const [clientForm, setClientForm] = useState(emptyClient());

  const [posClientModalOpen, setPosClientModalOpen] = useState(false);
  const [posQuickClient, setPosQuickClient] = useState(emptyClient());

  const [serviceForm, setServiceForm] = useState(emptyService());
  const [editingServiceId, setEditingServiceId] = useState(null);

  const [debtForm, setDebtForm] = useState({ clientId: "", concept: "", amountUSD: "", dueDate: "" });
  const [abonoTarget, setAbonoTarget] = useState(null);
  const [abonoForm, setAbonoForm] = useState({ amount: "", currency: "USD", rate: "", method: "Efectivo USD", reference: "" });

  const [userForm, setUserForm] = useState({ username: "", pin: "", name: "", role: "cajero" });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentRows, setPaymentRows] = useState([{ method: "Efectivo USD", currency: "USD", rawAmount: "" }]);
  const [cashTenderedUSD, setCashTenderedUSD] = useState("");
  const [creditSale, setCreditSale] = useState(false);
  const [creditDueDate, setCreditDueDate] = useState("");
  const [invoiceData, setInvoiceData] = useState({ name: "", rif: "", address: "", notes: "" });
  const [printed, setPrinted] = useState(null);

  const operationLock = useRef(false);
  const isAdmin = currentUser?.role === "admin";

  const selectedClient =
    db.clients.find((client) => client.id === db.selectedClientId) || db.clients[0];

  const rate = Number(db.config.bcvRate);

  const totalUSD = money(
    db.cart.reduce((sum, item) => sum + item.quantity * item.priceUSD, 0)
  );
  const totalVES = money(totalUSD * rate);

  useEffect(() => {
    operationLock.current = false;
  }, [db]);

  useEffect(() => {
    if (loaded.error) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      setStorageError("");
    } catch {
      setStorageError("No se pudo guardar en este navegador.");
    }
  }, [db, loaded.error]);

  function commit(change) {
    if (loaded.error) {
      alert("Operación bloqueada: revise el almacenamiento local.");
      return false;
    }
    if (operationLock.current) return false;
    operationLock.current = true;
    setDb((previous) => change(previous));
    return true;
  }

  function requireAdmin() {
    if (isAdmin) return true;
    alert("Esta operación requiere un administrador.");
    return false;
  }

  function rowUSD(row) {
    const amount = Number(row.rawAmount || 0);
    return row.currency === "VES" ? amount / rate : amount;
  }

  const paidUSD = money(paymentRows.reduce((sum, row) => sum + rowUSD(row), 0));
  const remainingUSD = money(totalUSD - paidUSD);

  function debtBalance(debt) {
    return Math.max(
      0,
      money(
        debt.amountUSD -
          debt.payments.reduce((sum, payment) => sum + payment.amountUSD, 0)
      )
    );
  }

  const accounts = [
    ...db.sales
      .filter((sale) => sale.status !== "ANULADA" && sale.creditUSD > 0)
      .map((sale) => ({
        id: sale.id,
        source: "sale",
        client: sale.client,
        concept: sale.invoiceNumber,
        amountUSD: sale.creditUSD,
        dueDate: sale.dueDate,
        payments: sale.creditPayments || [],
      })),
    ...db.debts.map((debt) => ({ ...debt, source: "manual" })),
  ];

  const totalDebtUSD = money(accounts.reduce((sum, account) => sum + debtBalance(account), 0));
  const closedSaleIds = new Set(db.zReports.flatMap((report) => report.salesList.map((sale) => sale.id)));

  const openTodaySales = db.sales.filter(
    (sale) =>
      sale.status !== "ANULADA" &&
      todayKey(sale.createdAt) === todayKey(Date.now()) &&
      !closedSaleIds.has(sale.id)
  );

  const todayTotalUSD = money(openTodaySales.reduce((sum, sale) => sum + sale.totalUSD, 0));

  function login(event) {
    event.preventDefault();
    const user = db.users.find(
      (item) => item.username === loginUser.trim() && item.pin === loginPin
    );
    if (!user) return alert("Usuario o PIN incorrecto.");
    setCurrentUser(user);
    setLoginUser("");
    setLoginPin("");
    setActiveTab("pos");
  }

  function logout() {
    setCurrentUser(null);
    setCheckoutOpen(false);
    setPrinted(null);
    setAbonoTarget(null);
  }

  function handleQuickClientSave(event) {
    event.preventDefault();
    if (!posQuickClient.name.trim() || !posQuickClient.rif.trim()) {
      return alert("Nombre y RIF/Cédula son obligatorios.");
    }
    const client = { ...posQuickClient, id: uid(), name: posQuickClient.name.trim(), rif: posQuickClient.rif.trim() };
    if (
      commit((previous) => ({
        ...previous,
        clients: [...previous.clients, client],
        selectedClientId: client.id,
      }))
    ) {
      setPosQuickClient(emptyClient());
      setPosClientModalOpen(false);
    }
  }

  function addToCart(product) {
    const existing = db.cart.find((item) => item.id === product.id);
    const quantity = (existing?.quantity || 0) + 1;
    if (quantity > product.stock) return alert("No hay existencias suficientes.");
    commit((previous) => ({
      ...previous,
      cart: existing
        ? previous.cart.map((item) => (item.id === product.id ? { ...item, quantity } : item))
        : [...previous.cart, { ...product, quantity: 1 }],
    }));
  }

  function changeQuantity(id, delta) {
    const item = db.cart.find((row) => row.id === id);
    const product = db.inventory.find((row) => row.id === id);
    if (!item) return;
    const quantity = item.quantity + delta;
    if (quantity > 0 && (!product || quantity > product.stock)) {
      return alert("No hay existencias suficientes.");
    }
    commit((previous) => ({
      ...previous,
      cart:
        quantity <= 0
          ? previous.cart.filter((row) => row.id !== id)
          : previous.cart.map((row) => (row.id === id ? { ...row, quantity } : row)),
    }));
  }

  function validateCart() {
    if (!db.cart.length) return "El carrito está vacío.";
    for (const item of db.cart) {
      const product = db.inventory.find((row) => row.id === item.id);
      if (!product || item.quantity <= 0 || item.quantity > product.stock) {
        return `Existencias insuficientes: ${item.name}`;
      }
    }
    return "";
  }

  function standbySnapshot() {
    return {
      id: uid(),
      comandaNumber: numberCode("CMD"),
      createdAt: new Date().toISOString(),
      client: { ...selectedClient },
      cashier: currentUser.name,
      items: db.cart.map((item) => ({ ...item })),
      totalUSD,
      totalVES,
      bcvRate: rate,
      status: "STANDBY",
    };
  }

  function pauseSale() {
    if (!db.cart.length) return alert("El carrito está vacío.");
    const order = standbySnapshot();
    if (
      commit((previous) => ({
        ...previous,
        cart: [],
        standby: [order, ...previous.standby],
      }))
    ) {
      setPrinted({ type: "standby", document: order });
      setCheckoutOpen(false);
    }
  }

  function recoverSale(order) {
    if (db.cart.length && !window.confirm("¿Guardar venta actual en espera y recuperar esta?")) return;
    const replacement = db.cart.length ? standbySnapshot() : null;
    commit((previous) => ({
      ...previous,
      cart: order.items.map((item) => ({ ...item })),
      selectedClientId:
        previous.clients.find((client) => client.id === order.client.id)?.id || previous.clients[0].id,
      standby: [...(replacement ? [replacement] : []), ...previous.standby.filter((item) => item.id !== order.id)],
    }));
    setCheckoutOpen(false);
    setActiveTab("pos");
  }

  function deleteStandby(order) {
    if (!window.confirm(`¿Eliminar ${order.comandaNumber}?`)) return;
    commit((previous) => ({ ...previous, standby: previous.standby.filter((item) => item.id !== order.id) }));
  }

  function openCheckout() {
    const error = validateCart();
    if (error) return alert(error);
    if (!Number.isFinite(rate) || rate <= 0) return alert("Configure una tasa BCV mayor a cero.");
    setPaymentRows([{ method: "Efectivo USD", currency: "USD", rawAmount: totalUSD.toFixed(2) }]);
    setInvoiceData({
      name: selectedClient.name,
      rif: selectedClient.rif,
      address: selectedClient.address || "",
      notes: "",
    });
    setCreditSale(false);
    setCreditDueDate("");
    setCashTenderedUSD("");
    setCheckoutOpen(true);
  }

  function updatePayment(index, field, value) {
    setPaymentRows((previous) =>
      previous.map((row, position) => (position === index ? { ...row, [field]: value } : row))
    );
  }

  function completePaymentRow(index) {
    const otherPaid = paymentRows.reduce((sum, row, position) => (position === index ? sum : sum + rowUSD(row)), 0);
    const remaining = Math.max(0, totalUSD - otherPaid);
    updatePayment(
      index,
      "rawAmount",
      (paymentRows[index].currency === "VES" ? remaining * rate : remaining).toFixed(2)
    );
  }

  function processPayment() {
    const error = validateCart();
    if (error) return alert(error);
    if (!Number.isFinite(rate) || rate <= 0) return alert("Tasa BCV inválida.");

    if (paidUSD > totalUSD) return alert("El pago aplicado supera el total.");
    if (!creditSale && paidUSD < totalUSD) return alert("Complete el pago o marque venta a crédito.");
    if (creditSale && selectedClient.id === 1) return alert("Seleccione un cliente identificado para el crédito.");

    const cashApplied = money(
      paymentRows
        .filter((row) => row.method === "Efectivo USD" && row.currency === "USD")
        .reduce((sum, row) => sum + rowUSD(row), 0)
    );

    const sale = {
      id: uid(),
      invoiceNumber: numberCode("FAC"),
      createdAt: new Date().toISOString(),
      client: {
        ...selectedClient,
        name: invoiceData.name.trim() || selectedClient.name,
        rif: invoiceData.rif.trim() || selectedClient.rif,
        address: invoiceData.address,
        notes: invoiceData.notes,
      },
      cashier: currentUser.name,
      items: db.cart.map((item) => ({ ...item })),
      totalUSD,
      totalVES,
      bcvRate: rate,
      paymentRows: paymentRows
        .filter((row) => Number(row.rawAmount) > 0)
        .map((row) => ({ ...row, rawAmount: Number(row.rawAmount), amountUSD: rowUSD(row) })),
      cashTenderedUSD: cashTenderedUSD === "" ? null : Number(cashTenderedUSD),
      changeUSD: cashTenderedUSD === "" ? 0 : money(Number(cashTenderedUSD) - cashApplied),
      creditUSD: Math.max(0, money(totalUSD - paidUSD)),
      creditPayments: [],
      dueDate: creditSale ? creditDueDate : "",
      status: "COMPLETADA",
      stockDeducted: true,
    };

    if (
      commit((previous) => ({
        ...previous,
        inventory: previous.inventory.map((product) => {
          const item = sale.items.find((row) => row.id === product.id);
          return item ? { ...product, stock: product.stock - item.quantity } : product;
        }),
        sales: [sale, ...previous.sales],
        cart: [],
      }))
    ) {
      setCheckoutOpen(false);
      setPrinted({ type: "sale", document: sale });
    }
  }

  function voidInvoice(sale) {
    if (!requireAdmin()) return;
    if (sale.status === "ANULADA") return alert("La factura ya está anulada.");
    const reason = window.prompt(`Motivo de anulación para ${sale.invoiceNumber}:`);
    if (!reason?.trim()) return;

    commit((previous) => ({
      ...previous,
      inventory: previous.inventory.map((product) => {
        const item = sale.items.find((row) => row.id === product.id);
        return item ? { ...product, stock: product.stock + item.quantity } : product;
      }),
      sales: previous.sales.map((item) =>
        item.id === sale.id
          ? {
              ...item,
              status: "ANULADA",
              voidReason: reason.trim(),
              voidedAt: new Date().toISOString(),
              voidedBy: currentUser.name,
            }
          : item
      ),
    }));
  }

  function deleteInvoiceCompletely(sale) {
    if (!requireAdmin()) return;
    if (closedSaleIds.has(sale.id)) {
      return alert("La factura pertenece a un cierre Z y no se puede eliminar directamente.");
    }
    if (!window.confirm(`⚠️ ¿Desea ELIMINAR POR COMPLETO la factura ${sale.invoiceNumber}? Repondrá inventario y borrará el registro.`)) {
      return;
    }

    commit((previous) => ({
      ...previous,
      inventory: previous.inventory.map((product) => {
        const item = sale.items?.find((row) => row.id === product.id);
        return item && sale.status !== "ANULADA"
          ? { ...product, stock: product.stock + item.quantity }
          : product;
      }),
      sales: previous.sales.filter((item) => item.id !== sale.id),
    }));
  }

  function saveProduct(event) {
    event.preventDefault();
    if (!requireAdmin()) return;
    const costUSD = Number(productForm.costUSD || 0);
    const priceUSD = Number(productForm.priceUSD);
    const stock = Number(productForm.stock || 0);

    const product = {
      ...productForm,
      id: editingProductId || uid(),
      code: productForm.code.trim() || numberCode("PROD"),
      name: productForm.name.trim(),
      costUSD,
      priceUSD,
      stock,
    };

    if (
      commit((previous) => ({
        ...previous,
        inventory: editingProductId
          ? previous.inventory.map((item) => (item.id === editingProductId ? product : item))
          : [...previous.inventory, product],
      }))
    ) {
      setEditingProductId(null);
      setProductForm(emptyProduct());
    }
  }

  function saveClient(event) {
    event.preventDefault();
    if (!clientForm.name.trim() || !clientForm.rif.trim()) return alert("Nombre y RIF obligatorios.");
    const client = { ...clientForm, id: uid(), name: clientForm.name.trim(), rif: clientForm.rif.trim() };
    if (
      commit((previous) => ({
        ...previous,
        clients: [...previous.clients, client],
        selectedClientId: client.id,
      }))
    ) {
      setClientForm(emptyClient());
    }
  }

  function deleteClient(client) {
    if (!requireAdmin()) return;
    if (client.id === 1) return alert("El cliente genérico está protegido.");
    if (!window.confirm(`¿Eliminar a ${client.name}?`)) return;

    commit((previous) => {
      const clients = previous.clients.filter((item) => item.id !== client.id);
      return {
        ...previous,
        clients,
        selectedClientId: previous.selectedClientId === client.id ? clients[0].id : previous.selectedClientId,
      };
    });
  }

  function saveService(event) {
    event.preventDefault();
    const client = db.clients.find((item) => String(item.id) === String(serviceForm.clientId));
    const laborUSD = Number(serviceForm.laborUSD || 0);
    const partsUSD = Number(serviceForm.partsUSD || 0);

    if (!client || !serviceForm.equipment.trim() || !serviceForm.fault.trim()) {
      return alert("Complete cliente, equipo y falla.");
    }

    const old = db.services.find((order) => order.id === editingServiceId);
    const prefix = db.config.servicePrefix || "ST";

    const order = {
      ...serviceForm,
      id: old?.id || uid(),
      number: old?.number || numberCode(prefix),
      client: { ...client },
      laborUSD: money(laborUSD),
      partsUSD: money(partsUSD),
      totalUSD: money(laborUSD + partsUSD),
      bcvRate: rate,
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      operator: currentUser.name,
    };

    if (
      commit((previous) => ({
        ...previous,
        services: old
          ? previous.services.map((item) => (item.id === old.id ? order : item))
          : [order, ...previous.services],
      }))
    ) {
      setEditingServiceId(null);
      setServiceForm(emptyService());
      setPrinted({ type: "service", document: order });
    }
  }

  function deleteService(order) {
    if (!requireAdmin()) return;
    if (!window.confirm(`¿Eliminar orden ${order.number}?`)) return;
    commit((previous) => ({ ...previous, services: previous.services.filter((item) => item.id !== order.id) }));
  }

  function saveDebt(event) {
    event.preventDefault();
    const client = db.clients.find((item) => String(item.id) === String(debtForm.clientId));
    const amountUSD = money(Number(debtForm.amountUSD));

    if (!client || client.id === 1 || !debtForm.concept.trim() || amountUSD <= 0) {
      return alert("Seleccione cliente, concepto y monto positivo.");
    }

    const debt = {
      id: uid(),
      client: { ...client },
      concept: debtForm.concept.trim(),
      amountUSD,
      dueDate: debtForm.dueDate,
      payments: [],
      createdAt: new Date().toISOString(),
      operator: currentUser.name,
    };

    if (commit((previous) => ({ ...previous, debts: [debt, ...previous.debts] }))) {
      setDebtForm({ clientId: "", concept: "", amountUSD: "", dueDate: "" });
    }
  }

  function openAbono(account) {
    setAbonoTarget({ id: account.id, source: account.source });
    setAbonoForm({ amount: "", currency: "USD", rate: String(rate), method: "Efectivo USD", reference: "" });
  }

  function saveAbono(event) {
    event.preventDefault();
    const account = accounts.find((item) => item.id === abonoTarget?.id && item.source === abonoTarget?.source);
    if (!account) return alert("Cuenta no encontrada.");

    const rawAmount = Number(abonoForm.amount);
    const appliedRate = Number(abonoForm.rate);
    const amountUSD = money(abonoForm.currency === "VES" ? rawAmount / appliedRate : rawAmount);

    if (amountUSD <= 0 || amountUSD > debtBalance(account)) {
      return alert("El abono no puede superar el saldo pendiente.");
    }

    const payment = {
      id: uid(),
      rawAmount,
      amountUSD,
      currency: abonoForm.currency,
      bcvRate: appliedRate,
      method: abonoForm.method,
      reference: abonoForm.reference,
      createdAt: new Date().toISOString(),
      operator: currentUser.name,
    };

    if (
      commit((previous) =>
        account.source === "sale"
          ? {
              ...previous,
              sales: previous.sales.map((sale) =>
                sale.id === account.id ? { ...sale, creditPayments: [...(sale.creditPayments || []), payment] } : sale
              ),
            }
          : {
              ...previous,
              debts: previous.debts.map((debt) =>
                debt.id === account.id ? { ...debt, payments: [...debt.payments, payment] } : debt
              ),
            }
      )
    ) {
      setAbonoTarget(null);
    }
  }

  function generateReport(type) {
    if (type === "Z") {
      if (!requireAdmin()) return;
      if (!openTodaySales.length) return alert("No hay ventas para cierre.");
      if (!window.confirm("¿Ejecutar cierre Z interno?")) return;
    }
    const report = {
      id: uid(),
      reportType: type,
      number: numberCode(type),
      createdAt: new Date().toISOString(),
      operator: currentUser.name,
      salesList: openTodaySales.map((sale) => ({ ...sale })),
      totalUSD: todayTotalUSD,
      totalVES: money(openTodaySales.reduce((sum, sale) => sum + sale.totalVES, 0)),
    };

    if (type === "Z") {
      commit((previous) => ({ ...previous, zReports: [report, ...previous.zReports] }));
    }
    setPrinted({ type: "report", document: report });
  }

  function createUser(event) {
    event.preventDefault();
    if (!requireAdmin()) return;
    const user = { ...userForm, id: uid(), username: userForm.username.trim(), name: userForm.name.trim() };
    commit((previous) => ({ ...previous, users: [...previous.users, user] }));
    setUserForm({ username: "", pin: "", name: "", role: "cajero" });
  }

  function deleteUser(user) {
    if (!requireAdmin()) return;
    if (user.id === currentUser.id) return alert("No puede eliminar su usuario activo.");
    if (!window.confirm(`¿Eliminar usuario ${user.name}?`)) return;
    commit((previous) => ({ ...previous, users: previous.users.filter((item) => item.id !== user.id) }));
  }

  const styles = (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; background: #0b0f19; }
      button, input, select, textarea { font: inherit; }
      button { border: 0; border-radius: 7px; padding: 10px 13px; background: #9333ea; color: white; cursor: pointer; }
      button:disabled { opacity: .45; cursor: not-allowed; }
      input, select, textarea { width: 100%; padding: 10px; border-radius: 7px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; min-width: 0; }
      input[type="checkbox"] { width: auto; }
      h2, h3, h4 { margin-top: 0; }
      h3 { color: #c084fc; font-size: 17px; }
      .app { display: flex; min-height: 100vh; font-family: Arial, sans-serif; color: #f8fafc; }
      .sidebar { width: 250px; flex-shrink: 0; padding: 20px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; gap: 16px; }
      .logo { display: inline-block; background: #9333ea; padding: 10px 14px; border-radius: 9px; font-size: 21px; font-weight: 900; }
      .nav { display: flex; flex-direction: column; gap: 7px; }
      .nav button { text-align: left; background: transparent; }
      .nav button.active { background: #9333ea; }
      .main { flex: 1; min-width: 0; padding: 20px; }
      .panel { background: #1e293b; border: 1px solid #334155; border-radius: 11px; padding: 16px; margin-bottom: 15px; }
      .subpanel { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; margin-bottom: 9px; }
      .grid { display: grid; gap: 14px; }
      .two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .pos-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 15px; align-items: start; }
      .row { display: flex; align-items: center; gap: 8px; }
      .wrap { flex-wrap: wrap; }
      .between { justify-content: space-between; }
      .stack { display: flex; flex-direction: column; gap: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
      .secondary { background: #334155; }
      .danger { background: #991b1b; }
      .blue { background: #0284c7; }
      .muted { color: #94a3b8; font-size: 12px; }
      .cyan { color: #38bdf8; }
      .warning { background: #78350f; padding: 12px; border-radius: 8px; }
      .product { text-align: left; background: #1e293b; border: 1px solid #334155; }
      .product h4 { margin: 12px 0; min-height: 38px; }
      .scroll { overflow-x: auto; }
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      th, td { padding: 10px; border-bottom: 1px solid #334155; text-align: left; }
      .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.85); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 15px; }
      .modal { width: 100%; max-width: 650px; max-height: 92vh; overflow-y: auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
      .printable { background: white; color: black; font-family: monospace; max-width: 480px; }
      .printable h3 { color: black; }
      .printable th, .printable td { border-color: #aaa; }
      .printable hr { border: 0; border-top: 1px dashed #555; margin: 12px 0; }
      .break { overflow-wrap: anywhere; }
      .login { min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; color: white; padding: 20px; }
      .login .panel { width: 100%; max-width: 380px; }
      @media (max-width: 800px) {
        .app { flex-direction: column; }
        .sidebar { width: 100%; padding: 12px; }
        .nav { flex-direction: row; overflow-x: auto; }
        .main { padding: 12px; }
        .pos-grid, .three, .two { grid-template-columns: 1fr; }
      }
      @media print {
        body * { visibility: hidden; }
        .printable, .printable * { visibility: visible; }
        .printable { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0; }
        .no-print { display: none !important; }
      }
    `}</style>
  );

  if (!currentUser) {
    return (
      <div className="login">
        {styles}
        <Panel>
          <div className="logo">MAGO SYS</div>
          <p className="muted">R3 · Sistema Local</p>
          {storageError && <p className="warning">{storageError}</p>}
          <form className="stack" onSubmit={login}>
            <Field label="Usuario" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} required />
            <Field label="PIN" type="password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} required />
            <button type="submit">Iniciar sesión</button>
          </form>
        </Panel>
      </div>
    );
  }

  const tabs = [
    ["pos", "🛒 Caja / POS"],
    ["service", "🔧 Servicio Técnico"],
    ["cxc", "💳 Cobranza (CxC)"],
    ["inventory", "📦 Inventario"],
    ["clients", "👥 Clientes (CRM)"],
    ["reports", "📊 Reportes X y Z"],
    ...(isAdmin ? [["users", "🔐 Usuarios"]] : []),
    ["settings", "⚙️ Ajustes y Factura"],
  ];

  return (
    <div className="app">
      {styles}
      <aside className="sidebar">
        <div className="row between">
          <span className="logo">MAGO SYS</span>
          <button className="danger" onClick={logout}>Salir</button>
        </div>
        <div className="subpanel">
          <div className="muted">Usuario activo</div>
          <p>{currentUser.name}</p>
          <span className="cyan">{currentUser.role.toUpperCase()}</span>
        </div>
        <nav className="nav">
          {tabs.map(([tab, label]) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="subpanel">
          <div className="muted">Tasa BCV manual</div>
          <h3 className="cyan">{bs(rate)}</h3>
        </div>
      </aside>

      <main className="main">
        <div className="row between wrap">
          <h2>{tabs.find(([tab]) => tab === activeTab)?.[1]}</h2>
          <span className="muted">{db.config.storeName}</span>
        </div>
        {storageError && <p className="warning">{storageError}</p>}

        {/* POS */}
        {activeTab === "pos" && (
          <>
            {db.standby.length > 0 && (
              <Panel title={`Ventas en espera (${db.standby.length})`}>
                <div className="row wrap">
                  {db.standby.map((order) => (
                    <div className="row" key={order.id}>
                      <button className="blue" onClick={() => recoverSale(order)}>
                        Recuperar {order.comandaNumber} · {order.client.name} · {usd(order.totalUSD)}
                      </button>
                      <button className="danger" onClick={() => deleteStandby(order)}>×</button>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <div className="pos-grid">
              <Panel title="Orden actual / Carrito">
                <div className="stack">
                  <Field
                    label="Buscar cliente (Nombre o RIF)"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Escriba para filtrar clientes..."
                  />

                  <div className="row between">
                    <Field label="Cliente seleccionado">
                      <select
                        value={selectedClient.id}
                        onChange={(e) => {
                          const client = db.clients.find((item) => String(item.id) === e.target.value);
                          if (client) commit((prev) => ({ ...prev, selectedClientId: client.id }));
                        }}
                      >
                        {db.clients
                          .filter((c) => `${c.name} ${c.rif}`.toLowerCase().includes(clientSearch.toLowerCase()))
                          .map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name} — {client.rif}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <button className="blue" type="button" onClick={() => setPosClientModalOpen(true)} style={{ marginTop: 18 }}>
                      + Nuevo
                    </button>
                  </div>

                  {!db.cart.length && <p className="muted">Carrito vacío.</p>}

                  {db.cart.map((item) => (
                    <div className="subpanel" key={item.id}>
                      <div className="row between">
                        <div>
                          <div>{item.name}</div>
                          <small className="cyan">{usd(item.priceUSD)} c/u</small>
                        </div>
                        <span>{usd(item.priceUSD * item.quantity)}</span>
                      </div>
                      <div className="row" style={{ marginTop: 10 }}>
                        <button className="secondary" onClick={() => changeQuantity(item.id, -1)}>−</button>
                        <span>{item.quantity}</span>
                        <button className="secondary" onClick={() => changeQuantity(item.id, 1)}>+</button>
                        <button className="danger" onClick={() => commit((prev) => ({ ...prev, cart: prev.cart.filter((r) => r.id !== item.id) }))}>Eliminar</button>
                      </div>
                    </div>
                  ))}

                  <div className="row between">
                    <span>Total USD</span>
                    <h3>{usd(totalUSD)}</h3>
                  </div>
                  <div className="row between cyan">
                    <span>Total Bs</span>
                    <span>{bs(totalVES)}</span>
                  </div>

                  <div className="grid two">
                    <button className="blue" disabled={!db.cart.length} onClick={pauseSale}>
                      ⏸ Comanda / Espera
                    </button>
                    <button disabled={!db.cart.length} onClick={openCheckout}>
                      Cobrar y Facturar
                    </button>
                  </div>
                </div>
              </Panel>

              <div>
                <input
                  placeholder="Buscar producto o servicio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ marginBottom: 15 }}
                />
                <div className="grid two catalog">
                  {db.inventory
                    .filter((p) => `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()))
                    .map((product) => (
                      <button key={product.id} className="product" onClick={() => addToCart(product)}>
                        <div className="row between muted">
                          <span>{product.code}</span>
                          <span>Stock: {product.stock}</span>
                        </div>
                        <h4>{product.name}</h4>
                        <div className="cyan">{usd(product.priceUSD)}</div>
                        <small className="muted">{bs(product.priceUSD * rate)}</small>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* SERVICIO TÉCNICO */}
        {activeTab === "service" && (
          <>
            <Panel title={editingServiceId ? "Editar orden de reparación" : "Registrar orden de servicio técnico"}>
              <form className="grid three" onSubmit={saveService}>
                <Field label="Cliente *">
                  <select
                    required
                    value={serviceForm.clientId}
                    onChange={(e) => setServiceForm({ ...serviceForm, clientId: e.target.value })}
                  >
                    <option value="">Seleccione cliente</option>
                    {db.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} — {client.rif}
                      </option>
                    ))}
                  </select>
                </Field>

                {[
                  ["equipment", "Equipo *"],
                  ["brand", "Marca"],
                  ["model", "Modelo"],
                  ["serial", "Serial / IMEI"],
                  ["fault", "Falla reportada *"],
                  ["diagnosis", "Diagnóstico"],
                  ["notes", "Accesorios / observaciones"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    required={["equipment", "fault"].includes(key)}
                    value={serviceForm[key]}
                    onChange={(e) => setServiceForm({ ...serviceForm, [key]: e.target.value })}
                  />
                ))}

                {[
                  ["laborUSD", "Mano de obra USD"],
                  ["partsUSD", "Repuestos USD"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    type="number"
                    min="0"
                    step="0.01"
                    value={serviceForm[key]}
                    onChange={(e) => setServiceForm({ ...serviceForm, [key]: e.target.value })}
                  />
                ))}

                <Field label="Estado">
                  <select
                    value={serviceForm.status}
                    onChange={(e) => setServiceForm({ ...serviceForm, status: e.target.value })}
                  >
                    {SERVICE_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </Field>

                <p className="cyan">
                  Total: {usd(Number(serviceForm.laborUSD || 0) + Number(serviceForm.partsUSD || 0))}
                </p>

                <button type="submit">
                  {editingServiceId ? "Actualizar orden" : "Guardar orden de servicio"}
                </button>

                {editingServiceId && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingServiceId(null);
                      setServiceForm(emptyService());
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </form>
            </Panel>

            <Panel title={`Órdenes de reparación (${db.services.length})`}>
              <input
                placeholder="Buscar por N° de orden, cliente, equipo, serial o estado..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                style={{ marginBottom: 15 }}
              />

              {!db.services.length && <p className="muted">No hay órdenes registradas.</p>}
              
              {db.services
                .filter((order) =>
                  `${order.number} ${order.client.name} ${order.equipment} ${order.brand} ${order.model} ${order.serial} ${order.fault} ${order.status}`
                    .toLowerCase()
                    .includes(serviceSearch.toLowerCase())
                )
                .map((order) => (
                  <article className="subpanel" key={order.id}>
                    <div className="row between wrap">
                      <span className="cyan break"><b>{order.number}</b></span>
                      <span>Status: <b>{order.status}</b></span>
                    </div>
                    <p><b>Cliente:</b> {order.client.name} | {order.equipment} ({order.brand} {order.model})</p>
                    <p><b>Falla:</b> {order.fault} <br /><b>Diagnóstico:</b> {order.diagnosis || "Pendiente"}</p>
                    <p className="cyan">Total Estimado: {usd(order.totalUSD)} / {bs(order.totalUSD * order.bcvRate)}</p>
                    <div className="row wrap">
                      <button
                        className="blue"
                        onClick={() => setPrinted({ type: "service", document: order })}
                      >
                        🖨️ Imprimir Nota / Factura
                      </button>
                      <button
                        onClick={() => {
                          setEditingServiceId(order.id);
                          setServiceForm({ ...order, clientId: String(order.client.id) });
                        }}
                      >
                        Editar
                      </button>
                      {isAdmin && (
                        <button className="danger" onClick={() => deleteService(order)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </Panel>
          </>
        )}

        {/* COBRANZA */}
        {activeTab === "cxc" && (
          <>
            <Panel title="Cobranza / Cuentas por cobrar">
              <h2>{usd(totalDebtUSD)} pendientes</h2>
              <p className="cyan">{bs(totalDebtUSD * rate)} a la tasa actual.</p>
            </Panel>
            <Panel title="Deudas e historial de abonos">
              {!accounts.length && <p className="muted">No hay cuentas pendientes.</p>}
              {accounts.map((account) => (
                <article className="subpanel" key={`${account.source}-${account.id}`}>
                  <div className="cyan break">{account.client.name} · {account.concept}</div>
                  <p>Deuda: {usd(account.amountUSD)} | Saldo Pendiente: <b>{usd(debtBalance(account))}</b></p>
                  {debtBalance(account) > 0 && (
                    <button onClick={() => openAbono(account)}>Registrar abono</button>
                  )}
                </article>
              ))}
            </Panel>
          </>
        )}

        {/* INVENTARIO */}
        {activeTab === "inventory" && (
          <>
            {isAdmin && (
              <Panel title={editingProductId ? "Editar producto" : "Registrar producto / servicio"}>
                <form className="grid three" onSubmit={saveProduct}>
                  {[
                    ["code", "Código / SKU"],
                    ["name", "Nombre *"],
                    ["category", "Categoría"],
                    ["unit", "Unidad"],
                  ].map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      required={key === "name"}
                      value={productForm[key]}
                      onChange={(e) => setProductForm({ ...productForm, [key]: e.target.value })}
                    />
                  ))}
                  {[
                    ["costUSD", "Costo USD"],
                    ["priceUSD", "Precio USD *"],
                    ["stock", "Existencias"],
                  ].map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      type="number"
                      step="0.01"
                      min="0"
                      required={key === "priceUSD"}
                      value={productForm[key]}
                      onChange={(e) => setProductForm({ ...productForm, [key]: e.target.value })}
                    />
                  ))}
                  <button type="submit">{editingProductId ? "Actualizar" : "Guardar"}</button>
                </form>
              </Panel>
            )}
            <Panel title="Inventario">
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.inventory.map((product) => (
                      <tr key={product.id}>
                        <td>{product.code}</td>
                        <td>{product.name}</td>
                        <td>{usd(product.priceUSD)}</td>
                        <td>{product.stock}</td>
                        <td>
                          {isAdmin && (
                            <button
                              className="secondary"
                              onClick={() => {
                                setEditingProductId(product.id);
                                setProductForm({ ...product });
                              }}
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {/* CLIENTES */}
        {activeTab === "clients" && (
          <div className="grid two">
            <Panel title="Registrar cliente">
              <form className="stack" onSubmit={saveClient}>
                {[
                  ["name", "Nombre / razón social *"],
                  ["rif", "RIF / Cédula *"],
                  ["phone", "Teléfono"],
                  ["address", "Dirección fiscal"],
                  ["notes", "Notas"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    required={["name", "rif"].includes(key)}
                    value={clientForm[key]}
                    onChange={(e) => setClientForm({ ...clientForm, [key]: e.target.value })}
                  />
                ))}
                <button type="submit">Guardar cliente</button>
              </form>
            </Panel>
            <Panel title={`Directorio (${db.clients.length})`}>
              {db.clients.map((client) => (
                <article className="subpanel" key={client.id}>
                  <div className="cyan">{client.name}</div>
                  <p>{client.rif} <br /> {client.phone} <br /> {client.address}</p>
                  {isAdmin && client.id !== 1 && (
                    <button className="danger" onClick={() => deleteClient(client)}>Eliminar</button>
                  )}
                </article>
              ))}
            </Panel>
          </div>
        )}

        {/* REPORTES */}
        {activeTab === "reports" && (
          <>
            <Panel title="Reportes internos X / Z">
              <h2>{usd(todayTotalUSD)}</h2>
              <div className="row wrap">
                <button className="blue" onClick={() => generateReport("X")}>Generar reporte X</button>
                {isAdmin && <button onClick={() => generateReport("Z")}>Ejecutar cierre Z</button>}
              </div>
            </Panel>

            <Panel title="Historial de facturas (Anular y Eliminar)">
              {!db.sales.length && <p className="muted">No hay ventas registradas.</p>}
              {db.sales.map((sale) => (
                <article className="subpanel" key={sale.id}>
                  <div className="row between wrap">
                    <div>
                      <div className="cyan break"><b>{sale.invoiceNumber}</b></div>
                      <p>{sale.client.name} · {dateText(sale.createdAt)} <br /> <b>{usd(sale.totalUSD)}</b> ({sale.status})</p>
                    </div>
                    <div className="row wrap">
                      <button className="secondary" onClick={() => setPrinted({ type: "sale", document: sale })}>
                        Ver factura
                      </button>
                      {isAdmin && sale.status !== "ANULADA" && (
                        <button className="blue" onClick={() => voidInvoice(sale)}>
                          ⚠️ Anular
                        </button>
                      )}
                      {isAdmin && (
                        <button className="danger" onClick={() => deleteInvoiceCompletely(sale)}>
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </Panel>
          </>
        )}

        {/* USUARIOS */}
        {activeTab === "users" && isAdmin && (
          <div className="grid two">
            <Panel title="Crear usuario">
              <form className="stack" onSubmit={createUser}>
                {[
                  ["name", "Nombre"],
                  ["username", "Usuario"],
                  ["pin", "PIN"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    required
                    type={key === "pin" ? "password" : "text"}
                    value={userForm[key]}
                    onChange={(e) => setUserForm({ ...userForm, [key]: e.target.value })}
                  />
                ))}
                <Field label="Rol">
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="cajero">Cajero</option>
                    <option value="admin">Administrador</option>
                  </select>
                </Field>
                <button type="submit">Crear usuario</button>
              </form>
            </Panel>
            <Panel title="Usuarios">
              {db.users.map((user) => (
                <div className="subpanel" key={user.id}>
                  <p>{user.name} · {user.username} ({user.role})</p>
                  {user.id !== currentUser.id && (
                    <button className="danger" onClick={() => deleteUser(user)}>Eliminar</button>
                  )}
                </div>
              ))}
            </Panel>
          </div>
        )}

        {/* CONFIGURACIÓN */}
        {activeTab === "settings" && (
          <Panel title="Empresa / Nomenclatura / Tasa BCV">
            <div className="grid two">
              {[
                ["storeName", "Nombre comercial"],
                ["rif", "RIF"],
                ["address", "Dirección"],
                ["phone", "Teléfono"],
                ["footerMessage", "Mensaje del ticket"],
                ["servicePrefix", "Prefijo Nomenclatura Servicio Técnico (Ej: ST, ORD)"],
              ].map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  disabled={!isAdmin}
                  value={db.config[key]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDb((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }));
                  }}
                />
              ))}
              <Field
                label="Tasa BCV manual"
                type="number"
                step="any"
                disabled={!isAdmin}
                value={db.config.bcvRate}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setDb((prev) => ({ ...prev, config: { ...prev.config, bcvRate: value } }));
                }}
              />
            </div>
          </Panel>
        )}
      </main>

      {posClientModalOpen && (
        <Modal title="Registrar nuevo cliente rápido" onClose={() => setPosClientModalOpen(false)}>
          <form className="stack" onSubmit={handleQuickClientSave}>
            {[
              ["name", "Nombre / razón social *"],
              ["rif", "RIF / Cédula *"],
              ["phone", "Teléfono"],
              ["address", "Dirección fiscal"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                required={["name", "rif"].includes(key)}
                value={posQuickClient[key]}
                onChange={(e) => setPosQuickClient({ ...posQuickClient, [key]: e.target.value })}
              />
            ))}
            <button type="submit">Guardar y Seleccionar</button>
          </form>
        </Modal>
      )}

      {checkoutOpen && (
        <Modal title="Cobro / Pagos mixtos" onClose={() => setCheckoutOpen(false)}>
          <div className="stack">
            <div className="subpanel row between">
              <span>{usd(totalUSD)}</span>
              <span className="cyan">{bs(totalVES)}</span>
            </div>
            {paymentRows.map((row, index) => (
              <div className="subpanel stack" key={index}>
                <div className="grid two">
                  <Field label="Método">
                    <select
                      value={row.method}
                      onChange={(e) => updatePayment(index, "method", e.target.value)}
                    >
                      {METHODS.map((m) => (<option key={m}>{m}</option>))}
                    </select>
                  </Field>
                  <Field label="Moneda">
                    <select
                      value={row.currency}
                      onChange={(e) => updatePayment(index, "currency", e.target.value)}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="VES">VES (Bs)</option>
                    </select>
                  </Field>
                </div>
                <Field
                  label="Monto aplicado"
                  type="number"
                  min="0"
                  step="any"
                  value={row.rawAmount}
                  onChange={(e) => updatePayment(index, "rawAmount", e.target.value)}
                />
                <button className="blue" onClick={() => completePaymentRow(index)}>
                  Completar restante
                </button>
              </div>
            ))}
            <div className="row between">
              <span>Saldo por cubrir</span>
              <span className="cyan">{usd(remainingUSD)}</span>
            </div>
            <button onClick={processPayment}>Confirmar e Imprimir Factura</button>
          </div>
        </Modal>
      )}

      {printed && (
        <Modal
          title={
            printed.type === "sale"
              ? "Factura Térmica"
              : printed.type === "standby"
              ? "Comanda en Espera"
              : "Nota de Servicio Técnico"
          }
          printable
          onClose={() => setPrinted(null)}
        >
          <h3>{db.config.storeName}</h3>
          <p>RIF: {db.config.rif} <br /> {db.config.address}</p>
          <hr />

          {printed.type !== "service" && (
            <>
              <p className="break">
                <b>{printed.document.invoiceNumber || printed.document.comandaNumber}</b><br />
                Fecha: {dateText(printed.document.createdAt)}
              </p>
              <p>
                Cliente: {printed.document.client.name} <br />
                RIF/CI: {printed.document.client.rif} <br />
                Cajero: {printed.document.cashier}
              </p>
              <hr />
              {printed.document.items.map((item) => (
                <div key={item.id}>
                  <p>{item.quantity}x {item.name} — {usd(item.quantity * item.priceUSD)}</p>
                </div>
              ))}
              <hr />
              <p>
                <b>Total USD: {usd(printed.document.totalUSD)}</b><br />
                <b>Total Bs: {bs(printed.document.totalVES)}</b> (Tasa: {printed.document.bcvRate})
              </p>
            </>
          )}

          {printed.type === "service" && (
            <>
              <p className="break">
                <b>ORDEN DE SERVICIO: {printed.document.number}</b><br />
                Fecha: {dateText(printed.document.createdAt)}
              </p>
              <p>
                <b>Cliente:</b> {printed.document.client.name} ({printed.document.client.rif})<br />
                <b>Equipo:</b> {printed.document.equipment} - {printed.document.brand} {printed.document.model}<br />
                <b>Serial:</b> {printed.document.serial || "N/A"}<br />
                <b>Falla:</b> {printed.document.fault}<br />
                <b>Diagnóstico:</b> {printed.document.diagnosis || "Pendiente"}<br />
                <b>Estatus:</b> {printed.document.status}
              </p>
              <hr />
              <p>
                Mano de Obra: {usd(printed.document.laborUSD)}<br />
                Repuestos: {usd(printed.document.partsUSD)}<br />
                <b>TOTAL ESTIMADO: {usd(printed.document.totalUSD)} ({bs(printed.document.totalUSD * printed.document.bcvRate)})</b>
              </p>
            </>
          )}

          <hr />
          <p style={{ textAlign: "center" }}>{db.config.footerMessage}</p>
        </Modal>
      )}
    </div>
  );
}
