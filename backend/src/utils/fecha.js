export function formatFechaDDMMYYYY(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return `${d}-${m}-${y}`;
}

export function getTomorrowYMD() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const tmr = new Date(now);
  tmr.setDate(now.getDate() + 1);
  return tmr.toISOString().slice(0, 10);
}

export function fechaProgramadaLegible(fecha_iso, hora_HHmm) {
  try {
    const f = new Date(`${fecha_iso}T${hora_HHmm}:00`);
    const fecha = f.toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" });
    const hora  = f.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    return `${fecha} a las ${hora}`;
  } catch {
    return `${fecha_iso} ${hora_HHmm}`;
  }
}

export function getMaxDateYMD(daysFromTomorrow = 7) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + daysFromTomorrow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
