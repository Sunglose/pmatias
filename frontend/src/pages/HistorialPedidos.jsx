import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaCheck } from "react-icons/fa";
import { MdMail,MdLocalPhone  } from "react-icons/md";
import Pagination from "../components/ui/Paginacion";
import Tabs from "../components/ui/Tabs";
import { Table } from "../components/ui/Table";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { fetchJSON } from "../utils/fetch";
import { parseError } from "../utils/errores";
import { formatFecha, mapEntrega } from "../utils/pedidos";
import ProductsCell from "../components/ProductsCell";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminPedidos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = useMemo(() => localStorage.getItem("token"), []);
  const headers = useMemo(
    () => ({ 
      "Content-Type": "application/json", 
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }),
    [token]
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("hoy");

  useEffect(() => {
    if (!token) {
      setError("No estás autenticado. Redirigiendo al login...");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }
    if (!user || (user.rol !== "admin" && user.rol !== "cajera")) {
      setError(`Acceso denegado. Se requiere rol de admin o cajera. Tu rol: ${user?.rol || "desconocido"}`);
    }
  }, [token, user, navigate]);

  const isHistorico = (p) => {
    const st = String(p?.estado || "").toLowerCase();
    return st === "entregado" || st === "cancelado";
  };

  const capitalize = (s) => {
    const str = (s ?? "").toString().toLowerCase();
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
  };

  const [pageActual, setPageActual] = useState(1);
  const [pageHist, setPageHist] = useState(1);
  const [metaActual, setMetaActual] = useState({ totalPages: 1 });
  const [metaHist, setMetaHist] = useState({ totalPages: 1 });

  const [pageHoy, setPageHoy] = useState(1);
  const [metaHoy, setMetaHoy] = useState({ totalPages: 1 });
  const HOY_LIMIT = 7;

  async function cargarActual(p = 1) {
    if (!token) {
      setError("No tienes permisos para ver pedidos");
      return;
    }
    setLoading(true); setError("");
    try {
      const data = await fetchJSON(`${API}/api/pedidos?page=${p}&limit=7`);
      setRows(Array.isArray(data.data) ? data.data : []);
      setPageActual(data.page || p);
      setMetaActual({ totalPages: data.totalPages || 1 });
    } catch (e) { 
      console.error("Error al cargar pedidos actuales:", e);
      setError(parseError(e)); 
    }
    finally { setLoading(false); }
  }

  async function cargarHist(p = 1) {
    if (!token) {
      setError("No tienes permisos para ver el historial");
      return;
    }
    setLoading(true); setError("");
    try {
      const data = await fetchJSON(`${API}/api/pedidos/historico?page=${p}&limit=7`);
      setRows(Array.isArray(data.data) ? data.data : []);
      setPageHist(data.page || p);
      setMetaHist({ totalPages: data.totalPages || 1 });
    } catch (e) { 
      console.error("Error al cargar historial:", e);
      setError(parseError(e)); 
    }
    finally { setLoading(false); }
  }

  function isTodayDate(fecha_iso) {
    if (!fecha_iso) return false;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return fecha_iso === todayStr;
  }

  async function cargarHoy(p = 1) {
    if (!token) {
      setError("No tienes permisos para ver los pedidos de hoy");
      return;
    }
    setLoading(true); setError("");
    try {
      const data = await fetchJSON(`${API}/api/pedidos?page=1&limit=1000`);
      const all = Array.isArray(data.data) ? data.data : [];
      const hoyAll = all.filter(pedido => isTodayDate(pedido.fecha_iso));
      const totalPages = Math.max(1, Math.ceil(hoyAll.length / HOY_LIMIT));
      const page = Math.min(Math.max(1, p), totalPages);
      const paged = hoyAll.slice((page - 1) * HOY_LIMIT, page * HOY_LIMIT);
      
      setRows(paged);
      setPageHoy(page);
      setMetaHoy({ totalPages });
    } catch (e) {
      console.error("Error al cargar pedidos de hoy:", e);
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    if (token && user) {
      cargarHoy(1);
    }
  }, [token, user]);

  useEffect(() => {
    if (tab === "hoy") cargarHoy(pageHoy);
    else if (tab === "actual") cargarActual(pageActual);
    else if (tab === "historial") cargarHist(pageHist);
  }, [tab, pageActual, pageHist, pageHoy]);
  
  function recargarDespuesDeCambio() {
    if (tab === "hoy") {
      const next = pageHoy > 1 && rows.length <= 1 ? pageHoy - 1 : pageHoy;
      cargarHoy(next);
    } else if (tab === "actual") {
      const next = pageActual > 1 && rows.length <= 1 ? pageActual - 1 : pageActual;
      cargarActual(next);
    } else if (tab === "historial") {
      const next = pageHist > 1 && rows.length <= 1 ? pageHist - 1 : pageHist;
      cargarHist(next);
    }
  }

  async function eliminarPedido(id) {
    if (!confirm("¿Eliminar pedido? Esta acción es permanente.")) return;
    try {
      await fetchJSON(`${API}/api/pedidos/${id}`, { method: "DELETE" });
      recargarDespuesDeCambio();
    } catch (e) { setError(parseError(e)); }
  }

  async function marcarEntregado(id) {
    try {
      await fetchJSON(`${API}/api/pedidos/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "entregado" }),
      });
      await cargarActual(pageActual);
    } catch (e) { setError(parseError(e)); }
  }

  const tableRows = rows;
  const tableColumns = [
    { key: "id", header: "ID" },
    {
      header: "Cliente",
      cell: (p) => (
        <div>
          <div className="font-semibold">{p.cliente_nombre || "(cliente eliminado)"}</div>
          {p.cliente_email && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MdMail className="flex-shrink-0" />
              <span>{p.cliente_email}</span>
            </div>
          )}
          {p.cliente_telefono && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MdLocalPhone className="flex-shrink-0" />
              <span>{p.cliente_telefono}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Fecha/Hora de retiro",
      cell: (p) => (
        <span>
          {formatFecha(p.fecha)} {p.hora?.slice(0, 5)}
        </span>
      ),
    },
    { header: "Entrega", cell: (p) => mapEntrega(p.tipo_entrega) },
    {
      header: <span className="hidden md:inline">Dirección</span>,
      cell: (p) => (
        <span className="hidden md:inline">
          {p.tipo_entrega === "reparto" ? (p.direccion_entrega || "—") : "—"}
        </span>
      ),
    },
    {
      header: <span className="hidden md:inline">Productos</span>,
      cell: (p) => (
        <span className="hidden md:inline">
          <ProductsCell resumenStr={p.productos_resumen} />
        </span>
      ),
    },
    {
      header: "Estado",
      cell: (p) => {
        const st = String(p.estado || "").toLowerCase();
        const cls =
          st === "entregado" ? "bg-green-100 text-green-700" :
          st === "pendiente" ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-700";
        return (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            {capitalize(p.estado)}
          </span>
        );
      },
    },
    {
      header: <span className="inline-block text-center w-full">Acciones</span>,
      cell: (p) => (
        <div className="inline-flex items-center gap-3">
          {!isHistorico(p) && (
            <Button
              title="Marcar entregado"
              onClick={() => marcarEntregado(p.id)}
              variant="outline"
              size="sm"
            >
              <FaCheck />
            </Button>
          )}
          <Button
            title="Eliminar"
            onClick={() => eliminarPedido(p.id)}
            size="sm"
            className="text-white bg-red-600 hover:bg-red-700 px-3 py-1.5"
          >
            <FaTrash />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col text-black dark:bg-gray-900 dark:text-white">
      <main className="w-full max-w-6xl mx-auto px-4 py-6 flex-1">
        {!token && (
          <div className="mb-4 p-3 rounded border-l-4 border-yellow-400 bg-yellow-50 text-sm text-yellow-800">
            Debes iniciar sesión para ver los pedidos.
          </div>
        )}
        {error && (<div className="text-red-600 text-sm mb-3 p-3 rounded border-l-4 border-red-400 bg-red-50">{error}</div>)}
        <div className="w-full mb-4">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { 
                value: "hoy", 
                label: (
                  <>
                    <span className="block sm:hidden">HOY</span>
                    <span className="hidden sm:block">ENTREGAS HOY</span>
                  </>
                )
              },
              { 
                value: "actual", 
                label: (
                  <>
                    <span className="block sm:hidden">VIGENTES</span>
                    <span className="hidden sm:block">PEDIDOS VIGENTES</span>
                  </>
                )
              },
              { 
                value: "historial", 
                label: (
                  <>
                    <span className="block sm:hidden">HISTORIAL</span>
                    <span className="hidden sm:block">HISTORIAL DE PEDIDOS</span>
                  </>
                )
              },
            ]}
          />
        </div>
        <div className="overflow-x-auto border border-[#8F5400] dark:border-gray-800 rounded-xl">
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-6">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-6">Sin resultados</div>
          ) : (
            <Table config={{ rows: tableRows, columns: tableColumns }} />
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          {tab === "actual" ? (
            <Pagination
              page={pageActual}
              totalPages={metaActual.totalPages}
              onChange={cargarActual}
              disabled={loading}
            />
          ) : tab === "historial" ? (
            <Pagination
              page={pageHist}
              totalPages={metaHist.totalPages}
              onChange={cargarHist}
              disabled={loading}
            />
          ) : tab === "hoy" ? (
            <Pagination
              page={pageHoy}
              totalPages={metaHoy.totalPages}
              onChange={cargarHoy}
              disabled={loading}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
