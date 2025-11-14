import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import { Table } from "../../components/ui/Table";
import { fetchJSON } from "../../utils/fetch";
import { parseError } from "../../utils/errores";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AprobarPedidos() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);
  const [creatingTest, setCreatingTest] = useState(false);

  async function cargar() {
    setLoading(true); setErr("");
    try {
      const data = await fetchJSON(`${API}/api/pedidos/aprobar`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  async function aprobar(id) {
    try {
      await fetchJSON(`${API}/api/pedidos/pre/${id}/aprobar?notify=1`, { method: "POST" });
      cargar();
    } catch (e) {
      alert(parseError(e));
    }
  }

  async function rechazar(id) {
    const motivo = prompt("Ingresa el motivo del rechazo (opcional):");
    try {
      await fetchJSON(`${API}/api/pedidos/pre/${id}/rechazar?notify=1`, {
        method: "POST",
        body: JSON.stringify({ motivo: motivo || "" }),
      });
      cargar();
    } catch (e) {
      alert(parseError(e));
    }
  }

  useEffect(() => { cargar(); }, []);

  const tableColumns = [
    {
      key: 'id',
      header: 'ID'
    },
    {
      key: 'cliente_nombre',
      header: 'Cliente'
    },
    {
      header: 'Fecha/Hora',
      cell: (p) => (
        <span>
          {p.fecha_entrega} {p.hora_entrega || ''}
        </span>
      )
    },
    {
      header: <span className="inline-block text-center w-full">Acciones</span>,
      cell: (p) => (
        <div className="inline-flex items-center gap-2">
          <Button 
            onClick={() => aprobar(p.id)} 
            className="bg-green-600 text-white hover:bg-green-700 px-3 py-1.5"
            size="sm"
          >
            Aprobar
          </Button>
          <Button 
            onClick={() => rechazar(p.id)} 
            className="bg-red-600 text-white hover:bg-red-700 px-3 py-1.5"
            size="sm"
          >
            Rechazar
          </Button>
        </div>
      )
    }
  ];

  const tableConfig = {
    rows: rows,
    columns: tableColumns
  };

  return (
    <div className="relative overflow-x-auto  sm:rounded-lg">
      <main className="w-full max-w-6xl mx-auto px-4 py-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Pedidos para aprobar</h1>
        </div>

        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}
        
        {loading ? (
          <div className="text-center text-gray-500 py-6">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-6 border border-[#8F5400] dark:border-gray-800 rounded-xl">
            No hay pedidos pendientes de aprobación
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#8F5400] dark:border-gray-800 rounded-xl">
            <Table className="min-w-[600px] w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400" config={tableConfig} />
          </div>
        )}
      </main>
    </div>
  );
}
