import { Modal } from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

export default function CrearEditarModal({
  isOpen,
  editing,
  nombre,
  setNombre,
  onPickFile,
  preview,
  onClose,
  onSubmit,
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={editing ? "Editar producto" : "Agregar producto"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Nombre</div>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del producto"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="block">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Imagen</div>
          <input
            type="file"
            accept="image/*"
            onChange={onPickFile}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:bg-gray-50 file:text-gray-700 dark:file:bg-gray-800 dark:file:text-gray-200 file:border-gray-300 dark:file:border-gray-700"
          />
        </label>

        <div className="md:col-span-2">
          <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Vista previa</div>
          <div className="aspect-video rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img src={preview} alt="Vista previa" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">Sin imagen seleccionada</span>
            )}
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {editing ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
