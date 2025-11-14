import { Modal } from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

export default function ChangePasswordModal({
  isOpen,
  onClose,
  newPw1,
  setNewPw1,
  newPw2,
  setNewPw2,
  pwMsg,
  saving,
  onSave,
}) {
  return (
    <Modal isOpen={isOpen} title="Cambiar contraseña" onClose={onClose}>
      <div className="grid grid-cols-1 gap-4">
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Nueva contraseña</div>
          <Input
            type="password"
            value={newPw1}
            onChange={(e) => setNewPw1(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Repite la nueva contraseña</div>
          <Input
            type="password"
            value={newPw2}
            onChange={(e) => setNewPw2(e.target.value)}
            placeholder="Debe coincidir"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
        {pwMsg && (
          <div className={`text-sm ${pwMsg.startsWith("La contraseña") || pwMsg.startsWith("Las contra") ? "text-red-600" : "text-green-600"}`}>
            {pwMsg}
          </div>
        )}
      </div>

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
