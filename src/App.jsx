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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Menú hamburguesa para teléfonos

  // Configuración de la Empresa / Factura (Editable)
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
      <div style={{ display: "flex", height: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "15px" }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "30px", width: "100%", maxWidth: "360px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <span style={{ backgroundColor: "#9333ea", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontWeight: "900", fontSize: "20px", letterSpacing: "1px" }}>MAGO SYS</span>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "10px" }}>Sistema POS Adaptable Multiplataforma</div>
          </div>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "5px" }}>Usuario</label>
              <input type="text" placeholder="Ingrese su usuario" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff", boxSizing: "border-box", fontSize: "15px" }} required />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "5px" }}>PIN de Acceso</label>
              <input type="password" placeholder="****" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff", boxSizing: "border-box", fontSize: "15px" }} required />
            </div>
            <button type="submit" style={{ background: "#9333ea", color: "#fff", border: "none", padding: "14px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", marginTop: "10px" }}>Iniciar Sesión</button>
          </form>
        </div>
      </div>
    );
  }

  // --- APP PRINCIPAL (RESPONSIVE) ---
  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "sans-serif", overflow: "hidden", position: "relative" }}>
      
      {/* SIDEBAR PARA ESCRITORIO / TABLET GRANDE */}
      <div className="desktop-sidebar" style={{ width: "260px", backgroundColor: "#1e293b", borderRight: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "20px", zIndex: 50 }}>
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

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
        
        {/* ENCABEZADO RESPONSIVO */}
        <div style={{ height: "60px", background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: "#9333ea", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>
              ☰ Menú
            </button>
            <h3 style={{ margin: 0, fontSize: "14px", color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
              {activeTab === "pos" && "POS / Ventas"}
              {activeTab === "inventory" && "Inventario"}
              {activeTab === "clients" && "CRM Clientes"}
              {activeTab === "reports" && "Reportes X y Z"}
              {activeTab === "users" && "Usuarios"}
              {activeTab === "settings" && "Ajustes y Factura"}
            </h3>
          </div>
          <span style={{ fontSize: "11px", color: "#c084fc", background: "#0f172a", padding: "5px 10px", borderRadius: "6px", border: "1px solid #334155", fontWeight: "bold", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
            {config.storeName}
          </span>
        </div>

        {/* MENÚ MÓVIL DESPLEGABLE */}
        {mobileMenuOpen && (
          <div style={{ position: "absolute", top: "60px", left: 0, width: "260px", background: "#1e293b", borderRight: "1px solid #334155", borderBottom: "1px solid #334155", zIndex: 100, padding: "15px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "5px 5px 15px rgba(0,0,0,0.5)" }}>
            <button onClick={() => { setActiveTab("pos"); setMobileMenuOpen(false); }} style={{ padding: "10px", background: activeTab === "pos" ? "#9333ea" : "#0f172a", color: "#fff", border: "none", borderRadius: "6px", textAlign: "left" }}>🛒 POS / Caja</button>
            <button onClick={() => { setActiveTab("inventory"); setMobileMenuOpen(false); }} style={{ padding: "10px", background: activeTab === "inventory" ? "#9333ea" : "#0f172a", color: "#fff", border: "none", borderRadius: "6px", textAlign: "left" }}>📦 Inventario</button>
            <button onClick={() => { setActiveTab("clients"); setMobileMenuOpen(false); }} style={{ padding: "10px", background: activeTab === "clients" ? "#9333ea" : "#0f172a", color: "#fff", border: "none", borderRadius: "6px", textAlign: "left" }}>👥 Clientes</button>
            <button onClick={() => { setActiveTab("reports"); setMobileMenuOpen(false); }} style={{ padding: "10px", background: activeTab === "reports" ? "#9333ea" : "#0f172a", color: "#fff", border: "none", borderRadius: "6px", textAlign: "left" }}>📊 Reportes X y Z</button>
            {currentUser.role === "admin" && (
              <button onClick={() => { setActiveTab("users"); setMobileMenuOpen(false); }} style={{ padding: "10px", background: activeTab === "users" ? "#9333ea" : "#0f172a", color: "#fff", border: "none", borderRadius: "6px", textAlign: "left" }}>🔐 Usuarios</button>
            )}
            <button onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }} style={{ padding: "10px", background: activeTab === "settings" ? "#9333ea" : "#0f172a", color: "#fff", border: "none", borderRadius: "6px", textAlign: "left" }}>⚙️ Ajustes y Factura</button>
            <button onClick={() => setCurrentUser(null)} style={{ padding: "10px", background: "#7f1d1d", color: "#fff", border: "none", borderRadius: "6px", textAlign: "left", marginTop: "10px" }}>Cerrar Sesión</button>
          </div>
        )}

        <div style={{ flex: 1, padding: "15px", overflowY: "auto", backgroundColor: "#0b0f19" }}>
          
          {/* VISTA POS ADAPTABLE */}
          {activeTab === "pos" && (
            <div className="pos-container" style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1.3fr", gap: "15px", height: "100%", maxHeight: "calc(100vh - 110px)" }}>
              
              {/* CARRITO Y ORDEN */}
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", display: "flex", flexDirection: "column", padding: "12px", maxHeight: window.innerWidth < 768 ? "45vh" : "none", overflow: "hidden" }}>
                <div style={{ marginBottom: "10px", background: "#0f172a", padding: "8px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginBottom: "2px" }}>
                    <span>CLIENTE:</span>
                    <button onClick={() => setActiveTab("clients")} style={{ background: "transparent", border: "none", color: "#c084fc", fontSize: "10px", cursor: "pointer" }}>+ Nuevo</button>
                  </div>
                  <select value={selectedClient.id} onChange={(e) => { const cli = clients.find(c => c.id === Number(e.target.value)); if (cli) setSelectedClient(cli); }} style={{ width: "100%", padding: "6px", background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "6px", fontSize: "12px" }}>
                    {clients.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.rif})</option>))}
                  </select>
                </div>

                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>Orden Actual</h4>
                
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#64748b", marginTop: "30px", fontSize: "12px" }}>Seleccione productos del catálogo.</div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", padding: "8px", borderRadius: "6px", borderLeft: "3px solid #9333ea" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: "bold" }}>{item.name}</div>
                          <div style={{ fontSize: "11px", color: "#38bdf8" }}>${item.priceUSD.toFixed(2)}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#c084fc" }}>${(item.priceUSD * item.quantity).toFixed(2)}</span>
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <button onClick={() => updateCartQty(item.id, -1)} style={{ background: "#334155", color: "#fff", border: "none", width: "22px", height: "22px", borderRadius: "4px", fontWeight: "bold" }}>-</button>
                            <span style={{ fontSize: "12px", fontWeight: "bold" }}>{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.id, 1)} style={{ background: "#334155", color: "#fff", border: "none", width: "22px", height: "22px", borderRadius: "4px", fontWeight: "bold" }}>+</button>
                            <button onClick={() => removeFromCart(item.id)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "3px 6px", borderRadius: "4px", fontSize: "10px" }}>X</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ borderTop: "1px solid #334155", paddingTop: "10px", marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
                    <span>Total USD:</span>
                    <span style={{ fontWeight: "bold", color: "#fff" }}>${totalUSD.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
                    <span>Total VES:</span>
                    <span style={{ fontWeight: "bold", color: "#38bdf8" }}>Bs. {totalVES.toFixed(2)}</span>
                  </div>
                  <button disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)} style={{ width: "100%", background: cart.length === 0 ? "#334155" : "#9333ea", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", cursor: cart.length === 0 ? "not-allowed" : "pointer" }}>
                    Cobrar (${totalUSD.toFixed(2)})
                  </button>
                </div>
              </div>

              {/* CATÁLOGO DE PRODUCTOS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
                <input type="text" placeholder="Buscar producto o servicio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", outline: "none", fontSize: "13px" }} />

                <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "repeat(2, 1fr)" : "repeat(2, 1fr)", gap: "10px", alignContent: "start" }}>
                  {inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                    <div key={product.id} onClick={() => addToCart(product)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                          <span>{product.code}</span>
                          <span style={{ color: "#38bdf8" }}>Stock: {product.stock}</span>
                        </div>
                        <div style={{ fontWeight: "bold", fontSize: "13px", marginTop: "6px" }}>{product.name}</div>
                      </div>
                      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#c084fc" }}>${product.priceUSD.toFixed(2)}</div>
                          <div style={{ fontSize: "10px", color: "#94a3b8" }}>Bs. {(product.priceUSD * config.bcvRate).toFixed(2)}</div>
                        </div>
                        <span style={{ background: "#7e22ce", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>+</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <button type="submit" style={{ gridColumn: window.innerWidth < 768 ? "span 1" : "span 3", background: currentUser.role === "admin" ? "#9333ea" : "#475569", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: currentUser.role === "admin" ? "pointer" : "not-allowed" }}>
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
                          <button onClick={() => { if(currentUser.role !== "admin") alert("Solo Admin"); else setEditingProduct(prod); setProductForm(prod); }} style={{ background: "#334155", color: "#c084fc", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>Editar</button>
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
                  <button type="submit" style={{ background: "#9333ea", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Guardar Cliente</button>
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
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "bold" }}>${sale.totalUSD.toFixed(2)}</div>
                      </div>
                      <button onClick={() => setPrintedInvoice(sale)} style={{ background: "#334155", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px" }}>Ticket</button>
                    </div>
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
                  <button type="submit" style={{ background: "#9333ea", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Crear</button>
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
                        <button onClick={() => deleteUser(u.id)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "4px 8px", borderRadius: "4px" }}>Eliminar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AJUSTES Y CONFIGURACIÓN DE FACTURA / EMPRESA */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "500px" }}>
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#c084fc", fontSize: "15px" }}>⚙️ Datos de la Empresa y Facturación</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Nombre Comercial de la Empresa / Marca</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.storeName} onChange={(e) => setConfig({...config, storeName: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>RIF Jurídico o Personal (Ej. J-50123456-7 / V-12345678-9)</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.rif} onChange={(e) => setConfig({...config, rif: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Dirección Fiscal / Local</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.address} onChange={(e) => setConfig({...config, address: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Teléfono de Contacto</label>
                    <input type="text" disabled={currentUser.role !== "admin"} value={config.phone} onChange={(e) => setConfig({...config, phone: e.target.value})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Tasa Oficial BCV ($)</label>
                    <input type="number" step="0.01" disabled={currentUser.role !== "admin"} value={config.bcvRate} onChange={(e) => setConfig({...config, bcvRate: parseFloat(e.target.value) || 0})} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #38bdf8", borderRadius: "6px", color: "#38bdf8", fontWeight: "bold" }} />
                  </div>
                </div>

                <button onClick={() => alert("✅ ¡Configuración y datos de factura guardados con éxito!")} style={{ width: "100%", background: currentUser.role === "admin" ? "#9333ea" : "#475569", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", marginTop: "20px", cursor: currentUser.role === "admin" ? "pointer" : "not-allowed" }}>
                  Guardar Cambios de Facturación
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

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
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}>
              <option value="Efectivo USD">Efectivo ($)</option>
              <option value="Pago Móvil">Pago Móvil (VES)</option>
              <option value="Punto de Venta">Punto de Venta</option>
              <option value="Zelle">Zelle ($)</option>
            </select>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, background: "#334155", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={processPayment} style={{ flex: 1, background: "#9333ea", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TICKET / FACTURA ACTUALIZADO CON DATOS DE CONFIGURACIÓN */}
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
              <div style={{ fontSize: "9px", color: "#555", textAlign: "center", marginTop: "4px" }}>Tasa BCV Aplicada: Bs. {config.bcvRate}</div>
            </div>
            <div style={{ textAlign: "center", fontSize: "9px", color: "#555" }}>
              ¡Gracias por su compra!<br/>MAGO SYS VENEZUELA
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