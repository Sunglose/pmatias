import { Router } from "express";
import upload from "../lib/upload.js";
import { authRequired, requireRoles, asyncHandler } from "./auth.js";
import { pool } from "../db.js";
import fs from "fs/promises";
import path from "path";

const router = Router();

// Helpers
function buildImageURL(req, imagenPath) {
  if (!imagenPath) return null;
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${imagenPath}`;
}
function absUploadPath(relPath) {
  return path.resolve("uploads", relPath || "");
}

// ========================= Listar CATÁLOGO =========================
// GET /api/productos
router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nombre, imagen_path, activo
     FROM productos
     WHERE activo = 1
     ORDER BY nombre ASC`
  );

  const out = rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    imagen_path: r.imagen_path,
    imagen_url: buildImageURL(req, r.imagen_path),
    activo: !!r.activo,
  }));

  res.json(out);
}));

// ========================= Listar ADMIN =========================
// GET /api/productos/admin
router.get("/admin", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nombre, imagen_path, activo
     FROM productos
     ORDER BY nombre ASC`
  );

  const out = rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    imagen_path: r.imagen_path,
    imagen_url: buildImageURL(req, r.imagen_path),
    activo: !!r.activo,
  }));

  res.json(out);
}));

// ========================= Crear =========================
router.post("/", authRequired, requireRoles("admin"), upload.single("imagen"), asyncHandler(async (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: "nombre requerido" });
  }

  try {
    const imagenRel = req.file ? `products/${req.file.filename}` : null;
    const [r] = await pool.query(
      `INSERT INTO productos (nombre, imagen_path) VALUES (?, ?)`,
      [String(nombre).trim(), imagenRel]
    );

    res.status(201).json({
      id: r.insertId,
      nombre: String(nombre).trim(),
      imagen_path: imagenRel,
      imagen_url: buildImageURL(req, imagenRel),
      activo: true,
    });
  } catch {
    res.status(500).json({ message: "Error creando producto" });
  }
}));

// ========================= Actualizar =========================
router.put("/:id", authRequired, requireRoles("admin"), upload.single("imagen"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const nombre = req.body?.nombre?.trim();

  try {
    const [curRows] = await pool.query(
      `SELECT id, nombre, imagen_path FROM productos WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!curRows.length) return res.status(404).json({ message: "Producto no encontrado" });

    const current = curRows[0];
    const hasNewImage = !!req.file;
    const newImagenRel = hasNewImage ? `products/${req.file.filename}` : current.imagen_path;

    const fields = [];
    const params = [];

    if (nombre) { fields.push("nombre = ?"); params.push(nombre); }
    if (hasNewImage) { fields.push("imagen_path = ?"); params.push(newImagenRel); }

    if (fields.length === 0) {
      return res.json({
        updated: false,
        id: current.id,
        nombre: current.nombre,
        imagen_path: current.imagen_path,
        imagen_url: buildImageURL(req, current.imagen_path),
      });
    }

    params.push(id);
    const [r] = await pool.query(
      `UPDATE productos SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "Producto no encontrado" });

    if (hasNewImage && current.imagen_path) {
      try { await fs.unlink(absUploadPath(current.imagen_path)); } catch { /* ignore */ }
    }

    res.json({
      updated: true,
      id: Number(id),
      nombre: nombre || current.nombre,
      imagen_path: newImagenRel,
      imagen_url: buildImageURL(req, newImagenRel),
    });
  } catch {
    res.status(500).json({ message: "Error actualizando producto" });
  }
}));

// ========================= Eliminar =========================
router.delete("/:id", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const [curRows] = await pool.query(
      `SELECT imagen_path FROM productos WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!curRows.length) return res.status(404).json({ message: "Producto no encontrado" });

    const imagenRel = curRows[0].imagen_path;
    const [r] = await pool.query(`DELETE FROM productos WHERE id = ?`, [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Producto no encontrado" });

    if (imagenRel) {
      try { await fs.unlink(absUploadPath(imagenRel)); } catch { /* ignore */ }
    }

    res.json({ deleted: true });
  } catch (e) {
    if (e.errno === 1451) {
      return res.status(409).json({ message: "No se puede eliminar: usado en pedidos" });
    }
    res.status(500).json({ message: "Error eliminando producto" });
  }
}));

// ========================= Activar / Desactivar =========================
// PATCH /api/productos/:id/activo
router.patch("/:id/activo", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { activo } = req.body || {};

  const [curRows] = await pool.query(`SELECT activo FROM productos WHERE id = ?`, [id]);
  if (!curRows.length) return res.status(404).json({ message: "Producto no encontrado" });

  const actual = curRows[0].activo;
  let nuevoActivo;
  if (activo === undefined || activo === null) {
    nuevoActivo = actual ? 0 : 1;
  } else {
    nuevoActivo = (activo === true || activo === "true" || Number(activo) === 1) ? 1 : 0;
  }

  const [r] = await pool.query(`UPDATE productos SET activo = ? WHERE id = ?`, [nuevoActivo, id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: "Producto no encontrado" });

  res.json({ updated: true, activo: nuevoActivo });
}));

export default router;