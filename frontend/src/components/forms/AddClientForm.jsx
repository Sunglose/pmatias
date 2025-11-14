import { Modal } from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

export default function AddClientForm({
  isOpen,
  onClose,
  values,
  setValues,
  errorMsg,
  saving,
  onSave,
}) {
  return (
    <Modal isOpen={isOpen} title="Agregar Cliente" onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Nombre <span className="text-red-600">*</span>
          </span>
          <Input
            value={values.nombre}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, "");
              setValues({ ...values, nombre: clean });
            }}
            required
            minLength={3}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">Local</span>
          <Input
            value={values.local}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]/g, "");
              setValues({ ...values, local: clean });
            }}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            RUT <span className="text-red-600">*</span>
          </span>
          <Input
            value={values.rut}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^0-9kK-]/g, "");
              setValues({ ...values, rut: clean });
            }}
            placeholder="12345678-9"
            maxLength={12}
            required
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Email <span className="text-red-600">*</span>
          </span>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            required
            placeholder="correo@ejemplo.com"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Teléfono <span className="text-red-600">*</span>
          </span>
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={9}
            value={values.telefono}
            onChange={(e) => {
              const onlyNums = e.target.value.replace(/\D/g, "").slice(0, 9);
              setValues({ ...values, telefono: onlyNums });
            }}
            required
            placeholder="987654321"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Dirección <span className="text-red-600">*</span>
          </span>
          <Input
            value={values.direccion}
            onChange={(e) => setValues({ ...values, direccion: e.target.value })}
            required
            minLength={5}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
      </div>

      {errorMsg && <div className="text-red-600 text-sm mt-3">{errorMsg}</div>}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Guardando…" : "Crear cliente"}
        </Button>
      </div>
    </Modal>
  );
}
