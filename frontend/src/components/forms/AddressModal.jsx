import { Modal } from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useAddressAutocomplete } from "../../hooks/useAddress";

export default function AddressModal({
  isOpen,
  title,
  onClose,
  addrText,
  setAddrText,
  addrMsg,
  onSave,
}) {
  const { suggestions, onInputChange, setSuggestions } = useAddressAutocomplete();

  function handleChange(e) {
    setAddrText(e.target.value);
    onInputChange(e.target.value);
  }

  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <label className="block">
        <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">Dirección</div>
        <div style={{ position: "relative" }}>
          <Input
            value={addrText}
            onChange={handleChange}
            placeholder="Calle #123, Comuna"
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
                // Extrae el número de casa del input original si existe
                const userInput = addrText.trim();
                const match = userInput.match(/(.+?)(?:\s*#\s*(\d+))?$/i);
                let customAddress = s.display_name;
                if (match && match[2]) {
                  // Si el usuario escribió un número (#5788), insértalo después del nombre de la calle
                  const [street, ...rest] = s.display_name.split(",");
                  customAddress = `${street.trim()} #${match[2]},${rest.join(",")}`;
                }
                // Tomar solo calle, número y ciudad
                const parts = customAddress.split(",").map(p => p.trim());
                const shortSuggestion = [parts[0], parts[2]].filter(Boolean).join(", ");
                return (
                  <li
                    key={s.place_id}
                    style={{ padding: "8px", cursor: "pointer" }}
                    onClick={() => {
                      setAddrText(shortSuggestion); // ← ahora se añade solo lo mostrado
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
