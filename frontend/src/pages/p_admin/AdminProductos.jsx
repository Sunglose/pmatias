import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FaTrashCan } from "react-icons/fa6";
import CrearEditarModal from "../../components/forms/CrearEditarModal";
import Button from "../../components/ui/Button";
import { fetchJSON } from "../../utils/fetch";
import { parseError } from "../../utils/errores";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminProductos() {
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem("token"), []);
  const authHeader = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  async function cargar() {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchJSON(`${API}/api/productos/admin`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function toggleActivoProducto(id) {
    try {
      await fetchJSON(`${API}/api/productos/${id}/activo`, {
        method: "PATCH",
        // si quisieras forzar un valor: body: JSON.stringify({ activo: true|false })
      });
      await cargar();
    } catch (e) {
      alert(parseError(e));
    }
  }

  function openCreate() {
    setEditing(null);
    setNombre("");
    setFile(null);
    setPreview("");
    setOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setNombre(row.nombre || "");
    setFile(null);
    setPreview(row.imagen_url || "");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setNombre("");
    setFile(null);
    setPreview("");
  }

  function onPickFile(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : editing?.imagen_url || "");
  }

  async function onSave(e) {
    e.preventDefault();
    if (!nombre.trim()) {
      alert("Ingresa un nombre.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("nombre", nombre.trim());
      if (file) fd.append("imagen", file);

      const res = await fetch(
        `${API}/api/productos${editing ? `/${editing.id}` : ""}`,
        {
          method: editing ? "PUT" : "POST",
          headers: { ...authHeader },
          body: fd,
        }
      );

      if (!res.ok) throw new Error(await res.text());
      await cargar();
      closeModal();
    } catch (e) {
      alert(parseError(e));
    }
  }

  async function onDelete(id) {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      const res = await fetch(`${API}/api/productos/${id}`, {
        method: "DELETE",
        headers: { ...authHeader },
      });
      if (!res.ok) throw new Error(await res.text());
      await cargar();
    } catch (e) {
      alert(parseError(e));
    }
  }

  return (
    <div className="min-h-screen flex flex-col text-white dark:bg-gray-900 dark:text-white">
      <main className="w-full max-w-6xl mx-auto px-4 py-6 flex-1">
        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

        <div className="mb-4 flex justify-end">
          <Button onClick={openCreate}>
            + Agregar producto
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="border border-[#8F5400] dark:border-gray-800 rounded-xl p-3 flex flex-col">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 mb-3 flex items-center justify-center">
                {r.imagen_url ? (
                  <img src={r.imagen_url} alt={r.nombre} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-xs text-gray-500">Sin imagen</span>
                )}
              </div>
              <div className="font-medium mb-3 truncate text-sm text-black">{r.nombre}</div>
              <div className="mt-auto flex flex-col gap-2">
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => openEdit(r)}
                >
                  Editar
                </Button>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => toggleActivoProducto(r.id)}
                    className={`flex-1 text-xs ${
                      r.activo
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                    title={r.activo ? "Desactivar (ocultar del catálogo)" : "Activar (mostrar en catálogo)"}
                  >
                    {r.activo ? "Activo" : "Inactivo"}
                  </Button>

                  <Button
                    size="sm"
                    className="px-2 bg-red-600 text-white hover:bg-red-700"
                    onClick={() => onDelete(r.id)}
                    title="Eliminar producto"
                  >
                    <FaTrashCan className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!loading && rows.length === 0 && (
            <div className="col-span-full text-sm text-gray-500 dark:text-gray-400">
              No hay productos
            </div>
          )}
        </div>
      </main>

      {/* Modal crear/editar producto */}
      {open && (
        <CrearEditarModal
          isOpen={open}
          editing={editing}
          nombre={nombre}
          setNombre={setNombre}
          onPickFile={onPickFile}
          preview={preview}
          onClose={closeModal}
          onSubmit={onSave}
        />
      )}
    </div>
  );
}
