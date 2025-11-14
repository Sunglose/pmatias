import { parseResumen } from '../utils/pedidos';

export default function ProductsCell({ resumenStr = "" }) {
  const items = parseResumen(resumenStr);
  if (!items.length) return <span>—</span>;

  // Mostrar único producto
  if (items.length === 0) {
    const it = items[0];
    return (
      <span>
        {`${it.cantidad}${it.unidad === "kg" ? "KG" : "UN"} ${it.nombre}`}
      </span>
    );
  }

  // Múltiples productos con dropdown
  return (
    <details className="inline-block">
      <summary className="cursor-pointer select-none text-sm hover:underline">
        {items.length} producto/s
      </summary>
      <ul
        className="mt-2 text-sm p-2 border rounded-md bg-white dark:bg-gray-900
                   border-gray-200 dark:border-gray-800 max-h-56 overflow-y-auto w-64 shadow-md"
      >
        {items.map((it, idx) => (
          <li key={idx} className="flex justify-between">
            <span className="truncate">{it.nombre}</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {it.cantidad}{it.unidad === "kg" ? "KG" : "UN"}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}