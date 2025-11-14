// src/pages/ClientePedidos.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../../components/ui/Table";
import Paginacion from "../../components/ui/Paginacion";
import Tabs from "../../components/ui/Tabs";
import { fetchJSON } from "../../utils/fetch";
import { parseError } from "../../utils/errores";
import { formatFecha, mapEntrega } from "../../utils/pedidos";
import { useAuthHeaders } from "../../hooks/useAuth";
import ProductsCell from "../../components/ProductsCell";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ClientePedidos() {
  const navigate = useNavigate();

  // Auth headers
  const token = useMemo(() => localStorage.getItem("token"), []);
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : undefined,
    }),
    [token]
  );

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState("");

  // Tab: "actual" | "historial"
  const [tab, setTab] = useState("actual");

  const isHistorico = (p) => {
    const st = String(p?.estado || "").toLowerCase();
    return st === "entregado" || st === "cancelado";
  };

  const [pageActual, setPageActual] = useState(1);
  const [pageHist, setPageHist] = useState(1);
  const [metaActual, setMetaActual] = useState({ totalPages: 1 });
  const [metaHist, setMetaHist] = useState({ totalPages: 1 });

  const filteredRows = rows.filter((p) =>
    tab === "actual" ? !isHistorico(p) : isHistorico(p)
  );

  // Configuración para Table
  const tableRows = filteredRows.map((p, i) => ({ ...p, _n: i + 1 }));
  const tableColumns = [
    { key: "_n", header: "#" },
    {
      header: "Fecha/Hora",
      cell: (p) => (
        <span>
          {(p.fecha || formatFecha(p.fecha_entrega))} {(p.hora || (p.hora_entrega || "").slice(0, 5))}
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
          <ProductsCell resumenStr={p.productos_resumen || ""} />
        </span>
      ),
    },
    {
      header: "Estado",
      cell: (p) => {
        const raw = (p.estado || "").toString();
        const st = raw.toLowerCase();
        const label = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "";
        const cls =
          st === "entregado" ? "bg-green-100 text-green-700" :
          st === "pendiente" ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-700";
        return (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            {label}
          </span>
        );
      },
    },
  ];

  async function cargarActual(p = 1) {
    setLoading(true); setErr("");
    try {
      const data = await fetchJSON(`${API}/api/pedidos?page=${p}&limit=7`);
      setRows(Array.isArray(data.data) ? data.data : []);
      setPageActual(data.page || p);
      setMetaActual({ totalPages: data.totalPages || 1 });
    } catch (e) { setErr(parseError(e)); }
    finally { setLoading(false); }
  }

  async function cargarHist(p = 1) {
    setLoading(true); setErr("");
    try {
      const data = await fetchJSON(`${API}/api/pedidos/historico?page=${p}&limit=7`);
      setRows(Array.isArray(data.data) ? data.data : []);
      setPageHist(data.page || p);
      setMetaHist({ totalPages: data.totalPages || 1 });
    } catch (e) { setErr(parseError(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargarActual(1); }, []);

  useEffect(() => {
    if (tab === "actual") cargarActual(pageActual);
    else cargarHist(pageHist);
  }, [tab]);

  return (
    <div className="min-h-screen  flex flex-col text-black dark:bg-gray-900 dark:text-white">
      <main className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-6 flex-1">
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <div className="w-full mb-4">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { 
                value: "actual", 
                label: (
                  <>
                    <span className="block sm:hidden">VIGENTE</span>
                    <span className="hidden sm:block">PEDIDO ACTUAL</span>
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
        {/* Tabla */}
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">Cargando…</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8 border border-gray-200 dark:border-gray-800 rounded-xl">
            {tab === "actual" ? "No tienes pedidos pendientes." : "Aún no hay historial."}
          </div>
        ) : (
          <Table config={{ rows: tableRows, columns: tableColumns }} />
        )}

        <div className="flex items-center justify-center gap-2">
          {tab === "actual" ? (
            <Paginacion
              page={pageActual}
              totalPages={metaActual.totalPages}
              onChange={cargarActual}
              disabled={loading}
            />
          ) : (
            <Paginacion
              page={pageHist}
              totalPages={metaHist.totalPages}
              onChange={cargarHist}
              disabled={loading}
            />
          )}
        </div>
      </main>
    </div>
  );
}
