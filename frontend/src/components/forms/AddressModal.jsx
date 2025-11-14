import { Modal } from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

export default function AddressModal({
  isOpen,
  title,
  onClose,
  addrText,
  setAddrText,
  addrMsg,
  onSave,
}) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <label className="block">
        <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Dirección</div>
        <Input
          value={addrText}
          onChange={(e) => setAddrText(e.target.value)}
          placeholder="Calle #123, Comuna"
          className="dark:bg-gray-800 dark:border-gray-700"
        />
      </label>

      {addrMsg && <div className="mt-2 text-sm text-red-600">{addrMsg}</div>}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onSave}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
