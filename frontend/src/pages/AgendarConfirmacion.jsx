// src/pages/AgendarConfirmacion.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa6";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { parseError } from "../utils/errores";
import { getTomorrowYMD, getMaxDateYMD } from "../utils/fecha"; // ← NUEVO import
import { fetchJSON } from "../utils/fetch";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AgendarConfirmacion() {
  const navigate = useNavigate();
  const { user } = useAuth(); // { id, rol }

  // === Detección de pasajero (sin token) ===
  const token = useMemo(() => localStorage.getItem("token"), []);
  const isPasajero = !token;

  const role = isPasajero ? "pasajero" : (user?.rol || "cliente");
  const userId = isPasajero ? "anon" : (user?.id ?? "anon");

  // Usa sessionStorage en pasajero, localStorage en logueados
  const storage = useMemo(() => (isPasajero ? window.sessionStorage : window.localStorage), [isPasajero]);

  const cartKey = useMemo(() => `agendar_cart:${role}:${userId}`, [role, userId]);
  const draftKey = useMemo(() => `agendar_draft:${role}:${userId}`, [role, userId]);

  // -------- Carrito --------
  const [cart, setCart] = useState(() => {
    try {
      const cartData = JSON.parse(storage.getItem(cartKey));
      if (cartData && Array.isArray(cartData)) return cartData;
    } catch {}
    try {
      const draft = JSON.parse(storage.getItem(draftKey));
      if (draft?.items) return draft.items;
    } catch {}
    try { return JSON.parse(localStorage.getItem("agendar_cart")) || []; } catch { return []; }
  });
  useEffect(() => {
    storage.setItem(cartKey, JSON.stringify(cart));
    storage.setItem(draftKey, JSON.stringify({ items: cart }));
  }, [cart, cartKey, draftKey, storage]);

  function removeFromCart(key) {
    setCart((c) => c.filter((x) => x.key !== key));
  }

  // -------- Form principal --------
  const [tipoEntrega, setTipoEntrega] = useState("retiro"); // "retiro" | "reparto"
  const [fecha, setFecha] = useState(() => getTomorrowYMD());
  const tomorrowYMD = useMemo(() => getTomorrowYMD(), []);
  const maxDateYMD = useMemo(() => getMaxDateYMD(6), []); // ← NUEVO: 7 días desde mañana
  const [hora, setHora] = useState("08");
  const [min, setMin] = useState("00");

  // -------- Datos cliente --------
  // Para pasajero (kiosco/QR) y para staff creando pasajero:
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccionTxt, setDireccionTxt] = useState("");

  // Para rol cliente (perfil propio):
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]); // [{id, texto, es_principal}]
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [requiereAprob, setRequiereAprob] = useState(false);

  // Cargar perfil/direcciones SOLO si es cliente
  useEffect(() => {
    if (role !== "cliente") return;
    (async () => {
      try {
        setError("");
        const [p, a] = await Promise.all([
          fetchJSON(`${API}/api/account/profile`),
          fetchJSON(`${API}/api/account/addresses`),
        ]);

        setProfile(p || {});
        setAddresses(Array.isArray(a) ? a : []);

        if (p) {
          setNombre(p.nombre || "");
          setEmail(p.email || "");
          setTelefono(p.telefono || "");
        }
        const principal = (a || []).find((x) => x.es_principal);
        setSelectedAddressId(principal ? principal.id : (a[0]?.id ?? null));
      } catch (e) {
        setError(parseError(e));
      }
    })();
  }, [role]);

  function parseErr(e) {
    try { const j = JSON.parse(e.message); return j.message || e.message; }
    catch { return e?.message || "Error"; }
  }

  function validate() {
    if (cart.length === 0) return "Agrega al menos un producto.";
    if (!fecha) return "Selecciona una fecha de entrega.";

    // Validar rango de fechas (mañana hasta 7 días)
    if (fecha < tomorrowYMD || fecha > maxDateYMD) {
      return `Solo puedes agendar entre ${tomorrowYMD} y ${maxDateYMD} (hasta 1 semana desde mañana).`;
    }

    if (!hora || !min) return "Selecciona una hora válida.";

    if (role === "cliente") {
      if (tipoEntrega === "reparto" && !selectedAddressId) {
        return "Selecciona una dirección para el reparto (en tu perfil puedes agregar más).";
      }
    } else {
      // pasajero (kiosco) o staff creando pasajero
      if (!nombre || nombre.trim().length < 3) return "Ingresa el nombre del cliente.";
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return "Email inválido.";
      if (!/^\d{9}$/.test(telefono)) return "El teléfono debe tener 9 dígitos.";
      if (tipoEntrega === "reparto" && !direccionTxt.trim()) return "Para reparto, ingresa la dirección.";
    }
    return "";
  }

  async function onConfirmar() {
    setError(""); setOk(""); setRequiereAprob(false);
    const v = validate();
    if (v) { setError(v); return; }

    setSaving(true);
    try {
      // Construir headers según si hay token o no
      const headers = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payloadBase = {
        tipo_entrega: tipoEntrega,
        fecha_entrega: fecha,
        hora_entrega: `${hora}:${min}:00`,
        items: cart.map((i) => ({
          producto_id: i.producto_id,
          unidad: i.unidad,
          cantidad: Number(i.cantidad),
        })),
      };

      // ----- construir payload según rol -----
      let payload = payloadBase;
      if (role === "cliente") {
        payload = { ...payloadBase, direccion_id: selectedAddressId || null };
      } else {
        payload = {
          ...payloadBase,
          cliente: { nombre, email, telefono, direccion: direccionTxt || null },
        };
      }

      // ***** Rutas según sea pasajero o autenticado *****
      // Pasajero -> PREPEDIDO público (sin token)
      // Autenticado -> PEDIDO normal (con token + notify)
      const createUrl = isPasajero
        ? `${API}/api/pedidos/pre`
        : `${API}/api/pedidos?notify=1`;

      // Crear (pre)pedido
      const res = await fetch(createUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      const body = await res.json().catch(() => ({}));

      if (isPasajero) {
        // Respuesta de PRE-PEDIDO
        const preId = body?.id;
        const pin = body?.confirm_pin || null;
        const expiresAt = body?.expires_at || null;
        const reqAprob = !!body?.requiere_aprobacion;

        setRequiereAprob(reqAprob);

        // Guardar por si se recarga
        localStorage.setItem(
          "last_pin_info",
          JSON.stringify({ id: preId, pin, expiresAt, requiereAprob: reqAprob })
        );

        // Redirigir SIEMPRE a la página del PIN
        // - Si reqAprob es true: la página mostrará "pendiente de aprobación".
        // - Si no y hay pin: lo mostrará. Si no llegó pin, igual mostrará estado.
        return navigate(`/pin/${preId}`, {
          state: pin ? { pin, expiresAt } : undefined,
        });
      } else {
        // Respuesta de PEDIDO normal (cliente / staff)
        const pedidoId = body?.id;
        const reqAprob = !!body?.requiere_aprobacion;
        setRequiereAprob(reqAprob);

        if (pedidoId && (role === "admin" || role === "cajera")) {
          // Notificación opcional al cliente (si usas ese endpoint)
          try {
            // await confirmarPedido(pedidoId, token);
            setOk("Pedido creado y confirmación enviada al cliente.");
          } catch {
            setOk("Pedido creado. (No se pudo enviar el correo de confirmación)");
          }
        } else {
          setOk("Pedido creado con éxito.");
        }
      }

      // limpiar carrito al finalizar
      storage.removeItem(cartKey);
      storage.removeItem(draftKey);
      localStorage.removeItem("agendar_cart"); // legacy
      setCart([]);

      // Redirigir SOLO para clientes o staff; pasajero ya fue navegado arriba
      if (!isPasajero) {
        setTimeout(() => {
          if (role === "cliente") navigate("/cliente/pedidos");
          else navigate(`${basePath}/pedidos`);
        }, 800);
      }
    } catch (err) {
      setOk("");
      setError(parseError(err)); // ← cambiar
    } finally {
      setSaving(false);
    }
  }

  const horas = Array.from({ length: 14 }, (_, i) => String(i + 6).padStart(2, "0")); // 06..19
  const minutos = ["00", "15", "30", "45"];

  return (
    <div className="min-h-screen flex flex-col text-black dark:bg-gray-900 dark:text-white">
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-4">
          <div className="border border-[#8F5400] dark:border-gray-800 rounded-xl p-4">
            <h2 className="font-semibold text-lg mb-3">¿Cómo quieres pedir?</h2>
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2">
                <Input
                  type="radio"
                  className="size-4"
                  checked={tipoEntrega === "retiro"}
                  onChange={() => setTipoEntrega("retiro")}
                />
                <span>Retiro en local</span>
              </label>
              {role === "cliente" && (
                <label className="inline-flex items-center gap-2">
                  <Input
                    type="radio"
                    className="size-4"
                    checked={tipoEntrega === "reparto"}
                    onChange={() => setTipoEntrega("reparto")}
                  />
                  <span>Reparto</span>
                </label>
              )}
            </div>
          </div>

          <div className="border border-[#8F5400] dark:border-gray-800 rounded-xl p-4">
            <h2 className="font-semibold text-lg mb-3">¿Día y hora del pedido?</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="w-36"
                type="date"
                value={fecha}
                min={tomorrowYMD}
                max={maxDateYMD} // ← CAMBIO: ahora permite hasta 7 días desde mañana
                onChange={(e) => setFecha(e.target.value)}
              />
              <span className="hidden sm:inline-block w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2" />
              <div className="flex items-center gap-2">
                <select
                  className="border border-[#8F5400] dark:border-gray-700 rounded-lg px-2 py-2 bg-white dark:bg-gray-800"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                >
                  {horas.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-sm text-gray-500 dark:text-gray-400">hrs</span>
                <select
                  className="border border-[#8F5400] dark:border-gray-700 rounded-lg px-2 py-2 bg-white dark:bg-gray-800"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                >
                  {minutos.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="text-sm text-gray-500 dark:text-gray-400">mins</span>
              </div>
            </div>
          </div>

          {/* Datos cliente */}
          {role === "cliente" ? (
            // ----- VISTA CLIENTE: muestra datos actuales (solo lectura) -----
            <div className="border border-[#8F5400] dark:border-gray-800 rounded-xl p-4">
              <h2 className="font-semibold text-lg mb-3">Detalles Cliente</h2>

              {!profile ? (
                <div className="text-sm text-gray-500">Cargando perfil…</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ReadRow label="Nombre" value={profile.nombre || "—"} />
                  <ReadRow label="Local" value={profile.local || "—"} />
                  <ReadRow label="Correo" value={profile.email || "—"} />
                  <ReadRow label="Teléfono" value={profile.telefono || "—"} />

                  {tipoEntrega === "reparto" && (
                    <div className="md:col-span-2 py-5">
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Dirección (para reparto)</div>
                      {addresses.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          No tienes direcciones guardadas. Agrega una en tu perfil.
                        </div>
                      ) : (
                        <select
                          className="w-full border border-[#8F5400] dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                          value={selectedAddressId || ""}
                          onChange={(e) => setSelectedAddressId(e.target.value ? Number(e.target.value) : null)}
                        >
                          {addresses.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.texto}{a.es_principal ? " (principal)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Para agregar/editar direcciones, ve a tu perfil.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // ----- VISTA PASAJERO (kiosco) O STAFF: datos de contacto -----
            <div className="border border-[#8F5400] dark:border-gray-800 rounded-xl p-4">
              <h2 className="font-semibold text-lg mb-3">Datos del cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nombre">
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ\s]/g, ""))}
                    placeholder="Nombre del cliente"
                  />
                </Field>
                <Field label="Correo">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </Field>
                <Field label="Teléfono">
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={9}
                    value={telefono}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, "").slice(0, 9);
                      setTelefono(onlyNums);
                    }}
                    placeholder="987654321"
                  />
                </Field>
                {tipoEntrega === "reparto" && (
                  <Field label="Dirección (reparto)">
                    <Input
                      value={direccionTxt}
                      onChange={(e) => setDireccionTxt(e.target.value)}
                      placeholder="Calle #123, Comuna"
                    />
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* Mensajes */}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {ok && <div className="text-green-600 text-sm">{ok}</div>}

          {/* Aviso de aprobación para pasajero */}
          {requiereAprob && (
            <div className="border border-amber-600/40 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-sm">
              Este pedido necesita aprobación. Te avisaremos por correo o WhatsApp cuando esté listo.
            </div>
          )}
        </section>
        <aside className="border border-[#8F5400] dark:border-gray-800 rounded-xl p-4 lg:sticky lg:top-6 h-fit mt-4 lg:mt-0">
          <h3 className="font-semibold mb-2">Pedido</h3>

          <ul className="divide-y divide-gray-200 dark:divide-gray-800 max-h-64 overflow-y-auto pr-1">
            {cart.map((item) => (
              <li key={item.key} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.nombre}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.cantidad} {item.unidad === "kg" ? "KG" : "UN"}
                  </div>
                </div>
                <Button
                  variant="eliminar"
                  title="Quitar"
                  onClick={() => removeFromCart(item.key)}
                >
                  <FaTrash />
                </Button>
              </li>
            ))}
          </ul>

          {cart.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Sin productos</div>
          )}

          <Button
            className="w-full mt-4"
            type="button"
            onClick={onConfirmar}
            disabled={saving || cart.length === 0}
          >
            {saving ? "Confirmando…" : "Confirmar pedido"}
          </Button>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm mb-1 text-gray-600 dark:text-gray-300">{label}</div>
      {children}
    </label>
  );
}
function ReadRow({ label, value }) {
  return (
    <div>
      <div className=" text-gray-600 dark:text-gray-300">
        {label}: <label className="rounded-lg text-black">{value}</label>
      </div>
    </div>
  );
}
