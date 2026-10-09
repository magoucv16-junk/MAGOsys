import React, { useState } from "react";

export default function App() {
  // --- BASE DE DATOS DE USUARIOS (MAGO COMO ADMIN PRINCIPAL OCULTO) ---
  const [users, setUsers] = useState([
    { id: 1, username: "mago", pin: "1452", name: "Miguel González", role: "admin" },
    { id: 2, username: "cajero1", pin: "5678", name: "María Cajera", role: "cajero" }
  ]);

  const [currentUser, setCurrentUser] = useState(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPin, setLoginPin] = useState("");

  const [newUserForm, setNewUserForm] = useState({ username: "", pin: "", name: "", role: "cajero" });
  const [activeTab, setActiveTab] = useState("pos"); // 'pos', 'inventory', 'clients', 'reports', 'users', 'settings'
  const [posMobileView, setPosMobileView] = useState("catalog"); // 'catalog' o 'cart' para teléfonos en POS

  // Configuración de la Empresa / Factura
  const [config, setConfig] = useState({
    storeName: "MAGO SYS VENEZUELA C.A.",
    rif: "J-50123456-7",
    address: "Av. Principal, Local 4, Caracas",
    phone: "0412-1234567",
    bcvRate: 36.50
  });

  // Inventario General
  const [inventory, setInventory] = useState([
    { id: 1, code: "PROD-001", name: "Servicio de Consultoría / Asesoría", category: "Servicios", description: "Asesoría profesional personalizada", unit: "hora", costUSD: 10.00, priceUSD: 25.00, stock: 100 },
    { id: 2, code: "PROD-002", name: "Café Americano 12oz", category: "Alimentos y Bebidas", description: "Café caliente recién pasado", unit: "und", costUSD: 0.80, priceUSD: 1.50, stock: 50 },
    { id: 3, code: "PROD-003", name: "Queso Paisa Artesanal", category: "Víveres", description: "Queso semicurado", unit: "kg", costUSD: 4.00, priceUSD: 5.80, stock: 25 }
  ]);

  // Clientes CRM
  const [clients, setClients] = useState([
    { id: 1, name: "Cliente Genérico", rif: "V-00000000-0", phone: "0412-0000000", address: "General", notes: "Sin notas" },
    { id: 2, name: "María Pérez", rif: "V-15123456-7", phone: "0414-1234567", address: "Av. Principal", notes: "Cliente frecuente" }
  ]);
  const [selectedClient, setSelectedClient] = useState(clients[0]);

  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo USD");
  const [salesHistory, setSalesHistory] = useState([]);
  const [printedInvoice, setPrintedInvoice] = useState(null);

  // Formularios
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ code: "", name: "", category: "General", description: "", unit: "und", costUSD: "", priceUSD: "", stock: "" });
  const [clientForm, setClientForm] = useState({ name: "", rif: "", phone: "", address: "", notes: "" });

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
  const handleCreateUser = (e) => {
    e.preventDefault();
    if (currentUser?.role !== "admin") return alert("❌ Solo Administradores.");
    if (!newUserForm.username || !newUserForm.pin || !newUserForm.name) return alert("Complete los campos obligatorios.");
    if (users.some(u => u.username === newUserForm.username)) return alert("El usuario ya existe.");

    setUsers([...users, { id: Date.now(), ...newUserForm }]);
    setNewUserForm({ username: "", pin: "", name: "", role: "cajero" });
    alert("¡Usuario creado con éxito!");
  };

  const deleteUser = (id) => {
    if (currentUser?.role !== "admin") return alert("❌ Solo Administradores.");
    if (users.length <= 1) return alert("No puedes eliminar el último usuario.");
    setUsers(users.filter(u => u.id !== id));
  };

  // --- POS ---
  const addToCart = (product) => {
    if (product.stock <= 0) return alert("¡Producto sin stock disponible!");
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return alert("Supera el stock actual");
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

  const processPayment = () => {
    setInventory(inventory.map(prod => {
      const cartItem = cart.find(ci => ci.id === prod.id);
      return cartItem ? { ...prod, stock: prod.stock - cartItem.quantity } : prod;
    }));

    const newSale = {
      id: Date.now(),
      invoiceNumber: `FAC-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      client: selectedClient,
      cashier: currentUser.name,
      items: [...cart],
      totalUSD,
      totalVES,
      paymentMethod,
      status: "COMPLETADA"
    };

    setSalesHistory([newSale, ...salesHistory]);
    setPrintedInvoice(newSale);
    setCart([]);
    setIsCheckoutOpen(false);
    setPosMobileView("catalog");
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (currentUser.role !== "admin") return alert("❌ Solo Administradores.");
    if (!productForm.name || !productForm.priceUSD) return alert("Nombre y Precio obligatorios");

    if (editingProduct) {
      setInventory(inventory.map(p => p.id === editingProduct.id ? { ...p, ...productForm, costUSD: parseFloat(productForm.costUSD) || 0, priceUSD: parseFloat(productForm.priceUSD) || 0, stock: parseFloat(productForm.stock) || 0 } : p));
      setEditingProduct(null);
    } else {
      setInventory([...inventory, { id: Date.now(), code: productForm.code || `PROD-${Date.now().toString().slice(-4)}`, ...productForm, costUSD: parseFloat(productForm.costUSD) || 0, priceUSD: parseFloat(productForm.priceUSD) || 0, stock: parseFloat(productForm.stock) || 0 }]);
    }
    setProductForm({ code: "", name: "", category: "General", description: "", unit: "und", costUSD: "", priceUSD: "", stock: "" });
  };

  const handleSaveClient = (e) => {
    e.preventDefault();
    if (!clientForm.name) return alert("Nombre obligatorio");
    setClients([...clients, { id: Date.now(), ...clientForm }]);
    setClientForm({ name: "", rif: "", phone: "", address: "", notes: "" });
    alert("¡Cliente registrado!");
  };

  // Reportes X y Z
  const todayStr = new Date().toDateString();
  const todaySales = salesHistory.filter(s => new Date(s.timestamp).toDateString() === todayStr && s.status === "COMPLETADA");
  const totalTodayUSD = todaySales.reduce((acc, s) => acc + s.totalUSD, 0);
  const totalTodayVES = todaySales.reduce((acc, s) => acc + s.totalVES, 0);

  const monthStr = new Date().getMonth();
  const monthSales = salesHistory.filter(s => new Date(s.timestamp).getMonth() === monthStr && s.status === "COMPLETADA");
  const totalMonthUSD = monthSales.reduce((acc, s) => acc + s.totalUSD, 0);
  const totalMonthVES = monthSales.reduce((acc, s) => acc + s.totalVES, 0);

  // --- PANTALLA LOGIN ---
  if (!currentUser) {
    return (
      <div style={{ display: "flex", height: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "20px" }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "30px", width: "100%", maxWidth: "380px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <span style={{ backgroundColor: "#9333ea", color: "#fff", padding: "8px 16px", borderRadius: "10px", fontWeight: "900", fontSize: "22px", letterSpacing: "1px" }}>MAGO SYS</span>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "10px" }}>Sistema POS Multiplataforma</div>
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
            <button type="submit" style={{ background: "#9333ea", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", marginTop: "10px", boxShadow: "0 4px 12px rgba(147, 51, 234, 0.4)" }}>Iniciar Sesión</button>
          </form>
        </div>
      </div>
    );
  }

  // --- APP PRINCIPAL OPTIMIZADA PARA MÓVIL Y ESCRITORIO ---
  return (
    <div style={{ display: "flex", flexDirection: window.innerWidth < 768 ? "column" : "row", height: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "sans-serif", overflow: "hidden" }}>
      
      {/* BARRA LATERAL (Escritorio) / HEADER (Móvil) */}
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
        // ENCABEZADO MÓVIL SUPERIOR COMPACTO
        <div style={{ background: "#1e293b", padding: "12px 15px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "bold", color: "#c084fc" }}>MAGO SYS</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{currentUser.name} ({currentUser.role.toUpperCase()})</div>
          </div>
          <button onClick={() => setCurrentUser(null)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Salir</button>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", height: window.innerWidth < 768 ? "calc(100vh - 130px)" : "100vh" }}>
        
        {window.innerWidth >= 768 && (
          <div style={{ height: "60px", background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 25px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#cbd5e1" }}>
              {activeTab === "pos" && "Terminal de Ventas y Facturación (POS)"}
              {activeTab === "inventory" && "Gestión de Inventario"}
              {activeTab === "clients" && "Directorio de Clientes y CRM"}
              {activeTab === "reports" && "Reportes Financieros X & Z"}
              {activeTab === "users" && "Control de Usuarios y Roles"}
              {activeTab === "settings" && "Configuración de Empresa y Factura"}
            </h3>
            <span style={{ fontSize: "12px", color: "#c084fc", background: "#0f172a", padding: "6px 12px", borderRadius: "6px", border: "1px solid #334155", fontWeight: "bold" }}>
              {config.storeName}
            </span>
          </div>
        )}

        <div style={{ flex: 1, padding: window.innerWidth < 768 ? "10px" : "20px", overflowY: "auto", backgroundColor: "#0b0f19" }}>
          
          {/* VISTA POS / CAJA */}
          {activeTab === "pos" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
              
              {/* Selector de vistas en móvil (Catálogo vs Carrito) */}
              {window.innerWidth < 768 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#1e293b", padding: "6px", borderRadius: "8px" }}>
                  <button onClick={() => setPosMobileView("catalog")} style={{ background: posMobileView === "catalog" ? "#9333ea" : "transparent", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px" }}>
                    📦 Catálogo
                  </button>
                  <button onClick={() => setPosMobileView("cart")} style={{ background: posMobileView === "cart" ? "#9333ea" : "transparent", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", position: "relative" }}>
                    🛒 Orden ({cart.reduce((a,b)=>a+b.quantity,0)})
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1.1fr 1.4fr", gap: "15px", flex: 1, overflow: "hidden" }}>
                
                {/* PANEL CARRITO */}
                {window.innerWidth >= 768 || posMobileView === "cart" ? (
                  <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", display: "flex", flexDirection: "column", padding: "14px", overflow: "hidden", height: window.innerWidth < 768 ? "100%" : "auto" }}>
                    
                    <div style={{ marginBottom: "10px", background: "#0f172a", padding: "8px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "3px" }}>
                        <span>CLIENTE:</span>
                        <button onClick={() => setActiveTab("clients")} style={{ background: "transparent", border: "none", color: "#c084fc", fontSize: "11px", cursor: "pointer" }}>+ Nuevo</button>
                      </div>
                      <select value={selectedClient.id} onChange={(e) => { const cli = clients.find(c => c.id === Number(e.target.value)); if (cli) setSelectedClient(cli); }} style={{ width: "100%", padding: "8px", background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "6px", fontSize: "13px" }}>
                        {clients.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.rif})</option>))}
                      </select>
                    </div>

                    <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>Detalle de Venta</h4>
                    
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {cart.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#64748b", marginTop: "50px", fontSize: "13px" }}>Carrito vacío. Toca productos para agregarlos.</div>
                      ) : (
                        cart.map(item => (
                          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", padding: "10px", borderRadius: "8px", borderLeft: "4px solid #9333ea" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "13px", fontWeight: "bold" }}>{item.name}</div>
                              <div style={{ fontSize: "11px", color: "#38bdf8" }}>${item.priceUSD.toFixed(2)} c/u</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "bold", color: "#c084fc" }}>${(item.priceUSD * item.quantity).toFixed(2)}</span>
                              <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                <button onClick={() => updateCartQty(item.id, -1)} style={{ background: "#334155", color: "#fff", border: "none", width: "26px", height: "26px", borderRadius: "6px", fontWeight: "bold" }}>-</button>
                                <span style={{ fontSize: "13px", fontWeight: "bold", minWidth: "15px", textAlign: "center" }}>{item.quantity}</span>
                                <button onClick={() => updateCartQty(item.id, 1)} style={{ background: "#334155", color: "#fff", border: "none", width: "26px", height: "26px", borderRadius: "6px", fontWeight: "bold" }}>+</button>
                                <button onClick={() => removeFromCart(item.id)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "5px 8px", borderRadius: "6px", fontSize: "11px" }}>X</button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ borderTop: "1px solid #334155", paddingTop: "12px", marginTop: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#94a3b8" }}>
                        <span>Total USD:</span>
                        <span style={{ fontWeight: "bold", color: "#fff", fontSize: "15px" }}>${totalUSD.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#94a3b8", marginBottom: "12px" }}>
                        <span>Total VES:</span>
                        <span style={{ fontWeight: "bold", color: "#38bdf8", fontSize: "15px" }}>Bs. {totalVES.toFixed(2)}</span>
                      </div>
                      <button disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)} style={{ width: "100%", background: cart.length === 0 ? "#334155" : "#9333ea", color: "#fff", border: "none", padding: "14px", borderRadius: "8px", fontWeight: "bold", fontSize: "15px", cursor: cart.length === 0 ? "not-allowed" : "pointer" }}>
                        Cobrar (${totalUSD.toFixed(2)})
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* PANEL CATÁLOGO */}
                {window.innerWidth >= 768 || posMobileView === "catalog" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%", overflow: "hidden" }}>
                    <input type="text" placeholder="Buscar producto o servicio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "12px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", outline: "none", fontSize: "14px" }} />

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
                <h4 style={{ margin: "0 0 10px 0", color: "#c084fc", fontSize: "14px" }}>{editingProduct ? `Editando: ${editingProduct.name}` : "Registrar Producto / Servicio"}</h4>
                <form onSubmit={handleSaveProduct} style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "repeat(3, 1fr)", gap: "10px" }}>
                  <input type="text" placeholder="Código / SKU" value={productForm.code} onChange={(e) => setProductForm({...productForm, code: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <input type="text" placeholder="Nombre *" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="text" placeholder="Categoría" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <input type="number" step="0.01" placeholder="Costo ($)" value={productForm.costUSD} onChange={(e) => setProductForm({...productForm, costUSD: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <input type="number" step="0.01" placeholder="Precio ($) *" value={productForm.priceUSD} onChange={(e) => setProductForm({...productForm, priceUSD: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="number" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm({...productForm, stock: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <button type="submit" style={{ gridColumn: window.innerWidth < 768 ? "span 1" : "span 3", background: currentUser.role === "admin" ? "#9333ea" : "#475569", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: currentUser.role === "admin" ? "pointer" : "not-allowed" }}>
                    {editingProduct ? "Actualizar Producto" : "Guardar Producto"}
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
                          <button onClick={() => { if(currentUser.role !== "admin") alert("Solo Admin"); else setEditingProduct(prod); setProductForm(prod); }} style={{ background: "#334155", color: "#c084fc", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px" }}>Editar</button>
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
                <h4 style={{ margin: "0 0 10px 0", color: "#c084fc", fontSize: "14px" }}>Nuevo Cliente (CRM)</h4>
                <form onSubmit={handleSaveClient} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input type="text" placeholder="Nombre *" value={clientForm.name} onChange={(e) => setClientForm({...clientForm, name: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} required />
                  <input type="text" placeholder="Cédula o RIF" value={clientForm.rif} onChange={(e) => setClientForm({...clientForm, rif: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <input type="text" placeholder="Teléfono" value={clientForm.phone} onChange={(e) => setClientForm({...clientForm, phone: e.target.value})} style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  <button type="submit" style={{ background: "#9333ea", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Guardar Cliente</button>
                </form>
              </div>
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Directorio ({clients.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                  {clients.map(cli => (
                    <div key={cli.id} style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", border: "1px solid #334155", fontSize: "13px" }}>
                      <div style={{ fontWeight: "bold" }}>{cli.name} ({cli.rif})</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Tel: {cli.phone}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REPORTES X Y Z */}
          {activeTab === "reports" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                  <h4 style={{ margin: "0 0 5px 0", color: "#38bdf8", fontSize: "13px" }}>📈 Reporte X (Diario)</h4>
                  <div style={{ fontSize: "20px", fontWeight: "bold" }}>${totalTodayUSD.toFixed(2)}</div>
                  <div style={{ fontSize: "13px", color: "#38bdf8" }}>Bs. {totalTodayVES.toFixed(2)}</div>
                </div>
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                  <h4 style={{ margin: "0 0 5px 0", color: "#c084fc", fontSize: "13px" }}>📊 Reporte Z (Mensual)</h4>
                  <div style={{ fontSize: "20px", fontWeight: "bold" }}>${totalMonthUSD.toFixed(2)}</div>
                  <div style={{ fontSize: "13px", color: "#c084fc" }}>Bs. {totalMonthVES.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Historial de Ventas</h4>
                {salesHistory.map(sale => (
                  <div key={sale.id} style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                    <div>
                      <span style={{ fontWeight: "bold", color: "#38bdf8" }}>{sale.invoiceNumber}</span> - {sale.client.name}
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{sale.date}</div>
                    </div>
                    <button onClick={() => setPrintedInvoice(sale)} style={{ background: "#334155", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px" }}>Ticket</button>
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
                        <button onClick={() => deleteUser(u.id)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "6px 10px", borderRadius: "4px" }}>Eliminar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AJUSTES Y CONFIGURACIÓN DE FACTURA */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "500px" }}>
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#c084fc", fontSize: "15px" }}>⚙️ Datos de la Empresa y Facturación</h4>
                
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
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Tasa Oficial BCV ($)</label>
                    <input type="number" step="0.01" disabled={currentUser.role !== "admin"} value={config.bcvRate} onChange={(e) => setConfig({...config, bcvRate: parseFloat(e.target.value) || 0})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #38bdf8", borderRadius: "6px", color: "#38bdf8", fontWeight: "bold" }} />
                  </div>
                </div>

                <button onClick={() => alert("✅ ¡Configuración guardada!")} style={{ width: "100%", background: currentUser.role === "admin" ? "#9333ea" : "#475569", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", marginTop: "20px", cursor: currentUser.role === "admin" ? "pointer" : "not-allowed" }}>
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN INFERIOR PARA TELÉFONOS (MÓVIL) */}
      {window.innerWidth < 768 && (
        <div style={{ height: "60px", background: "#1e293b", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100 }}>
          <button onClick={() => setActiveTab("pos")} style={{ background: "transparent", border: "none", color: activeTab === "pos" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}>
            <span>🛒</span> POS
          </button>
          <button onClick={() => setActiveTab("inventory")} style={{ background: "transparent", border: "none", color: activeTab === "inventory" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}>
            <span>📦</span> Stock
          </button>
          <button onClick={() => setActiveTab("clients")} style={{ background: "transparent", border: "none", color: activeTab === "clients" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}>
            <span>👥</span> Clientes
          </button>
          <button onClick={() => setActiveTab("reports")} style={{ background: "transparent", border: "none", color: activeTab === "reports" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}>
            <span>📊</span> Reportes
          </button>
          {currentUser.role === "admin" && (
            <button onClick={() => setActiveTab("users")} style={{ background: "transparent", border: "none", color: activeTab === "users" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}>
              <span>🔐</span> Users
            </button>
          )}
          <button onClick={() => setActiveTab("settings")} style={{ background: "transparent", border: "none", color: activeTab === "settings" ? "#c084fc" : "#94a3b8", fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", fontWeight: "bold" }}>
            <span>⚙️</span> Ajustes
          </button>
        </div>
      )}

      {/* MODAL PAGO */}
      {isCheckoutOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "15px" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "20px", width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: 0, color: "#c084fc", fontSize: "16px" }}>Cobrar Orden</h3>
            <div style={{ background: "#0f172a", padding: "10px", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cliente: {selectedClient.name}</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginTop: "4px" }}>${totalUSD.toFixed(2)}</div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#38bdf8" }}>Bs. {totalVES.toFixed(2)}</div>
            </div>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "14px" }}>
              <option value="Efectivo USD">Efectivo ($)</option>
              <option value="Pago Móvil">Pago Móvil (VES)</option>
              <option value="Punto de Venta">Punto de Venta</option>
              <option value="Zelle">Zelle ($)</option>
            </select>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, background: "#334155", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Cancelar</button>
              <button onClick={processPayment} style={{ flex: 1, background: "#9333ea", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TICKET */}
      {printedInvoice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "15px" }}>
          <div style={{ background: "#fff", color: "#000", borderRadius: "8px", padding: "20px", width: "100%", maxWidth: "320px", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "8px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>{config.storeName}</h3>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>RIF: {config.rif}</div>
              <div style={{ fontSize: "9px" }}>{config.address}</div>
              <div style={{ fontSize: "9px" }}>Telf: {config.phone}</div>
              <div style={{ fontSize: "10px", marginTop: "4px" }}>TICKET: {printedInvoice.invoiceNumber}</div>
              <div style={{ fontSize: "9px" }}>{printedInvoice.date}</div>
            </div>
            <div style={{ fontSize: "10px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
              <div><b>CLIENTE:</b> {printedInvoice.client.name}</div>
              <div><b>RIF/CI:</b> {printedInvoice.client.rif}</div>
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
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>MÉTODO PAGO:</span><span><b>{printedInvoice.paymentMethod}</b></span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}><span>TOTAL USD:</span><span><b>${printedInvoice.totalUSD.toFixed(2)}</b></span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>TOTAL VES:</span><span><b>Bs. {printedInvoice.totalVES.toFixed(2)}</b></span></div>
              <div style={{ fontSize: "9px", color: "#555", textAlign: "center", marginTop: "4px" }}>Tasa BCV: Bs. {config.bcvRate}</div>
            </div>
            <div style={{ textAlign: "center", fontSize: "9px", color: "#555" }}>
              ¡Gracias por su compra!<br/>MAGO SYS VENEZUELA
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => window.print()} style={{ flex: 1, background: "#000", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>Imprimir</button>
              <button onClick={() => setPrintedInvoice(null)} style={{ flex: 1, background: "#cbd5e1", color: "#000", border: "none", padding: "10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
