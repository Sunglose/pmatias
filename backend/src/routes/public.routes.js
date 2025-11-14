// src/routes/public.routes.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/auth.middleware.js";
import { pool } from "../db.js";
import { crearPrePedidoPublic } from "../controllers/prepedidos.controller.js"; // alias al controlador

const router = Router();

/** Catálogo público para kiosco/pasajero */
router.get("/productos", asyncHandler(async (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  const [rows] = await pool.query(
    `SELECT id, nombre, imagen_path
     FROM productos
     WHERE activo=1
     ORDER BY nombre ASC`
  );
  const data = rows.map(r => ({
    id: r.id,
    nombre: r.nombre,
    imagen_url: r.imagen_path ? `${base}/uploads/${r.imagen_path}` : null,
  }));
  res.json(data);
}));

// Alias público para compatibilidad: POST /api/public/prepedidos
router.post("/prepedidos", asyncHandler(crearPrePedidoPublic));

export default router;
