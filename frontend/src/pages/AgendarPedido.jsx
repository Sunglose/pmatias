// src/pages/AgendarPedido.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa6";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useCart } from "../hooks/useCart";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AgendarPedido() {
  const navigate = useNavigate();
  const { user, role, userId } = useAuth();
  const [cart, setCart] = useCart(role, userId);

  // === Pasajero público (sin token) ===
  const token = useMemo(() => localStorage.getItem("token"), []);
  const isPasajero = !token;

  const basePath =
    role === "admin" ? "/admin" :
    role === "cajera" ? "/cajera" :
    role === "cliente" ? "/cliente" : "";

  // Usa sessionStorage en pasajero, localStorage en logueados
  const storage = useMemo(() => (isPasajero ? window.sessionStorage : window.localStorage), [isPasajero]);

  const cartKey = useMemo(() => `agendar_cart:${role}:${userId}`, [role, userId]);
  const draftKey = useMemo(() => `agendar_draft:${role}:${userId}`, [role, userId]);

  // Al entrar como pasajero, limpiar cualquier carrito previo
  useEffect(() => {
    if (isPasajero) {
      storage.removeItem(cartKey);
      storage.removeItem(draftKey);
      setCart([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPasajero]);

  // Catálogo
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Modal de agregar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState(null); // { id, nombre, imagen|imagen_url }
  const [modalUnidad, setModalUnidad] = useState("kg");   // 'kg' | 'un'
  const [modalCantidad, setModalCantidad] = useState("1");
  const [modalError, setModalError] = useState("");

  // Cargar productos (sin token para pasajero)
  async function fetchProductos() {
    setLoading(true); setErr("");
    try {
      if (isPasajero) {
        const res = await fetch(`${API}/api/public/productos`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setProductos(Array.isArray(data) ? data : []);
      } else {
        const { data } = await api.get("/api/productos");
        setProductos(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setErr(e?.message || "Error cargando productos");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchProductos(); /* eslint-disable-next-line */ }, [isPasajero]);

  function openModal(p) {
    setModalProduct(p);
    setModalUnidad("kg");
    setModalCantidad("1");
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
    setModalProduct(null);
  }

  function addFromModal() {
    if (!modalProduct) return;
    const qty = Number(modalCantidad);
    if (!qty || qty <= 0) {
      setModalError("Ingresa una cantidad válida.");
      return;
    }

    if (modalUnidad === "un" && !Number.isInteger(qty)) {
      const rounded = Math.ceil(qty);
      setModalCantidad(String(rounded));
      setModalError(`Se ajustó a ${rounded} porque "UN" no permite decimales.`);
      return;
    }

    const key = `${modalProduct.id}-${modalUnidad}`;
    const idx = cart.findIndex((i) => i.key === key);

    if (idx >= 0) {
      const next = [...cart];
      next[idx] = {
        ...next[idx],
        cantidad: Number((next[idx].cantidad + qty).toFixed(3)),
      };
      setCart(next);
    } else {
      setCart([
        ...cart,
        {
          key,
          producto_id: modalProduct.id,
          nombre: modalProduct.nombre,
          unidad: modalUnidad,
          cantidad: qty,
        },
      ]);
    }
    setModalError("");
    closeModal();
  }

  function removeFromCart(key) {
    setCart((c) => c.filter((x) => x.key !== key));
  }

  function goConfirm() {
    if (cart.length === 0) { alert("Agrega al menos un producto."); return; }
    storage.setItem(draftKey, JSON.stringify({ items: cart }));
    const dest = role === "pasajero" ? "/agendar/confirmacion" : `${basePath}/agendar/confirmacion`;
    navigate(dest);
  }

  // Escape para cerrar modal
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  return (
    <div className="h-full flex flex-col text-black dark:text-white">
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 px-2 sm:px-4 md:px-8 py-4">
        {/* Catálogo */}
        <section className="border border-[#8F5400] dark:border-gray-800 rounded-xl p-4">
          <h2 className="text-center text-lg font-semibold mb-4">Tipo de pan</h2>

          {err && <div className="text-red-500 text-sm mb-3">{err}</div>}

          {loading ? (
            <div className="text-sm text-gray-500">Cargando…</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {productos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openModal(p)}
                  className="rounded-lg border border-[#8F5400] dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col items-center p-2 text-xs gap-2 overflow-hidden"
                  title={p.nombre}
                >
                  <div className="w-full aspect-[3/4] rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {p.imagen_url || p.imagen ? (
                      <img
                        src={p.imagen_url || `${API}/uploads/${p.imagen}`}
                        alt={p.nombre}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-[10px] text-gray-500 px-1 text-center">Sin imagen</span>
                    )}
                  </div>
                  <span className="w-full text-center truncate">{p.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Carrito */}
        <aside className="border border-[#8F5400] dark:border-gray-800 rounded-xl p-4 lg:sticky lg:top-6 h-fit">
          <h3 className="font-semibold mb-2 text-sm">Pedido</h3>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 max-h-64 overflow-y-auto pr-1">
            {cart.map((item) => (
              <li key={item.key} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.nombre}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    {item.cantidad} {item.unidad === "kg" ? "KG" : "UN"}
                  </div>
                </div>
                <button
                  className="text-red-600 hover:text-red-700"
                  title="Quitar"
                  onClick={() => removeFromCart(item.key)}
                >
                  <FaTrash />
                </button>
              </li>
            ))}
          </ul>

          {cart.length === 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Sin productos</div>
          )}

          <button
            type="button"
            onClick={goConfirm}
            className="w-full mt-4 bg-[#8F5400] text-white dark:bg-white dark:text-black rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            disabled={cart.length === 0}
          >
            Continuar
          </button>
        </aside>
      </main>

      {/* Modal Agregar Producto */}
      {isModalOpen && modalProduct && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          role="dialog"
          aria-modal="true"
          aria-label={`Agregar ${modalProduct.nombre}`}
        >
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Imagen */}
              <div className="p-5 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <div className="w-64 h-64 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {modalProduct.imagen_url || modalProduct.imagen ? (
                    <img
                      src={modalProduct.imagen_url || `${API}/uploads/${modalProduct.imagen}`}
                      alt={modalProduct.nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <span className="text-xs text-gray-500 px-1 text-center">Sin imagen</span>
                  )}
                </div>
              </div>

              {/* Controles */}
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-1">{modalProduct.nombre}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Selecciona cantidad y unidad para agregar al pedido.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Cantidad</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.1"
                    value={modalCantidad}
                    onChange={e => {
                      let value = parseFloat(e.target.value);
                      // Redondear a un decimal y validar mínimo
                      if (isNaN(value)) value = '';
                      else if (value < 0.5) value = 0.5;
                      else value = Math.floor(value * 10) / 10;
                      setModalCantidad(value);
                    }}
                    className="w-28 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                  />
                  <select
                    value={modalUnidad}
                    onChange={(e) => {
                      const next = e.target.value; // "kg" | "un"
                      setModalUnidad(next);
                      const n = Number(String(modalCantidad).replace(",", "."));
                      if (next === "un" && !Number.isNaN(n)) {
                        const rounded = Math.ceil(n);
                        if (n !== rounded) setModalError(`Se redondeó a ${rounded} porque "UN" no permite decimales.`);
                        else setModalError("");
                        setModalCantidad(String(rounded));
                      } else {
                        setModalError("");
                      }
                    }}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                  >
                    <option value="kg">KG</option>
                    <option value="un">UN</option>
                  </select>
                  {modalError && (
                    <div className="text-xs mt-2 text-amber-600 dark:text-amber-400">
                      {modalError}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>
                  <button
                    className="bg-[#8F5400] text-white dark:bg-white dark:text-black rounded-lg px-4 py-2 text-sm hover:opacity-90"
                    onClick={addFromModal}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
