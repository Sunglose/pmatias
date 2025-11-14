// frontend/src/utils/pedidos.js
export function parseResumen(str = "") {
  return str
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(KG|UN)\s+(.+)$/i);
      if (!m) return null;
      const cantidad = Number(m[1].replace(",", "."));
      const unidad = m[2].toLowerCase() === "kg" ? "kg" : "un";
      const nombre = m[3].trim();
      return { cantidad, unidad, nombre };
    })
    .filter(Boolean);
}

export function formatFecha(iso) {
  if (!iso) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(iso)) return iso;
  const [y, m, d] = String(iso).split("-");
  return `${d}-${m}`;
}

export function mapEntrega(tipo) {
  if (tipo === "reparto") return "Reparto";
  if (tipo === "retiro") return "Retiro";
  return "—";
}