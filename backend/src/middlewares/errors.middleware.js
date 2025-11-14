// rutas inexistentes
export function notFound(_req, res, _next) {
  res.status(404).json({ message: "Ruta no encontrada" });
}

// errores globales
export function errorHandler(err, _req, res, _next) {
  if (process.env.NODE_ENV !== "production") {
    console.error("Error:", err);
  }

  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor",
  });
}
