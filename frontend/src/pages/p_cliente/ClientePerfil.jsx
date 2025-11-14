import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FaPhone, FaEnvelope, FaHouse, FaKey, FaTrash, FaPen, FaPlus } from "react-icons/fa6";
import { FaStore } from "react-icons/fa";
import Button from "../../components/ui/Button";
import EditProfileModal from "../../components/forms/EditProfileModal";
import ChangePasswordModal from "../../components/forms/ChangePasswordModal";
import AddressModal from "../../components/forms/AddressModal";
import { fetchJSON } from "../../utils/fetch";
import { parseError } from "../../utils/errores";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ClientePerfil() {
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem("token"), []);
  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : undefined,
    }),
    [token]
  );

  // Estado base
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [profile, setProfile] = useState({
    id: null,
    email: "",
    rol: "",
    nombre: "",
    local: "",
    telefono: "",
    direccion: "",
    rut: "",
  });

  // Edit perfil
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ email: "", local: "", telefono: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Password
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  // Direcciones
  const [addresses, setAddresses] = useState([]); // {id, texto, es_principal}
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrEditing, setAddrEditing] = useState(null); // null = crear, {id, texto}
  const [addrText, setAddrText] = useState("");
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [addrMsg, setAddrMsg] = useState("");

  async function cargar() {
    try {
      const data = await fetchJSON(`${API_BASE}/api/account/profile`);
      setProfile({
        id: data.id,
        email: data.email || "",
        rol: data.rol || "",
        nombre: data.nombre || "",
        local: data.local || "",
        telefono: data.telefono || "",
        direccion: data.direccion || "",
        rut: data.rut || "",
      });

      const dirs = await fetchJSON(`${API_BASE}/api/account/addresses`);
      setAddresses(Array.isArray(dirs) ? dirs : []);
      const principal = (dirs || []).find((d) => d.es_principal);
      setSelectedAddrId(principal?.id ?? null);
    } catch (e) {
      alert(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  /* =================== Editar perfil =================== */
  function openEdit() {
    setForm({
      email: profile.email || "",
      local: profile.local || "",
      telefono: profile.telefono || "",
    });
    setProfileMsg("");
    setEditOpen(true);
  }

  async function saveProfile() {
    setProfileMsg("");
    if (!form.email || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) {
      setProfileMsg("Email inválido");
      return;
    }
    setSavingProfile(true);
    try {
      await fetchJSON(`${API_BASE}/api/account/profile`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setProfileMsg("Perfil actualizado");
      setTimeout(() => setEditOpen(false), 700);
      await cargar();
    } catch (e) {
      setProfileMsg(parseErr(e));
    } finally {
      setSavingProfile(false);
    }
  }

  /* =================== Cambiar contraseña =================== */
  function openPw() {
    setNewPw1("");
    setNewPw2("");
    setPwMsg("");
    setPwOpen(true);
  }

  async function handleChangePassword() {
    setPwMsg("");
    if (!newPw1 || newPw1.length < 6) {
      setPwMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPw1 !== newPw2) {
      setPwMsg("Las contraseñas no coinciden.");
      return;
    }
    setSavingPw(true);
    try {
      await fetchJSON(`${API_BASE}/api/account/password`, {
        method: "PUT",
        body: JSON.stringify({ new_password: newPw1 }),
      });
      setPwMsg("Contraseña actualizada correctamente.");
      setTimeout(() => setPwOpen(false), 900);
    } catch (e) {
      setPwMsg(parseErr(e));
    } finally {
      setSavingPw(false);
    }
  }

  /* =================== Direcciones =================== */
  function openNewAddr() {
    setAddrEditing(null);
    setAddrText("");
    setAddrMsg("");
    setAddrOpen(true);
  }
  function openEditAddr(addr) {
    setAddrEditing(addr);
    setAddrText(addr.texto || "");
    setAddrMsg("");
    setAddrOpen(true);
  }

  async function saveAddress() {
    setAddrMsg("");
    const txt = addrText.trim();
    if (!txt) return setAddrMsg("Ingresa una dirección.");
    try {
      if (addrEditing) {
        await fetchJSON(`${API_BASE}/api/account/addresses/${addrEditing.id}`, {
          method: "PUT",
          body: JSON.stringify({ texto: txt }),
        });
      } else {
        await fetchJSON(`${API_BASE}/api/account/addresses`, {
          method: "POST",
          body: JSON.stringify({ texto: txt }),
        });
      }
      setAddrOpen(false);
      await cargar();
    } catch (e) {
      setAddrMsg(parseErr(e));
    }
  }

  async function removeAddress(id) {
    if (!confirm("¿Eliminar esta dirección?")) return;
    try {
      await fetchJSON(`${API_BASE}/api/account/addresses/${id}`, { method: "DELETE" });
      await cargar();
    } catch (e) {
      alert(parseError(e));
    }
  }

  const isDirtySelection = () => {
    const principal = addresses.find((a) => a.es_principal);
    return selectedAddrId && principal && selectedAddrId !== principal.id;
  };

  async function saveDefaultSelection() {
    if (!selectedAddrId) return;
    try {
      await fetchJSON(`${API_BASE}/api/account/addresses/${selectedAddrId}/default`, { method: "PATCH" });
      await cargar();
    } catch (e) {
      alert(parseError(e));
    }
  }

  /*  UI  */
  return (
    <div className="min-h-screen text-black dark:bg-gray-900 dark:text-white flex flex-col">

      {/* Contenido */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

        {loading ? (
          <div className="text-sm text-gray-500">Cargando…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Perfil */}
            <section className="border border-[#8F5400] bg-white dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4">Mi perfil</h2>
              <div className="space-y-4">
                <Row icon={<FaHouse />} label="Nombre">{profile.nombre || "—"}</Row>
                <Row icon={<FaStore />} label="Local">{profile.local || "—"}</Row>
                <Row icon={<FaPhone />} label="Teléfono">{profile.telefono || "—"}</Row>
                <Row icon={<FaEnvelope />} label="Correo">{profile.email || "—"}</Row>
                <Row icon={<FaHouse />} label="Dirección principal">
                  {
                    (addresses.find((a) => a.es_principal)?.texto) || profile.direccion || "—"
                  }
                </Row>
              </div>

              <div className="pt-6 flex gap-1 justify-end">
                <Button variant="secondary"
                  onClick={openEdit}
                >
                  <FaPen /> Editar perfil
                </Button>
                <Button
                  onClick={openPw}
                >
                  <FaKey /> Cambiar contraseña
                </Button>
              </div>
            </section>

            {/* Direcciones */}
            <section className="border border-[#8F5400] bg-white dark:border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Mis direcciones</h2>
                <Button
                  onClick={openNewAddr}
                  disabled={addresses.length >= 5}
                  title={addresses.length >= 5 ? "Máximo 5 direcciones" : "Agregar"}
                >
                  <FaPlus /> Agregar
                </Button>
              </div>

              <ul className="space-y-3 max-h-[360px] overflow-auto pr-1">
                {addresses.map((addr) => (
                  <li
                    key={addr.id}
                    className="flex items-center gap-3 border border-[#8F5400]  dark:border-gray-800 rounded-lg px-3 py-2"
                  >
                    <input
                      type="radio"
                      name="addr_default"
                      checked={selectedAddrId === addr.id}
                      onChange={() => setSelectedAddrId(addr.id)}
                      className="w-4 h-4 accent-[#8F5400] dark:accent-white"
                      title="Seleccionar como principal"
                    />
                    <div className="flex-1 truncate">{addr.texto}</div>
                    <div className="flex items-center">
                      <Button
                        variant="secondary"
                        title="Editar"
                        onClick={() => openEditAddr(addr)}
                      >
                        <FaPen />
                      </Button>
                      <Button
                        variant="eliminar"
                        onClick={() => removeAddress(addr.id)}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </li>
                ))}
                {addresses.length === 0 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400">
                    Aún no tienes direcciones guardadas.
                  </li>
                )}
              </ul>

              {isDirtySelection() && (
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={saveDefaultSelection}
                  >
                    Guardar dirección principal
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Modal editar perfil */}
      <EditProfileModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        form={form}
        setForm={setForm}
        onSave={saveProfile}
        saving={savingProfile}
        profileMsg={profileMsg}
      />

      {/* Modal cambiar contraseña */}
      <ChangePasswordModal
        isOpen={pwOpen}
        onClose={() => setPwOpen(false)}
        newPw1={newPw1}
        setNewPw1={setNewPw1}
        newPw2={newPw2}
        setNewPw2={setNewPw2}
        pwMsg={pwMsg}
        saving={savingPw}
        onSave={handleChangePassword}
      />

      {/* Modal direcciones (crear/editar) */}
      <AddressModal
        isOpen={addrOpen}
        title={addrEditing ? "Editar dirección" : "Nueva dirección"}
        onClose={() => setAddrOpen(false)}
        addrText={addrText}
        setAddrText={setAddrText}
        addrMsg={addrMsg}
        onSave={saveAddress}
      />
    </div>
  );
}

/* ---------- Subcomponentes ---------- */
function Row({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-gray-600 dark:text-gray-300">{icon}</div>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-[15px]">{children}</div>
      </div>
    </div>
  );
}
