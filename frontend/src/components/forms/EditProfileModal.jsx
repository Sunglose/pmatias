import { Modal } from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

export default function EditProfileModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
  saving,
  profileMsg,
}) {
  // Validación en tiempo real para cada input
  function handleChange(e) {
    const { name, value } = e.target;
    let safeValue = value;

    if (name === "telefono") {
      // Solo números, máximo 9 dígitos
      safeValue = value.replace(/\D/g, "").slice(0, 9);
    }
    if (name === "email") {
      // Solo letras, números, puntos, guion bajo, guion y @
      safeValue = value.replace(/[^a-zA-Z0-9.@_-]/g, "");
    }
    if (name === "local") {
      // Letras, números, tildes, ñ y espacios
      safeValue = value.replace(/[^a-zA-Z0-9ÁÉÍÓÚáéíóúÑñ\s]/g, "");
    }

    setForm({ ...form, [name]: safeValue });
  }

  return (
    <Modal isOpen={isOpen} title="Editar perfil" onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Local (opcional)</div>
          <Input
            name="local"
            value={form.local}
            onChange={handleChange}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Teléfono</div>
          <Input
            name="telefono"
            type="tel"
            inputMode="numeric"
            maxLength={9}
            value={form.telefono}
            onChange={handleChange}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Correo</div>
          <Input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
      </div>

      {profileMsg && (
        <div className={`mt-3 text-sm ${profileMsg.includes("actualizado") ? "text-green-600" : "text-red-600"}`}>
          {profileMsg}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Modal>
  );
}
