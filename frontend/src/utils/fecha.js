export function getTomorrowYMD() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export function formatFecha(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}

/**
 * @param {number} daysFromTomorrow
 */
export function getMaxDateYMD(daysFromTomorrow = 6) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + daysFromTomorrow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}