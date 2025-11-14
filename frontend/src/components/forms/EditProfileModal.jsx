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
  return (
    <Modal isOpen={isOpen} title="Editar perfil" onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Local (opcional)</div>
          <Input
            value={form.local}
            onChange={(e) => setForm({ ...form, local: e.target.value })}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Teléfono</div>
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={9}
            value={form.telefono}
            onChange={(e) =>
              setForm({ ...form, telefono: e.target.value.replace(/\D/g, "").slice(0, 9) })
            }
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Correo</div>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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
