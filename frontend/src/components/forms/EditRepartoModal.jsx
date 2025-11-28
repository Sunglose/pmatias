import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useState } from "react";

export default function EditRepartoForm({
  isOpen,
  onClose,
  cliente,
  horarios,
  setHorarios,
  onSave,
}) {
  const [error, setError] = useState("");

  function handleAddHorario() {
    setHorarios([...horarios, { hora: "" }]);
  }

  function handleSave() {
    for (const h of horarios) {
      if (!h.hora) {
        setError("Completa todos los campos de los horarios de reparto.");
        return;
      }
    }
    setError("");
    onSave();
  }

  return (
    <Modal isOpen={isOpen} title={`Editar reparto de ${cliente?.nombre || ""}`} onClose={onClose}>
      <div className="mb-2 font-semibold text-yellow-900">Horarios de reparto acordados:</div>
      {horarios.map((h, idx) => (
        <div key={idx} className="flex gap-2 mb-2 items-center">
          <select
            value={h.hora.slice(0,2)}
            onChange={e => {
              const arr = [...horarios];
              arr[idx].hora = `${e.target.value}:${h.hora.slice(3,5) || "00"}`;
              setHorarios(arr);
            }}
            className="border rounded px-2 py-1"
          >
            <option value="">Hora</option>
            {Array.from({ length: 11 }, (_, i) => {
              const hour = String(i + 8).padStart(2, "0");
              return <option key={hour} value={hour}>{hour}</option>;
            })}
          </select>
          <select
            value={h.hora.slice(3,5)}
            onChange={e => {
              const arr = [...horarios];
              arr[idx].hora = `${h.hora.slice(0,2)}:${e.target.value}`;
              setHorarios(arr);
            }}
            className="border rounded px-2 py-1"
          >
            <option value="">Minutos</option>
            {["00","10","20","30","40","50"].map(min => (
              <option key={min} value={min}>{min}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setHorarios(horarios.filter((_, i) => i !== idx))}
            className="text-red-600 px-2"
          >
            Eliminar
          </button>
        </div>
      ))}
      <Button
        type="button"
        onClick={handleAddHorario}
        className="mt-1 px-3 py-1 bg-yellow-600 text-white rounded"
      >
        Agregar horario
      </Button>
      {error && <div className="mt-2 text-red-600">{error}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}