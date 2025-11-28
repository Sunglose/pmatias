export function parseError(error) {
  try {
    if (typeof error === 'string') return error;
    const parsed = JSON.parse(error.message || '{}');
    return parsed.message || error.message || 'Error desconocido';
  } catch {
    return error?.message || 'Error desconocido';
  }
}

export function sanitizeInput(str) {
  if (typeof str !== "string") return "";
  return str.trim().replace(/[<>{}[\];$]/g, "");
}