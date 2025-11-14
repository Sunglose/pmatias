// src/services/approval.service.js
export function requiereAprobPorItem(items = []) {
  // Requiere aprobación si algún producto supera el límite individual
  const LIMITE_UN = 100;
  const LIMITE_KG = 100;
  for (const it of items) {
    if (it.unidad === "un" && Number(it.cantidad) >= LIMITE_UN) return true;
    if (it.unidad === "kg" && Number(it.cantidad) >= LIMITE_KG) return true;
  }
  return false;
}
