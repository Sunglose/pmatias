// frontend/src/utils/errors.js
export function parseError(error) {
  try {
    if (typeof error === 'string') return error;
    const parsed = JSON.parse(error.message || '{}');
    return parsed.message || error.message || 'Error desconocido';
  } catch {
    return error?.message || 'Error desconocido';
  }
}