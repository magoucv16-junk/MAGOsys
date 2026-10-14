import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  // --- BASE DE DATOS DE USUARIOS ---
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPin, setLoginPin] = useState("");

  const [newUserForm, setNewUserForm] = useState({ username: "", pin: "", name: "", role: "cajero" });
  const [activeTab, setActiveTab] = useState("pos"); 
  const [posMobileView, setPosMobileView] = useState("catalog"); 

  // Configuración de la Empresa / Factura
  const [config, setConfig] = useState({
    storeName: "MAGO SYS VENEZUELA C.A.",
    rif: "J-50123456-7",
    address: "Av. Principal, Local 4, Caracas",
    phone: "0412-1234567",
    footerMessage: "¡Gracias por su compra! Vuelva pronto.",
    bcvRate: 36.50
  });

  // Inventario General
  const [inventory, setInventory] = useState([]);

  // Clientes CRM y Buscador en POS
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearchText, setClientSearchText] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // ESTADO DE FACTURA PERSONALIZADA
  const [customInvoiceData, setCustomInvoiceData] = useState({
    name: "",
    rif: "",
    address: "",
    notes: ""
  });

  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modales y Estados de Pago
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentRows, setPaymentRows] = useState([
    { method: "Efectivo USD", currency: "USD", rawAmount: "" }
  ]);
  const [cashTenderedUSD, setCashTenderedUSD] = useState("");

  const [salesHistory, setSalesHistory] = useState([]);
  const [closedZReports, setClosedZReports] = useState([]);
  const [printedInvoice, setPrintedInvoice] = useState(null);
  const [printedComanda, setPrintedComanda] = useState(null);
  const [printedReportModal, setPrintedReportModal] = useState(null);
  const [activeComandas, setActiveComandas] = useState([]);

  // Formularios
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ code: "", name: "", category: "General", description: "", unit: "und", costUSD: "", priceUSD: "", stock: "" });
  const [clientForm, setClientForm] = useState({ name: "", rif: "", phone: "", address: "", notes: "" });

  // --- CARGA INICIAL DESDE SUPABASE ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Configuración
      const { data: configData } = await supabase.from('config').select('*').limit(1);
      if (configData && configData.length > 0) {
        setConfig({
          storeName: configData[0].store_name || "MAGO SYS VENEZUELA C.A.",
          rif: configData[0].rif || "J-50123456-7",
          address: configData[0].address || "Av. Principal, Local 4, Caracas",
          phone: configData[0].phone || "0412-1234567",
          footerMessage: configData[0].footer_message || "¡Gracias por su compra! Vuelva pronto.",
          bcvRate: configData[0].bcv_rate || 36.50
        });
      }

      // 2. Usuarios
      const { data: usrData } = await supabase.from('usuarios').select('*');
      if (usrData && usrData.length > 0) {
        setUsers(usrData);
      } else {
        setUsers([{ id: 1, username: "mago", pin: "1452", name: "Miguel González", role: "admin" }]);
      }

      // 3. Inventario
      const { data: prodData } = await supabase.from('productos').select('*');
      if (prodData) {
        setInventory(prodData.map(p => ({
          ...p,
          costUSD: p.cost_usd,
          priceUSD: p.price_usd
        })));
      }

      // 4. Clientes
      const { data: cliData } = await supabase.from('clientes').select('*');
      if (cliData && cliData.length > 0) {
        setClients(cliData);
        setSelectedClient(cliData[0]);
      } else {
        const defaultCli = { id: 1, name: "Cliente Genérico", rif: "V-00000000-0", phone: "0412-0000000", address: "Caracas, Distrito Capital", notes: "Sin notas" };
        setClients([defaultCli]);
        setSelectedClient(defaultCli);
      }

      // 5. Ventas
      const { data: salesData } = await supabase.from('ventas').select('*');
      if (salesData) {
        setSalesHistory(salesData.map(v => ({
          ...v,
          invoiceNumber: v.invoice_number,
          client: v.client_data,
          paymentRows: v.payment_rows,
          totalUSD: v.total_usd,
          totalVES: v.total_ves,
          timestamp: new Date(v.created_at).getTime(),
          date: new Date(v.created_at).toLocaleString()
        })));
      }

      // 6. Cierres Z
      const { data: zData } = await supabase.from('cierres_z').select('*');
      if (zData) {
        setClosedZReports(zData.map(z => ({
          ...z,
          zNumber: z.z_number,
          salesList: z.sales_list,
          totalInvoices: z.total_invoices,
          totalUSD: z.total_usd,
          totalVES: z.total_ves,
          admin: z.admin_name,
          date: new Date(z.created_at).toLocaleString()
        })));
      }
    } catch (err) {
      console.error("Error sincronizando con Supabase:", err);
    }
  };

  // --- LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username === loginUser && u.pin === loginPin);
    if (found) {
      setCurrentUser(found);
      setLoginUser("");
      setLoginPin("");
    } else {
      alert("❌ Credenciales incorrectas. Verifique su usuario y PIN.");
    }
  };

  // --- GESTIÓN DE USUARIOS ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (currentUser?.role !== "admin") return alert("❌ Solo Administradores.");
    if (!newUserForm.username || !newUserForm.pin || !newUserForm.name) return alert("Complete los campos obligatorios.");
    if (users.some(u => u.username === newUserForm.username)) return alert("El usuario ya existe.");

    const payload = {
      username: newUserForm.username.trim(),
      pin: newUserForm.pin,
      name: newUserForm.name,
      role: newUserForm.role || "cajero"
    };

    const { data, error } = await supabase.from('usuarios').insert([payload]).select();
    if (error) {
      return alert(`❌ Error al crear usuario en Supabase: ${error.message}`);
    }

    if (data && data[0]) {
      setUsers([...users, data[0]]);
    }
    setNewUserForm({ username: "", pin: "", name: "", role: "cajero" });
    alert("¡Usuario creado con éxito en la nube! 👤");
  };

  const deleteUser = async (id, username) => {
    if (currentUser?.role !== "admin") return alert("❌ Solo Administradores.");
    if (users.length <= 1) return alert("No puedes eliminar el último usuario.");
    if (username === "mago") return alert("No se puede eliminar al usuario principal.");

    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) return alert(`❌ Error al eliminar usuario: ${error.message}`);

    setUsers(users.filter(u => u.id !== id));
    alert("Usuario eliminado correctamente.");
  };

  // --- POS & CARRITO ---
  const addToCart = (product) => {
    if (product.stock <= 0) return alert("❌ ¡Producto sin stock disponible!");
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return alert("❌ Supera el stock actual");
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateCartQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        const prod = inventory.find(p => p.id === id);
        if (prod && newQty > prod.stock) return item;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  const totalUSD = cart.reduce((sum, item) => sum + (item.priceUSD * item.quantity), 0);
  const totalVES = totalUSD * config.bcvRate;

  // --- ABRIR CHECKOUT Y CARGAR DATOS DE FACTURA ---
  const handleOpenCheckout = () => {
    if (!selectedClient) {
      setSelectedClient(clients[0] || { name: "Cliente Genérico", rif: "V-00000000-0", address: "Caracas" });
    }
    setPaymentRows([{ method: "Efectivo USD", currency: "USD", rawAmount: totalUSD.toFixed(2) }]);
    setCustomInvoiceData({
      name: selectedClient?.name || "Cliente Genérico",
      rif: selectedClient?.rif || "V-00000000-0",
      address: selectedClient?.address || "Caracas, Distrito Capital",
      notes: ""
    });
    setIsCheckoutOpen(true);
  };

  // --- COMANDA EN STANDBY ---
  const handleGenerateComanda = async () => {
    if (cart.length === 0) return alert("❌ El carrito está vacío.");
    
    for (const cartItem of cart) {
      const prod = inventory.find(p => p.id === cartItem.id);
      if (prod) {
        const newStock = Math.max(0, prod.stock - cartItem.quantity);
        await supabase.from('productos').update({ stock: newStock }).eq('id', prod.id);
      }
    }

    setInventory(inventory.map(prod => {
      const cartItem = cart.find(ci => ci.id === prod.id);
      return cartItem ? { ...prod, stock: prod.stock - cartItem.quantity } : prod;
    }));

    const comandaNumber = `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
    const comandaPayload = {
      comanda_number: comandaNumber,
      client_data: selectedClient,
      cashier: currentUser.name,
      items: cart,
      total_usd: parseFloat(totalUSD.toFixed(2)),
      total_ves: parseFloat(totalVES.toFixed(2)),
      status: "STANDBY"
    };

    const { data } = await supabase.from('comandas').insert([comandaPayload]).select();

    const newComanda = {
      id: data && data[0] ? data[0].id : Date.now(),
      comandaNumber,
      date: new Date().toLocaleString(),
      client: selectedClient,
      cashier: currentUser.name,
      items: [...cart],
      totalUSD,
      totalVES,
      status: "STANDBY"
    };

    setActiveComandas([newComanda, ...activeComandas]);
    setPrintedComanda(newComanda);
    setCart([]);
    setPosMobileView("catalog");
  };

  const loadComandaToCart = (comanda) => {
    setCart([...comanda.items]);
    setSelectedClient(comanda.client);
    setActiveComandas(activeComandas.filter(c => c.id !== comanda.id));
  };

  // --- PAGOS MIXTOS MULTI-MONEDA ($ / Bs) ---
  const addPaymentRow = () => {
    setPaymentRows([...paymentRows, { method: "Pago Móvil", currency: "VES", rawAmount: "" }]);
  };

  const updatePaymentRow = (index, field, value) => {
    const updated = [...paymentRows];
    updated[index][field] = value;
    setPaymentRows(updated);
  };

  const handleCompleteRow = (index) => {
    const otherRowsPaidUSD = paymentRows.reduce((acc, row, i) => {
      if (i === index) return acc;
      return acc + getRowAmountInUSD(row);
    }, 0);

    const currentRemainingUSD = Math.max(0, totalUSD - otherRowsPaidUSD);
    const targetRow = paymentRows[index];

    let amountToSet = targetRow.currency === "VES" ? currentRemainingUSD * config.bcvRate : currentRemainingUSD;

    const updated = [...paymentRows];
    updated[index].rawAmount = amountToSet.toFixed(2);
    setPaymentRows(updated);
  };

  const removePaymentRow = (index) => {
    setPaymentRows(paymentRows.filter((_, i) => i !== index));
  };

  const getRowAmountInUSD = (row) => {
    const val = parseFloat(row.rawAmount) || 0;
    if (row.currency === "VES") {
      return config.bcvRate > 0 ? val / config.bcvRate : 0;
    }
    return val;
  };

  const totalPaidUSD = paymentRows.reduce((acc, row) => acc + getRowAmountInUSD(row), 0);
  const remainingUSD = totalUSD - totalPaidUSD;

  const processPayment = async () => {
    if (Math.abs(remainingUSD) > 0.05 && totalPaidUSD < totalUSD) {
      return alert("❌ El monto pagado es menor al total de la factura. Complete el pago mixto.");
    }

    const formattedPaymentRows = paymentRows.map(row => {
      const amountUSD = getRowAmountInUSD(row);
      const amountVES = amountUSD * config.bcvRate;
      return {
        method: row.method,
        currency: row.currency,
        rawAmount: parseFloat(row.rawAmount) || 0,
        amountUSD,
        amountVES
      };
    });

    let changeInfo = "";
    const cashRow = formattedPaymentRows.find(r => r.method === "Efectivo USD" && r.currency === "USD");
    const tendered = parseFloat(cashTenderedUSD) || 0;
    if (cashRow && tendered > cashRow.amountUSD) {
      const changeUSD = tendered - cashRow.amountUSD;
      const changeVES = changeUSD * config.bcvRate;
      changeInfo = `Recibido: $${tendered.toFixed(2)} | Vuelto: $${changeUSD.toFixed(2)} (Bs. ${changeVES.toFixed(2)})`;
    }

    const finalClientData = {
      name: customInvoiceData.name || selectedClient.name,
      rif: customInvoiceData.rif || selectedClient.rif,
      address: customInvoiceData.address || selectedClient.address,
      notes: customInvoiceData.notes || ""
    };

    const invoiceNumber = `FAC-${Math.floor(100000 + Math.random() * 900000)}`;

    const ventaPayload = {
      invoice_number: invoiceNumber,
      client_data: finalClientData,
      cashier: currentUser.name,
      items: cart,
      total_usd: parseFloat(totalUSD.toFixed(2)),
      total_ves: parseFloat(totalVES.toFixed(2)),
      payment_rows: formattedPaymentRows,
      change_info: changeInfo,
      bcv_rate_used: parseFloat(config.bcvRate),
      status: "COMPLETADA"
    };

    const { data, error } = await supabase.from('ventas').insert([ventaPayload]).select();
    if (error) {
      return alert(`❌ Error al guardar venta en Supabase: ${error.message}`);
    }

    for (const item of cart) {
      const prod = inventory.find(p => p.id === item.id);
      if (prod) {
        const newStock = Math.max(0, prod.stock - item.quantity);
        await supabase.from('productos').update({ stock: newStock }).eq('id', prod.id);
      }
    }

    const newSale = {
      id: data && data[0] ? data[0].id : Date.now(),
      invoiceNumber,
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      client: finalClientData,
      cashier: currentUser.name,
      items: [...cart],
      totalUSD,
      totalVES,
      paymentRows: formattedPaymentRows,
      changeInfo,
      status: "COMPLETADA"
    };

    setSalesHistory([newSale, ...salesHistory]);
    setPrintedInvoice(newSale);
    setCart([]);
    setIsCheckoutOpen(false);
    setCashTenderedUSD("");
    fetchInitialData();
  };

  // --- REPORTES X Y Z ---
  const todayStr = new Date().toDateString();
  const todaySales = salesHistory.filter(s => new Date(s.timestamp).toDateString() === todayStr && s.status === "COMPLETADA");
  const totalTodayUSD = todaySales.reduce((acc, s) => acc + s.totalUSD, 0);
  const totalTodayVES = todaySales.reduce((acc, s) => acc + s.totalVES, 0);

  const handleGenerateReportX = () => {
    setPrintedReportModal({
      type: "REPORTE X (Corte Parcial del Día)",
      date: new Date().toLocaleString(),
      salesList: [...todaySales],
      totalInvoices: todaySales.length,
      totalUSD: totalTodayUSD,
      totalVES: totalTodayVES,
      cashier: currentUser.name
    });
  };

  const handleGenerateReportZ = async () => {
    if (currentUser.role !== "admin") return alert("❌ Solo el Administrador puede ejecutar el Cierre Z diario.");
    if (todaySales.length === 0) return alert("ℹ️ No hay ventas registradas hoy para consolidar en el Cierre Z.");
    
    if (window.confirm("⚠️ ¿Estás seguro de realizar el Cierre Z? Esto consolidará las ventas de la jornada.")) {
      const zNumber = `Z-${Math.floor(10000 + Math.random() * 90000)}`;
      const zPayload = {
        z_number: zNumber,
        sales_list: todaySales,
        total_invoices: todaySales.length,
        total_usd: parseFloat(totalTodayUSD.toFixed(2)),
        total_ves: parseFloat(totalTodayVES.toFixed(2)),
        admin_name: currentUser.name
      };

      const { data, error } = await supabase.from('cierres_z').insert([zPayload]).select();
      if (error) return alert(`❌ Error al guardar Cierre Z: ${error.message}`);

      const zReport = {
        id: data && data[0] ? data[0].id : Date.now(),
        type: "REPORTE Z (Cierre de Caja Diario)",
        zNumber,
        date: new Date().toLocaleString(),
        salesList: [...todaySales],
        totalInvoices: todaySales.length,
        totalUSD: totalTodayUSD,
        totalVES: totalTodayVES,
        admin: currentUser.name
      };

      setClosedZReports([zReport, ...closedZReports]);
      setPrintedReportModal(zReport);
      alert("✅ ¡Cierre Z ejecutado y guardado en Supabase!");
    }
  };

  // --- GESTIÓN PRODUCTOS Y CLIENTES EN SUPABASE ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (currentUser.role !== "admin") return alert("❌ Solo Administradores.");
    if (!productForm.name || !productForm.priceUSD) return alert("Nombre y Precio obligatorios");

    const payload = {
      code: productForm.code || `PROD-${Date.now().toString().slice(-4)}`,
      name: productForm.name,
      category: productForm.category || "General",
      description: productForm.description || "",
      unit: productForm.unit || "und",
      cost_usd: parseFloat(productForm.costUSD) || 0,
      price_usd: parseFloat(productForm.priceUSD) || 0,
      stock: parseFloat(productForm.stock) || 0
    };

    if (editingProduct) {
      const { error } = await supabase.from('productos').update(payload).eq('id', editingProduct.id);
      if (error) return alert(`❌ Error al actualizar producto: ${error.message}`);

      setInventory(inventory.map(p => p.id === editingProduct.id ? { ...p, ...productForm, costUSD: payload.cost_usd, priceUSD: payload.price_usd, stock: payload.stock } : p));
      setEditingProduct(null);
      alert("¡Producto actualizado en Supabase! ✏️");
    } else {
      const { data, error } = await supabase.from('productos').insert([payload]).select();
      if (error) return alert(`❌ Error al guardar producto: ${error.message}`);

      if (data && data[0]) {
        setInventory([...inventory, { ...data[0], costUSD: data[0].cost_usd, priceUSD: data[0].price_usd }]);
      }
      alert("¡Producto guardado y sincronizado en Supabase! ☁️");
    }
    setProductForm({ code: "", name: "", category: "General", description: "", unit: "und", costUSD: "", priceUSD: "", stock: "" });
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.rif) return alert("Nombre y RIF/Cédula son obligatorios");

    const payload = {
      name: clientForm.name,
      rif: clientForm.rif.trim().toUpperCase(),
      phone: clientForm.phone || "",
      address: clientForm.address || "",
      notes: clientForm.notes || ""
    };

    const { data, error } = await supabase.from('clientes').insert([payload]).select();
    if (error) {
      if (error.code === '23505') return alert("⚠️ El RIF/Cédula ya está registrado en la base de datos.");
      return alert(`❌ Error al guardar cliente: ${error.message}`);
    }

    if (data && data[0]) {
      setClients([...clients, data[0]]);
      setSelectedClient(data[0]);
    }
    setClientForm({ name: "", rif: "", phone: "", address: "", notes: "" });
    alert("¡Cliente registrado y sincronizado en Supabase! 👥");
  };

  const handleSaveConfig = async () => {
    if (currentUser.role !== "admin") return alert("❌ Solo Administradores.");

    const configPayload = {
      id: 1,
      store_name: config.storeName,
      rif: config.rif,
      address: config.address,
      phone: config.phone,
      footer_message: config.footerMessage,
      bcv_rate: parseFloat(config.bcvRate) || 36.50
    };

    const { error } = await supabase.from('config').upsert(configPayload);
    if (error) return alert(`❌ Error al guardar configuración: ${error.message}`);

    alert("✅ ¡Configuración guardada y sincronizada en Supabase!");
  };

  const filteredClientsForSearch = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearchText.toLowerCase()) || 
    c.rif.toLowerCase().includes(clientSearchText.toLowerCase())
  );

  // --- LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div style={{ display: "flex", height: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "20px" }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "30px", width: "100%", maxWidth: "380px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <span style={{ backgroundColor: "#9333ea", color: "#fff", padding: "8px 16px", borderRadius: "10px", fontWeight: "900", fontSize: "22px", letterSpacing: "1px" }}>MAGO SYS</span>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "10px" }}>Sistema POS Multiplataforma (Supabase)</div>
          </div>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Usuario</label>
              <input type="text" placeholder="Ingrese su usuario" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} style={{ width: "100%", padding: "14px", background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", color: "#fff", boxSizing: "border-box", fontSize: "16px", outline: "none" }} required />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>PIN de Acceso</label>
              <input type="password" placeholder="****" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} style={{ width: "100%", padding: "14px", background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", color: "#fff", boxSizing: "border-box", fontSize: "16px", outline: "none" }} required />
            </div>
            <button type="submit" style={{ background: "#9333ea", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", marginTop: "10px" }}>Iniciar Sesión</button>
          </form>
        </div>
      </div>
    );
  }

  // --- APP PRINCIPAL ---
  return (
    <div style={{ display: "flex", flexDirection: window.innerWidth < 768 ? "column" : "row", height: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "sans-serif", overflow: "hidden" }}>
      
      {window.innerWidth >= 768 ? (
        <div style={{ width: "260px", backgroundColor: "#1e293b", borderRight: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "20px", zIndex: 50 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px" }}>
              <span style={{ backgroundColor: "#9333ea", color: "#fff", padding: "6px 12px", borderRadius: "8px", fontWeight: "900", fontSize: "18px" }}>MAGO SYS</span>
              <button onClick={() => setCurrentUser(null)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Salir</button>
            </div>

            <div style={{ background: "#0f172a", padding: "10px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Usuario activo:</div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#c084fc" }}>{currentUser.name}</div>
              <div style={{ fontSize: "11px", color: currentUser.role === "admin" ? "#22c55e" : "#f59e0b", marginTop: "2px" }}>Rol: {currentUser.role.toUpperCase()}</div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button onClick={() => setActiveTab("pos")} style={{ padding: "12px", textAlign: "left", background: activeTab === "pos" ? "#9333ea" : "transparent", color: activeTab === "pos" ? "#fff" : "#cbd5e1", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>🛒 Caja / POS</button>
              <button onClick={() => setActiveTab("inventory")} style={{ padding: "12px", textAlign: "left", background: activeTab === "inventory" ? "#9333ea" : "transparent", color: activeTab === "inventory" ? "#fff" : "#cbd5e1", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>📦 Inventario</button>
              <button onClick={() => setActiveTab("clients")} style={{ padding: "12px", textAlign: "left", background: activeTab === "clients" ? "#9333ea" : "transparent", color: activeTab === "clients" ? "#fff" : "#cbd5e1", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>👥 Clientes (CRM)</button>
              <button onClick={() => setActiveTab("reports")} style={{ padding: "12px", textAlign: "left", background: activeTab === "reports" ? "#9333ea" : "transparent", color: activeTab === "reports" ? "#fff" : "#cbd5e1", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>📊 Reportes X y Z</button>
              {currentUser.role === "admin" && (
                <button onClick={() => setActiveTab("users")} style={{ padding: "12px", textAlign: "left", background: activeTab === "users" ? "#9333ea" : "transparent", color: activeTab === "users" ? "#fff" : "#cbd5e1", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>🔐 Usuarios</button>
              )}
              <button onClick={() => setActiveTab("settings")} style={{ padding: "12px", textAlign: "left", background: activeTab === "settings" ? "#9333ea" : "transparent", color: activeTab === "settings" ? "#fff" : "#cbd5e1", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>⚙️ Ajustes y Factura</button>
            </div>
          </div>

          <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Tasa BCV:</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#38bdf8" }}>Bs. {config.bcvRate}</div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#1e293b", padding: "12px 15px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "bold", color: "#c084fc" }}>MAGO SYS</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{currentUser.name} ({currentUser.role.toUpperCase()})</div>
          </div>
          <button onClick={() => setCurrentUser(null)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Salir</button>
        </div>
      )}

      {/* CONTENIDO */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", height: window.innerWidth < 768 ? "calc(100vh - 130px)" : "100vh" }}>
        
        {window.innerWidth >= 768 && (
          <div style={{ height: "60px", background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 25px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#cbd5e1" }}>
              {activeTab === "pos" && "Terminal POS, Comandas y Facturación"}
              {activeTab === "inventory" && "Gestión de Inventario (Supabase)"}
              {activeTab === "clients" && "Directorio de Clientes y CRM"}
              {activeTab === "reports" && "Cierres y Reportes Fiscales X & Z"}
              {activeTab === "users" && "Control de Usuarios y Roles"}
              {activeTab === "settings" && "Configuración de Empresa y Ticket"}
            </h3>
            <span style={{ fontSize: "12px", color: "#c084fc", background: "#0f172a", padding: "6px 12px", borderRadius: "6px", border: "1px solid #334155", fontWeight: "bold" }}>
              {config.storeName}
            </span>
          </div>
        )}

        <div style={{ flex: 1, padding: window.innerWidth < 768 ? "10px" : "20px", overflowY: "auto", backgroundColor: "#0b0f19" }}>
          
          {/* POS & COMANDAS */}
          {activeTab === "pos" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
              
              {window.innerWidth < 768 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#1e293b", padding: "6px", borderRadius: "8px" }}>
                  <button onClick={() => setPosMobileView("catalog")} style={{ background: posMobileView === "catalog" ? "#9333ea" : "transparent", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px" }}>📦 Catálogo</button>
                  <button onClick={() => setPosMobileView("cart")} style={{ background: posMobileView === "cart" ? "#9333ea" : "transparent", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px" }}>🛒 Orden ({cart.reduce((a,b)=>a+b.quantity,0)})</button>
                </div>
              )}

              {/* SECCIÓN STANDBY / COMANDAS EN ESPERA */}
              {activeComandas.length > 0 && (
                <div style={{ background: "#1e293b", border: "1px solid #f59e0b", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", overflowX: "auto" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#f59e0b", whiteSpace: "nowrap" }}>⌛ COMANDAS EN STANDBY ({activeComandas.length}):</span>
                  {activeComandas.map(cmd => (
                    <button key={cmd.id} onClick={() => loadComandaToCart(cmd)} style={{ background: "#0f172a", color: "#38bdf8", border: "1px solid #38bdf8", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>
                      {cmd.comandaNumber} — {cmd.client.name.split(' ')[0]} (${cmd.totalUSD.toFixed(2)})
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1.1fr 1.4fr", gap: "15px", flex: 1, overflow: "hidden" }}>
                
                {window.innerWidth >= 768 || posMobileView === "cart" ? (
                  <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", display: "flex", flexDirection: "column", padding: "12px", overflow: "hidden", height: window.innerWidth < 768 ? "100%" : "auto" }}>
                    
                    {/* BUSCADOR DE CLIENTE EN POS */}
                    <div style={{ marginBottom: "10px", background: "#0f172a", padding: "10px", borderRadius: "8px", border: "1px solid #334155", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "bold" }}>CLIENTE ACTUAL:</span>
                        <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "bold" }}>{selectedClient?.name} ({selectedClient?.rif})</span>
                      </div>
                      
                      <div style={{ position: "relative" }}>
                        <input 
                          type="text" 
                          placeholder="🔍 Escriba para buscar cliente..." 
                          value={clientSearchText} 
                          onChange={(e) => { setClientSearchText(e.target.value); setShowClientDropdown(true); }}
                          onFocus={() => setShowClientDropdown(true)}
                          style={{ width: "100%", padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
                        />

                        {showClientDropdown && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1e293b", border: "1px solid #38bdf8", borderRadius: "6px", zIndex: 200, maxHeight: "160px", overflowY: "auto", marginTop: "3px", boxShadow: "0 8px 16px rgba(0,0,0,0.6)" }}>
                            {filteredClientsForSearch.length > 0 ? (
                              filteredClientsForSearch.map(c => (
                                <div 
                                  key={c.id} 
                                  onClick={() => { setSelectedClient(c); setClientSearchText(""); setShowClientDropdown(false); }}
                                  style={{ padding: "8px 10px", borderBottom: "1px solid #334155", cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "#0f172a"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#c084fc" }}>{c.name}</div>
                                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>{c.rif} — {c.phone}</div>
                                </div>
                              ))
                            ) : (
                              <div style={{ padding: "10px", fontSize: "11px", color: "#fca5a5", textAlign: "center" }}>No se encontraron coincidencias</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <h4 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#cbd5e1", borderBottom: "1px solid #334155", paddingBottom: "4px" }}>Orden Actual / Carrito</h4>
                    
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {cart.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#64748b", marginTop: "40px", fontSize: "13px" }}>Carrito vacío. Seleccione productos.</div>
                      ) : (
                        cart.map(item => (
                          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", padding: "8px 10px", borderRadius: "6px", borderLeft: "3px solid #9333ea" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "12px", fontWeight: "bold" }}>{item.name}</div>
                              <div style={{ fontSize: "10px", color: "#38bdf8" }}>${item.priceUSD.toFixed(2)} c/u</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "bold", color: "#c084fc" }}>${(item.priceUSD * item.quantity).toFixed(2)}</span>
                              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                <button onClick={() => updateCartQty(item.id, -1)} style={{ background: "#334155", color: "#fff", border: "none", width: "22px", height: "22px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>-</button>
                                <span style={{ fontSize: "12px", fontWeight: "bold", minWidth: "14px", textAlign: "center" }}>{item.quantity}</span>
                                <button onClick={() => updateCartQty(item.id, 1)} style={{ background: "#334155", color: "#fff", border: "none", width: "22px", height: "22px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>+</button>
                                <button onClick={() => removeFromCart(item.id)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "4px 6px", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}>X</button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ borderTop: "1px solid #334155", paddingTop: "10px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
                        <span>Total USD:</span>
                        <span style={{ fontWeight: "bold", color: "#fff", fontSize: "14px" }}>${totalUSD.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
                        <span>Total VES:</span>
                        <span style={{ fontWeight: "bold", color: "#38bdf8", fontSize: "14px" }}>Bs. {totalVES.toFixed(2)}</span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                        <button disabled={cart.length === 0} onClick={handleGenerateComanda} style={{ background: cart.length === 0 ? "#334155" : "#0284c7", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", fontSize: "12px", cursor: cart.length === 0 ? "not-allowed" : "pointer" }}>
                          📝 Comanda (Standby)
                        </button>
                        <button disabled={cart.length === 0} onClick={handleOpenCheckout} style={{ background: cart.length === 0 ? "#334155" : "#9333ea", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", fontSize: "12px", cursor: cart.length === 0 ? "not-allowed" : "pointer" }}>
                          💵 Cobrar y Facturar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {window.innerWidth >= 768 || posMobileView === "catalog" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%", overflow: "hidden" }}>
                    <input type="text" placeholder="Buscar producto o servicio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", outline: "none", fontSize: "13px" }} />

                    <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "repeat(2, 1fr)" : "repeat(2, 1fr)", gap: "10px", alignContent: "start" }}>
                      {inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                        <div key={product.id} onClick={() => addToCart(product)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "12px", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                              <span>{product.code}</span>
                              <span style={{ color: "#38bdf8" }}>Stock: {product.stock}</span>
                            </div>
                            <div style={{ fontWeight: "bold", fontSize: "13px", marginTop: "6px" }}>{product.name}</div>
                          </div>
                          <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <div>
                              <div style={{ fontSize: "15px", fontWeight: "bold", color: "#c084fc" }}>${product.priceUSD.toFixed(2)}</div>
                              <div style={{ fontSize: "10px", color: "#94a3b8" }}>Bs. {(product.priceUSD * config.bcvRate).toFixed(2)}</div>
                            </div>
                            <span style={{ background: "#7e22ce", color: "#fff", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold" }}>+</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

              </div>
            </div>
          )}

          {/* INVENTARIO */}
          {activeTab === "inventory" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#c084fc", fontSize: "14px" }}>{editingProduct ? `Editando: ${editingProduct.name}` : "Registrar Producto / Servicio en Nube"}</h4>
                <form onSubmit={handleSaveProduct} style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "repeat(3, 1fr)", gap: "10px" }}>
                  <input type="text" placeholder="Código / SKU" value={productForm.code} onChange={(e) => setProductForm({...productForm, code: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <input type="text" placeholder="Nombre *" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="text" placeholder="Categoría" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <input type="number" step="0.01" placeholder="Costo ($)" value={productForm.costUSD} onChange={(e) => setProductForm({...productForm, costUSD: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <input type="number" step="0.01" placeholder="Precio ($) *" value={productForm.priceUSD} onChange={(e) => setProductForm({...productForm, priceUSD: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="number" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm({...productForm, stock: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <button type="submit" style={{ gridColumn: window.innerWidth < 768 ? "span 1" : "span 3", background: currentUser.role === "admin" ? "#9333ea" : "#475569", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: currentUser.role === "admin" ? "pointer" : "not-allowed" }}>
                    {editingProduct ? "Actualizar Producto" : "Guardar en Nube ☁️"}
                  </button>
                </form>
              </div>

              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#0f172a", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
                      <th style={{ padding: "10px" }}>Código</th>
                      <th style={{ padding: "10px" }}>Nombre</th>
                      <th style={{ padding: "10px" }}>Precio</th>
                      <th style={{ padding: "10px" }}>Stock</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(prod => (
                      <tr key={prod.id} style={{ borderBottom: "1px solid #334155" }}>
                        <td style={{ padding: "10px", color: "#38bdf8" }}>{prod.code}</td>
                        <td style={{ padding: "10px", fontWeight: "bold" }}>{prod.name}</td>
                        <td style={{ padding: "10px", color: "#c084fc" }}>${prod.priceUSD.toFixed(2)}</td>
                        <td style={{ padding: "10px" }}>{prod.stock}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <button onClick={() => { if(currentUser.role !== "admin") alert("Solo Admin"); else { setEditingProduct(prod); setProductForm({ code: prod.code, name: prod.name, category: prod.category || "General", description: prod.description || "", unit: prod.unit || "und", costUSD: prod.costUSD, priceUSD: prod.priceUSD, stock: prod.stock }); } }} style={{ background: "#334155", color: "#c084fc", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px" }}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CLIENTES */}
          {activeTab === "clients" && (
            <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr", gap: "15px" }}>
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#c084fc", fontSize: "14px" }}>Registrar Cliente / Empresa (B2B / B2C)</h4>
                <form onSubmit={handleSaveClient} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input type="text" placeholder="Nombre o Razón Social *" value={clientForm.name} onChange={(e) => setClientForm({...clientForm, name: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="text" placeholder="RIF o Cédula (Ej. J-40123456-8) *" value={clientForm.rif} onChange={(e) => setClientForm({...clientForm, rif: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="text" placeholder="Teléfono de contacto" value={clientForm.phone} onChange={(e) => setClientForm({...clientForm, phone: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <input type="text" placeholder="Dirección Fiscal Completa *" value={clientForm.address} onChange={(e) => setClientForm({...clientForm, address: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <button type="submit" style={{ background: "#9333ea", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Guardar Cliente</button>
                </form>
              </div>
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Directorio ({clients.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                  {clients.map(cli => (
                    <div key={cli.id} style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", border: "1px solid #334155", fontSize: "12px" }}>
                      <div style={{ fontWeight: "bold", color: "#38bdf8" }}>{cli.name}</div>
                      <div>RIF: {cli.rif}</div>
                      <div style={{ color: "#94a3b8" }}>Dir: {cli.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REPORTES X Y Z */}
          {activeTab === "reports" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr", gap: "12px" }}>
                
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ margin: "0 0 5px 0", color: "#38bdf8", fontSize: "14px" }}>📈 Reporte X (Corte Parcial del Día)</h4>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "10px" }}>Acumulado de ventas de hoy sin cerrar caja.</div>
                    <div style={{ fontSize: "22px", fontWeight: "bold" }}>${totalTodayUSD.toFixed(2)}</div>
                    <div style={{ fontSize: "13px", color: "#38bdf8" }}>Bs. {totalTodayVES.toFixed(2)} ({todaySales.length} facturas hoy)</div>
                  </div>
                  <button onClick={handleGenerateReportX} style={{ marginTop: "15px", background: "#0284c7", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                    🖨️ Generar / Imprimir Reporte X
                  </button>
                </div>

                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ margin: "0 0 5px 0", color: "#c084fc", fontSize: "14px" }}>📊 Reporte Z (Cierre de Caja Diario)</h4>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "10px" }}>Consolidado total de la jornada y cierre fiscal.</div>
                    <div style={{ fontSize: "22px", fontWeight: "bold" }}>${totalTodayUSD.toFixed(2)}</div>
                    <div style={{ fontSize: "13px", color: "#c084fc" }}>Cierres Z realizados: {closedZReports.length}</div>
                  </div>
                  <button onClick={handleGenerateReportZ} style={{ marginTop: "15px", background: "#9333ea", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                    🔒 Ejecutar Cierre Z Diario
                  </button>
                </div>

              </div>

              {closedZReports.length > 0 && (
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Historial de Cierres Z Consolidados</h4>
                  {closedZReports.map(z => (
                    <div key={z.id} style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <div>
                        <span style={{ fontWeight: "bold", color: "#c084fc" }}>{z.zNumber}</span> — {z.type}
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{z.date} | Admin: {z.admin}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontWeight: "bold" }}>${z.totalUSD.toFixed(2)}</span>
                        <button onClick={() => setPrintedReportModal(z)} style={{ background: "#334155", color: "#fff", border: "none", padding: "5px 8px", borderRadius: "4px" }}>Ver</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Historial de Facturas Emitidas</h4>
                {salesHistory.map(sale => (
                  <div key={sale.id} style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                    <div>
                      <span style={{ fontWeight: "bold", color: "#38bdf8" }}>{sale.invoiceNumber}</span> - {sale.client.name}
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{sale.date}</div>
                    </div>
                    <button onClick={() => setPrintedInvoice(sale)} style={{ background: "#334155", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px" }}>Ver Factura</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USUARIOS */}
          {activeTab === "users" && currentUser.role === "admin" && (
            <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr", gap: "15px" }}>
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#c084fc", fontSize: "14px" }}>Crear Usuario / Cajero</h4>
                <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input type="text" placeholder="Nombre *" value={newUserForm.name} onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="text" placeholder="Usuario *" value={newUserForm.username} onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="password" placeholder="PIN *" value={newUserForm.pin} onChange={(e) => setNewUserForm({...newUserForm, pin: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <select value={newUserForm.role} onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }}>
                    <option value="cajero">Cajero</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <button type="submit" style={{ background: "#9333ea", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Crear</button>
                </form>
              </div>

              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Usuarios ({users.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {users.map(u => (
                    <div key={u.id} style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #334155", fontSize: "12px" }}>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#38bdf8" }}>{u.name} ({u.role})</div>
                      </div>
                      {u.username !== "mago" && (
                        <button onClick={() => deleteUser(u.id, u.username)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "6px 10px", borderRadius: "4px" }}>Eliminar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AJUSTES */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "500px" }}>
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#c084fc", fontSize: "15px" }}>⚙️ Personalización de Ticket y Empresa</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Nombre Comercial</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.storeName} onChange={(e) => setConfig({...config, storeName: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>RIF</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.rif} onChange={(e) => setConfig({...config, rif: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Dirección</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.address} onChange={(e) => setConfig({...config, address: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Teléfono</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.phone} onChange={(e) => setConfig({...config, phone: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Mensaje al Pie del Ticket</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.footerMessage} onChange={(e) => setConfig({...config, footerMessage: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Tasa Oficial BCV ($)</label>
                    <input type="number" step="0.01" disabled={currentUser.role !== "admin"} value={config.bcvRate} onChange={(e) => setConfig({...config, bcvRate: parseFloat(e.target.value) || 0})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #38bdf8", borderRadius: "6px", color: "#38bdf8", fontWeight: "bold" }} />
                  </div>
                </div>

                <button onClick={handleSaveConfig} style={{ width: "100%", background: currentUser.role === "admin" ? "#9333ea" : "#475569", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", marginTop: "20px", cursor: currentUser.role === "admin" ? "pointer" : "not-allowed" }}>
                  Guardar Configuración
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* BARRA INFERIOR MÓVIL */}
      {window.innerWidth < 768 && (
        <div style={{ height: "60px", background: "#1e293b", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100 }}>
          <button onClick={() => setActiveTab("pos")} style={{ background: "transparent", border: "none", color: activeTab === "pos" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}><span>🛒</span> POS</button>
          <button onClick={() => setActiveTab("inventory")} style={{ background: "transparent", border: "none", color: activeTab === "inventory" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}><span>📦</span> Stock</button>
          <button onClick={() => setActiveTab("clients")} style={{ background: "transparent", border: "none", color: activeTab === "clients" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}><span>👥</span> Clientes</button>
          <button onClick={() => setActiveTab("reports")} style={{ background: "transparent", border: "none", color: activeTab === "reports" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}><span>📊</span> Reportes</button>
          {currentUser.role === "admin" && (
            <button onClick={() => setActiveTab("users")} style={{ background: "transparent", border: "none", color: activeTab === "users" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}><span>🔐</span> Users</button>
          )}
          <button onClick={() => setActiveTab("settings")} style={{ background: "transparent", border: "none", color: activeTab === "settings" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}><span>⚙️</span> Ajustes</button>
        </div>
      )}

      {/* MODAL PAGO MIXTO CON EDICIÓN PERSONALIZADA DE FACTURA */}
      {isCheckoutOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "15px" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "20px", width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: 0, color: "#c084fc", fontSize: "16px" }}>Cobro y Pagos Mixtos ($ / Bs)</h3>
            
            <div style={{ background: "#0f172a", padding: "10px", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>Total: ${totalUSD.toFixed(2)}</span>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#38bdf8" }}>Bs. {totalVES.toFixed(2)}</span>
              </div>
            </div>

            {/* SECCIÓN DATOS EDITABLES PARA FACTURA PERSONALIZADA */}
            <div style={{ background: "#0f172a", padding: "10px", borderRadius: "8px", border: "1px solid #334155", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#38bdf8" }}>✏️ DATOS PARA FACTURA PERSONALIZADA:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div>
                  <label style={{ fontSize: "9px", color: "#94a3b8", display: "block" }}>Nombre / Razón Social:</label>
                  <input 
                    type="text" 
                    value={customInvoiceData.name} 
                    onChange={(e) => setCustomInvoiceData({...customInvoiceData, name: e.target.value})}
                    style={{ width: "100%", padding: "6px", background: "#1e293b", border: "1px solid #334155", borderRadius: "4px", color: "#fff", fontSize: "11px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "9px", color: "#94a3b8", display: "block" }}>RIF / Cédula:</label>
                  <input 
                    type="text" 
                    value={customInvoiceData.rif} 
                    onChange={(e) => setCustomInvoiceData({...customInvoiceData, rif: e.target.value})}
                    style={{ width: "100%", padding: "6px", background: "#1e293b", border: "1px solid #334155", borderRadius: "4px", color: "#fff", fontSize: "11px", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "9px", color: "#94a3b8", display: "block" }}>Dirección Fiscal:</label>
                <input 
                  type="text" 
                  value={customInvoiceData.address} 
                  onChange={(e) => setCustomInvoiceData({...customInvoiceData, address: e.target.value})}
                  style={{ width: "100%", padding: "6px", background: "#1e293b", border: "1px solid #334155", borderRadius: "4px", color: "#fff", fontSize: "11px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "9px", color: "#94a3b8", display: "block" }}>Nota / Observación Especial:</label>
                <input 
                  type="text" 
                  placeholder="Ej. Nro Orden de Compra #1234, Dpto Compras..." 
                  value={customInvoiceData.notes} 
                  onChange={(e) => setCustomInvoiceData({...customInvoiceData, notes: e.target.value})}
                  style={{ width: "100%", padding: "6px", background: "#1e293b", border: "1px solid #334155", borderRadius: "4px", color: "#fff", fontSize: "11px", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#cbd5e1" }}>Desglose de Formas de Pago:</div>
            
            {paymentRows.map((row, index) => {
              const eqUSD = getRowAmountInUSD(row);
              const eqVES = eqUSD * config.bcvRate;
              return (
                <div key={index} style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#0f172a", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <select 
                      value={row.method} 
                      onChange={(e) => updatePaymentRow(index, "method", e.target.value)} 
                      style={{ flex: 1.1, padding: "8px 4px", background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "6px", fontSize: "11px" }}
                    >
                      <option value="Efectivo USD">Efectivo ($)</option>
                      <option value="Efectivo VES">Efectivo (Bs)</option>
                      <option value="Pago Móvil">Pago Móvil (Bs)</option>
                      <option value="Punto de Venta">Punto de Venta (Bs)</option>
                      <option value="Zelle">Zelle ($)</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>

                    <select 
                      value={row.currency} 
                      onChange={(e) => updatePaymentRow(index, "currency", e.target.value)} 
                      style={{ width: "80px", padding: "8px 4px", background: "#334155", color: "#38bdf8", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", textAlign: "center" }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="VES">VES (Bs)</option>
                    </select>

                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Monto" 
                      value={row.rawAmount === 0 ? "" : row.rawAmount} 
                      onChange={(e) => updatePaymentRow(index, "rawAmount", e.target.value)} 
                      style={{ width: "75px", padding: "8px", background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "6px", fontSize: "13px", fontWeight: "bold" }} 
                    />

                    <button 
                      type="button" 
                      onClick={() => handleCompleteRow(index)} 
                      title="Completar con el restante exacto"
                      style={{ background: "#0284c7", color: "#fff", border: "none", padding: "8px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      Completar
                    </button>

                    {paymentRows.length > 1 && (
                      <button onClick={() => removePaymentRow(index)} style={{ background: "#7f1d1d", color: "#fff", border: "none", padding: "6px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>X</button>
                    )}
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8", paddingLeft: "2px" }}>
                    Equivalente: <b>${eqUSD.toFixed(2)}</b> (Bs. {eqVES.toFixed(2)})
                  </div>
                </div>
              );
            })}

            <button onClick={addPaymentRow} style={{ background: "#334155", color: "#cbd5e1", border: "none", padding: "8px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
              + Agregar otro método de pago
            </button>

            <div style={{ background: "#0f172a", padding: "8px", borderRadius: "6px", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span>Restante por cubrir:</span>
              <span style={{ fontWeight: "bold", color: remainingUSD <= 0.01 ? "#22c55e" : "#fca5a5" }}>${remainingUSD.toFixed(2)} (Bs. {(remainingUSD * config.bcvRate).toFixed(2)})</span>
            </div>

            {paymentRows.some(r => r.method === "Efectivo USD" && r.currency === "USD") && (
              <div>
                <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "3px" }}>Efectivo USD entregado por cliente ($):</label>
                <input 
                  type="number" 
                  step="any" 
                  placeholder="Ej. 20.00" 
                  value={cashTenderedUSD} 
                  onChange={(e) => setCashTenderedUSD(e.target.value)} 
                  style={{ width: "100%", padding: "8px", background: "#0f172a", color: "#38bdf8", border: "1px solid #334155", borderRadius: "6px", fontSize: "13px", fontWeight: "bold" }} 
                />
                {cashTenderedUSD && (
                  <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "4px" }}>
                    Vuelto: ${ (parseFloat(cashTenderedUSD) - getRowAmountInUSD(paymentRows.find(r=>r.method==="Efectivo USD" && r.currency==="USD"))).toFixed(2) } | En Bs: Bs. { (((parseFloat(cashTenderedUSD) - getRowAmountInUSD(paymentRows.find(r=>r.method==="Efectivo USD" && r.currency==="USD")))) * config.bcvRate).toFixed(2) }
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, background: "#334155", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Cancelar</button>
              <button onClick={processPayment} style={{ flex: 1, background: "#9333ea", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Confirmar Factura</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMANDA */}
      {printedComanda && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "15px" }}>
          <div style={{ background: "#fff", color: "#000", borderRadius: "8px", padding: "20px", width: "100%", maxWidth: "320px", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "8px" }}>
              <h3 style={{ margin: "0 0 2px 0", fontSize: "16px" }}>*** COMANDA / PEDIDO ***</h3>
              <div style={{ fontSize: "12px", fontWeight: "bold" }}>{config.storeName}</div>
              <div style={{ fontSize: "10px" }}>{printedComanda.comandaNumber}</div>
              <div style={{ fontSize: "9px" }}>{printedComanda.date}</div>
            </div>
            <div style={{ fontSize: "11px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
              <div><b>CLIENTE:</b> {printedComanda.client.name}</div>
              <div><b>RIF/CI:</b> {printedComanda.client.rif}</div>
              <div><b>DIR:</b> {printedComanda.client.address}</div>
              <div><b>ATENDIÓ:</b> {printedComanda.cashier}</div>
            </div>
            <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", fontSize: "11px" }}>
              {printedComanda.items.map((item, idx) => (
                <div key={idx} style={{ marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                  <span>{item.quantity}x {item.name}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: "10px", fontWeight: "bold", marginTop: "5px" }}>
              PREPARAR PEDIDO
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button onClick={() => window.print()} style={{ flex: 1, background: "#000", color: "#fff", border: "none", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>Imprimir</button>
              <button onClick={() => setPrintedComanda(null)} style={{ flex: 1, background: "#cbd5e1", color: "#000", border: "none", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TICKET REPORTE X O Z */}
      {printedReportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "15px" }}>
          <div style={{ background: "#fff", color: "#000", borderRadius: "8px", padding: "20px", width: "100%", maxWidth: "360px", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "8px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "15px" }}>{config.storeName}</h3>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>RIF: {config.rif}</div>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#9333ea", marginTop: "4px" }}>{printedReportModal.type}</div>
              {printedReportModal.zNumber && <div style={{ fontSize: "11px", fontWeight: "bold" }}>NRO: {printedReportModal.zNumber}</div>}
              <div style={{ fontSize: "9px" }}>{printedReportModal.date}</div>
            </div>

            <div style={{ fontSize: "10px", borderBottom: "1px dashed #000", paddingBottom: "8px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>DETALLE DE VENTAS / FACTURAS:</div>
              {printedReportModal.salesList && printedReportModal.salesList.length > 0 ? (
                printedReportModal.salesList.map((sale, idx) => (
                  <div key={idx} style={{ marginTop: "6px", borderBottom: "1px dotted #ccc", paddingBottom: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                      <span>{sale.invoiceNumber}</span>
                      <span>${sale.totalUSD.toFixed(2)} (Bs. {sale.totalVES.toFixed(2)})</span>
                    </div>
                    <div>Cliente: {sale.client.name} ({sale.client.rif})</div>
                    <div>Cajero: {sale.cashier}</div>
                    <div style={{ color: "#444", fontSize: "9px" }}>
                      Pagos: {sale.paymentRows.map(p => `${p.method} (${p.currency}): ${p.currency === 'USD' ? '$' + p.rawAmount.toFixed(2) : 'Bs. ' + p.rawAmount.toFixed(2)}`).join(' | ')}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", color: "#666", fontStyle: "italic" }}>Sin transacciones registradas.</div>
              )}
            </div>

            <div style={{ fontSize: "11px", borderBottom: "1px dashed #000", paddingBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total Facturas:</span><span><b>{printedReportModal.totalInvoices}</b></span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}><span>TOTAL GENERAL USD:</span><span><b>${printedReportModal.totalUSD.toFixed(2)}</b></span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>TOTAL GENERAL VES:</span><span><b>Bs. {printedReportModal.totalVES.toFixed(2)}</b></span></div>
              <div style={{ fontSize: "9px", color: "#555", textAlign: "center", marginTop: "6px" }}>Tasa BCV Referencia: Bs. {config.bcvRate}</div>
            </div>

            <div style={{ textAlign: "center", fontSize: "9px", color: "#555" }}>
              {printedReportModal.zNumber ? "CIERRE FISCAL DIARIO CONSOLIDADO" : "CORTE PARCIAL DE AUDITORÍA"}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => window.print()} style={{ flex: 1, background: "#000", color: "#fff", border: "none", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>Imprimir</button>
              <button onClick={() => setPrintedReportModal(null)} style={{ flex: 1, background: "#cbd5e1", color: "#000", border: "none", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FACTURA FINAL */}
      {printedInvoice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "15px" }}>
          <div style={{ background: "#fff", color: "#000", borderRadius: "8px", padding: "20px", width: "100%", maxWidth: "320px", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "8px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>{config.storeName}</h3>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>RIF: {config.rif}</div>
              <div style={{ fontSize: "9px" }}>{config.address}</div>
              <div style={{ fontSize: "9px" }}>Telf: {config.phone}</div>
              <div style={{ fontSize: "10px", marginTop: "4px", fontWeight: "bold" }}>FACTURA: {printedInvoice.invoiceNumber}</div>
              <div style={{ fontSize: "9px" }}>{printedInvoice.date}</div>
            </div>
            <div style={{ fontSize: "10px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
              <div><b>CLIENTE:</b> {printedInvoice.client.name}</div>
              <div><b>RIF/CI:</b> {printedInvoice.client.rif}</div>
              <div><b>DIRECCIÓN:</b> {printedInvoice.client.address}</div>
              {printedInvoice.client.notes && <div><b>NOTA:</b> {printedInvoice.client.notes}</div>}
              <div><b>CAJERO:</b> {printedInvoice.cashier}</div>
            </div>
            <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", fontSize: "10px" }}>
              {printedInvoice.items.map((item, idx) => (
                <div key={idx} style={{ marginTop: "3px" }}>
                  <div>{item.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{item.quantity} x ${item.priceUSD.toFixed(2)}</span>
                    <span><b>${(item.priceUSD * item.quantity).toFixed(2)}</b></span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "11px", borderBottom: "1px dashed #000", paddingBottom: "8px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "2px" }}>FORMAS DE PAGO:</div>
              {printedInvoice.paymentRows.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <span>{r.method} ({r.currency}):</span>
                  <span>{r.currency === 'USD' ? `$${r.rawAmount.toFixed(2)}` : `Bs. ${r.rawAmount.toFixed(2)}`}</span>
                </div>
              ))}
              {printedInvoice.changeInfo && (
                <div style={{ fontSize: "10px", color: "#333", marginTop: "4px", borderTop: "1px dotted #ccc", paddingTop: "3px" }}>
                  {printedInvoice.changeInfo}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", borderTop: "1px dashed #000", paddingTop: "4px" }}><span>TOTAL USD:</span><span><b>${printedInvoice.totalUSD.toFixed(2)}</b></span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>TOTAL VES:</span><span><b>Bs. {printedInvoice.totalVES.toFixed(2)}</b></span></div>
              <div style={{ fontSize: "9px", color: "#555", textAlign: "center", marginTop: "4px" }}>Tasa BCV: Bs. {config.bcvRate}</div>
            </div>
            <div style={{ textAlign: "center", fontSize: "9px", color: "#555" }}>
              {config.footerMessage}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => window.print()} style={{ flex: 1, background: "#000", color: "#fff", border: "none", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>Imprimir</button>
              <button onClick={() => setPrintedInvoice(null)} style={{ flex: 1, background: "#cbd5e1", color: "#000", border: "none", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
