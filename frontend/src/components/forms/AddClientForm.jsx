import { Modal } from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useAddressAutocomplete } from "../../hooks/useAddress";
import { formatRut, validateRut } from "../../utils/rut";
import { useState } from "react";

export default function AddClientForm({
  isOpen,
  onClose,
  values,
  setValues,
  errorMsg,
  saving,
  onSave,
}) {
  const { suggestions, onInputChange, setSuggestions } = useAddressAutocomplete();
  const safeValues = values || { nombre: "", local: "", rut: "", email: "", telefono: "", direccion: "" };

  function handleNombreChange(e) {
    const clean = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, "");
    setValues({ ...values, nombre: clean });
  }

  function handleLocalChange(e) {
    const clean = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]/g, "");
    setValues({ ...values, local: clean });
  }

  function handleRutChange(e) {
    const clean = e.target.value.replace(/[^0-9kK]/g, "");
    setValues({ ...values, rut: formatRut(clean) });
  }

  function handleEmailChange(e) {
    const clean = e.target.value.replace(/[^a-zA-Z0-9.@_-]/g, "");
    setValues({ ...values, email: clean });
  }

  function handleTelefonoChange(e) {
    const onlyNums = e.target.value.replace(/\D/g, "").slice(0, 9);
    setValues({ ...values, telefono: onlyNums });
  }

  function handleDireccionChange(e) {
    setValues({ ...values, direccion: e.target.value });
    onInputChange(e.target.value);
  }

  return (
    <Modal isOpen={isOpen} title="Agregar cliente" onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Nombre <span className="text-red-600">*</span>
          </span>
          <Input
            value={safeValues.nombre}
            onChange={handleNombreChange}
            required
            minLength={3}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">Local</span>
          <Input
            value={safeValues.local}
            onChange={handleLocalChange}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            RUT <span className="text-red-600">*</span>
          </span>
          <Input
            value={safeValues.rut}
            onChange={handleRutChange}
            placeholder="Ej: 12345678-9 o 1234567-8"
            maxLength={10}
            required
            className="dark:bg-gray-800 dark:border-gray-700"
          />
          {safeValues.rut && !/^\d{7,8}-[0-9kK]$/.test(safeValues.rut) && (
            <div className="text-red-600 text-xs mt-1">Formato: 7 u 8 dígitos, guion y DV</div>
          )}
          {safeValues.rut && /^\d{7,8}-[0-9kK]$/.test(safeValues.rut) && !validateRut(safeValues.rut) && (
            <div className="text-red-600 text-xs mt-1">RUT inválido</div>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Email <span className="text-red-600">*</span>
          </span>
          <Input
            type="email"
            value={safeValues.email}
            onChange={handleEmailChange}
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
            value={safeValues.telefono}
            onChange={handleTelefonoChange}
            required
            placeholder="987654321"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Dirección <span className="text-red-600">*</span>
          </span>
          <div style={{ position: "relative" }}>
            <Input
              value={safeValues.direccion}
              onChange={handleDireccionChange}
              required
              minLength={5}
              className="dark:bg-gray-800 dark:border-gray-700"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  zIndex: 10,
                  background: "white",
                  border: "1px solid #ccc",
                  width: "100%",
                  maxHeight: "160px",
                  overflowY: "auto",
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {suggestions.map((s) => {
                  const userInput = safeValues.direccion.trim();
                  const match = userInput.match(/(.+?)(?:\s*#\s*(\d+))?$/i);
                  let customAddress = s.display_name;
                  if (match && match[2]) {
                    const [street, ...rest] = s.display_name.split(",");
                    customAddress = `${street.trim()} #${match[2]},${rest.join(",")}`;
                  }
                  const parts = customAddress.split(",").map((p) => p.trim());
                  const shortSuggestion = [parts[0], parts[2]].filter(Boolean).join(", ");
                  return (
                    <li
                      key={s.place_id}
                      style={{ padding: "8px", cursor: "pointer" }}
                      onClick={() => {
                        setValues({ ...values, direccion: shortSuggestion });
                        setSuggestions([]);
                      }}
                    >
                      {shortSuggestion}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </label>
      </div>

      {errorMsg && <div className="text-red-600 text-sm mt-3">{errorMsg}</div>}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Guardando..." : "Crear cliente"}
        </Button>
      </div>
    </Modal>
  );
}
