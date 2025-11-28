import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { FaTrashCan, FaEye, FaPlus, FaTruck } from "react-icons/fa6";
import Button from "../../components/ui/Button";
import Paginacion from "../../components/ui/Paginacion";
import { Table } from "../../components/ui/Table";
import { fetchJSON } from "../../utils/fetch";
import { parseError } from "../../utils/errores";
import AddClientForm from "../../components/forms/AddClientForm";
import EditRepartoForm from "../../components/forms/EditRepartoModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminClientes() {
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem("token"), []);
  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : undefined }),
    [token]
  );

  // Hover contraseña temporal
  const [hoverId, setHoverId] = useState(null);
  const [hoverPass, setHoverPass] = useState("");

  // Búsqueda y data
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientes, setClientes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 7;

  // Modal Agregar
  const [modalError, setModalError] = useState("");
  const [openNuevo, setOpenNuevo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", local: "", rut: "", email: "", telefono: "", direccion: "" });
  const [repartoHabilitado, setRepartoHabilitado] = useState(false);
  const [horariosReparto, setHorariosReparto] = useState([]);

  // Modal Editar Reparto
  const [openEditarReparto, setOpenEditarReparto] = useState(false);
  const [clienteReparto, setClienteReparto] = useState(null);
  const [horariosRepartoEditar, setHorariosRepartoEditar] = useState([]);

  // Toast éxito
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  function showToast(msg) {
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 3000);
  }

  async function cargar(pageNum = 1) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: String(limit) });
      if (buscar.trim()) params.set("buscar", buscar.trim());
      const data = await fetchJSON(`${API}/api/clientes?${params}`);
      const lista = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setClientes(lista);
      setPage(pageNum);

      if (data?.meta && (data.meta.totalPages || data.meta.total)) {
        const tp = Number(data.meta.totalPages) || Math.ceil(Number(data.meta.total) / limit) || 1;
        setTotalPages(tp);
      } else {
        if (lista.length < limit) {
          setTotalPages(pageNum);
        } else {
          const qsNext = new URLSearchParams({
            page: String(pageNum + 1),
            limit: String(limit),
          });
          if (buscar.trim()) qsNext.set("buscar", buscar.trim());
          const next = await fetchJSON(`${API}/api/clientes?${qsNext}`);
          const nextList = Array.isArray(next?.data) ? next.data : Array.isArray(next) ? next : [];
          setTotalPages(nextList.length > 0 ? pageNum + 1 : pageNum);
        }
      }
    } catch (e) {
      alert(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    setTotalPages(1);
    cargar(1);
  }, [buscar]);

  useEffect(() => { cargar(1); }, []);

  async function crearCliente() {
    if (!nuevo.nombre || !nuevo.rut || !nuevo.email || !nuevo.direccion) {
      setModalError("Completa todos los campos obligatorios (*)");
      return;
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(nuevo.email)) {
      setModalError("Email inválido");
      return;
    }
    if (!/^\d{7,8}-[0-9kK]$/.test(nuevo.rut)) {
      setModalError("RUT inválido. Formato esperado: 12345678-9");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const res = await fetchJSON(`${API}/api/clientes`, {
        method: "POST",
        body: JSON.stringify(nuevo),
      });
      if (repartoHabilitado && horariosReparto.length > 0) {
        for (const h of horariosReparto) {
          if (!h.dia_semana || !h.hora) {
            setModalError("Completa todos los campos de los horarios de reparto.");
            return;
          }
        }
        for (const h of horariosReparto) {
          await fetchJSON(`${API}/api/clientes/${res.id}/horarios-reparto`, {
            method: "POST",
            body: JSON.stringify(h),
          });
        }
      }
      showToast("✓ Cliente agregado con éxito");
      setOpenNuevo(false);
      setNuevo({ nombre: "", local: "", rut: "", email: "", telefono: "", direccion: "" });
      await cargar(1);
    } catch (e) {
      alert(parseError(e));
    } finally {
      setSaving(false);
    }
  }

  async function fetchTempPassword(clienteId) {
    try {
      const data = await fetchJSON(`${API}/api/clientes/${clienteId}/temp-password`);
      setHoverPass(data.password_temporal || "");
    } catch (e) {
      alert(parseError(e));
    }
  }

  async function onDeleteCliente(clienteId) {
    if (!confirm("¿Eliminar cliente y su usuario? Esta acción es permanente.")) return;
    try {
      const res = await fetch(`${API}/api/clientes/${clienteId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(await res.text());
      await cargar(page);
    } catch (e) {
      setError(parseError(e));
    }
  }

  function CredButton({ c }) {
    return (
      <div className="flex items-center justify-center gap-2">
        {Boolean(c.has_temp) ? (
          <div
            className="relative inline-block"
            onMouseEnter={() => { setHoverId(c.usuario_id); fetchTempPassword(c.usuario_id); }}
            onMouseLeave={() => { setHoverId(null); setHoverPass(""); }}
          >
            <Button
              type="button"
              className="h-8 px-3 rounded-lg bg-transparent border border-gray-900 dark:border-gray-200 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Ver contraseña temporal"
              title="Ver contraseña temporal"
            >
              <FaEye />
            </Button>
            {hoverId === c.usuario_id && hoverPass && (
              <div
                className="absolute -top-2 -translate-y-full left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-md px-2 py-1 shadow-lg whitespace-nowrap z-20"
              >
                {hoverPass}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
        <Button
          type="button"
          onClick={() => onDeleteCliente(c.usuario_id)}
          title="Eliminar cliente y usuario"
          className="h-8 px-2.5 rounded-lg bg-red-600 hover:bg-red-700"
        >
          <FaTrashCan className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          onClick={() => openEditarRepartoCliente(c)}
          title="Editar reparto"
          className="h-8 px-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          <FaTruck className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const tableColumns = [
    {
      key: 'usuario_id',
      header: '#'
    },
    {
      key: 'nombre',
      header: 'Nombre'
    },
    {
      key: 'local',
      header: 'Local'
    },
    {
      header: 'RUT',
      cell: (c) => c.rut || '-'
    },
    {
      key: 'email',
      header: 'Email'
    },
    {
      header: 'Teléfono',
      cell: (c) => c.telefono || '-'
    },
    {
      header: 'Dirección',
      cell: (c) => c.direccion || '-'
    },
    {
      header: 'Opciones',
      cell: (c) => <CredButton c={c} />
    }
  ];

  const tableConfig = {
    rows: clientes,
    columns: tableColumns
  };

  async function openEditarRepartoCliente(cliente) {
    setClienteReparto(cliente);
    setOpenEditarReparto(true);
    const horarios = await fetchJSON(`${API}/api/clientes/${cliente.cliente_id}/horarios-reparto`);
    setHorariosRepartoEditar(horarios);
  }

  return (
    <div className="min-h-screen flex flex-col text-black dark:bg-gray-900 dark:text-white">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto">
          {/* Barra de búsqueda */}
          <div className="flex items-center gap-2 mb-6 mt-6">
            <input
              className="flex-1 min-w-0 border border-[#8F5400] dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 sm:max-w-md"
              placeholder="Buscar por nombre, email o RUT"
              value={buscar}
              onChange={(e)=>{
                const safe = e.target.value.replace(/[^a-zA-Z0-9.@]/g, "");
                setBuscar(safe)}
              }
              onKeyDown={(e) => e.key === "Enter" && cargar(1)}
            />
            <Button
              type="button"
              className="h-10 w-10 shrink-0 sm:w-auto sm:px-4 rounded-xl flex items-center justify-center bg-[#8F5400] hover:bg-[#7a4700]"
              onClick={() => cargar(1)}
              title="Buscar"
              aria-label="Buscar"
            >
              <FaSearch className="w-5 h-5" />
              <span className="hidden sm:inline ml-2">Buscar</span>
            </Button>
            <Button
              type="button"
              className="h-10 w-10 shrink-0 sm:w-auto sm:px-4 md:ml-auto rounded-xl flex items-center justify-center dark:bg-white dark:text-black"
              onClick={() => {
                setOpenNuevo(true);
                setRepartoHabilitado(false);
                setHorariosReparto([]);
              }}
              title="Agregar cliente"
              aria-label="Agregar cliente"
            >
              <FaPlus className="w-5 h-5" />
              <span className="hidden sm:inline ml-2">Agregar</span>
            </Button>
          </div>

          {error && (
            <div className="text-red-600 text-sm mb-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-6">
              Cargando...
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-6 border border-[#8F5400] dark:border-gray-800 rounded-xl">
              Sin resultados
            </div>
          ) : (
            <Table config={tableConfig} />
          )}

          {/* Controles de paginación */}
          <Paginacion
            page={page}
            totalPages={Math.max(1, totalPages)}
            onChange={(n) => cargar(n)}
            disabled={loading}
          />
        </div>
      </main>

      <AddClientForm
        isOpen={openNuevo}
        onClose={() => {
          setOpenNuevo(false);
          setModalError("");
          setRepartoHabilitado(false);
          setHorariosReparto([]);
        }}
        values={nuevo}
        setValues={setNuevo}
        errorMsg={modalError}
        saving={saving}
        onSave={crearCliente}
        repartoHabilitado={repartoHabilitado}
        setRepartoHabilitado={setRepartoHabilitado}
        horariosReparto={horariosReparto}
        setHorariosReparto={setHorariosReparto}
      />

      {toastOpen && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 right-6 z-[60] bg-emerald-900 text-emerald-100 border border-emerald-900 rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 max-w-xs"
        >
          <span className="font-bold">Éxito</span>
          <span className="opacity-90">{toastMsg}</span>
          <Button
            type="button"
            onClick={() => setToastOpen(false)}
            className="ml-auto h-6 px-2 bg-transparent shadow-none text-emerald-100 hover:text-white rounded-md"
            aria-label="Cerrar notificación"
            title="Cerrar"
          >
            ×
          </Button>
        </div>
      )}

      {/* Modal Editar Reparto */}
      <EditRepartoForm
        isOpen={openEditarReparto}
        onClose={() => {
          setOpenEditarReparto(false);
          setClienteReparto(null);
          setHorariosRepartoEditar([]);
        }}
        cliente={clienteReparto}
        horarios={horariosRepartoEditar}
        setHorarios={setHorariosRepartoEditar}
        onSave={async () => {
          const horariosActuales = await fetchJSON(`${API}/api/clientes/${clienteReparto.cliente_id}/horarios-reparto`);
          for (const h of horariosActuales) {
            await fetchJSON(`${API}/api/clientes/${clienteReparto.cliente_id}/horarios-reparto/${h.id}`, {
              method: "DELETE"
            });
          }
          for (const h of horariosRepartoEditar) {
            await fetchJSON(`${API}/api/clientes/${clienteReparto.cliente_id}/horarios-reparto`, {
              method: "POST",
              body: JSON.stringify(h),
            });
          }
          setOpenEditarReparto(false);
          setClienteReparto(null);
          setHorariosRepartoEditar([]);
          await cargar(1);
        }}
      />
    </div>
  );
}