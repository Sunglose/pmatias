import { Router } from "express";
import { authRequired, requireRoles, asyncHandler } from "./auth.js";
import { pool } from "../db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const router = Router();

// ====== SOLO ADMIN ======
router.get("/", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  const { buscar = "", page = 1, limit = 20 } = req.query;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

  const params = [];
  let where = "1=1";
  if (buscar) {
    const like = `%${buscar}%`;
    where += ` AND (
      c.nombre LIKE ? OR c.rut LIKE ? OR c.local LIKE ? OR c.telefono LIKE ? OR c.direccion LIKE ? OR u.email LIKE ?
    )`;
    params.push(like, like, like, like, like, like);
  }

  const [rows] = await pool.query(
    `SELECT
       c.id AS cliente_id,
       c.usuario_id,
       c.nombre,
       c.local,
       c.rut,
       c.telefono,
       c.direccion,
       u.email,
       (
         u.force_password_change = 1
         AND u.temp_password_enc IS NOT NULL
         AND (u.temp_password_expires_at IS NULL OR u.temp_password_expires_at > NOW())
       ) AS has_temp
     FROM clientes c
     JOIN usuarios u ON u.id = c.usuario_id
     WHERE ${where}
     ORDER BY c.usuario_id ASC
     LIMIT ? OFFSET ?`,
    [...params, lim, off]
  );

  res.json(rows);
}));

router.post("/", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  let { nombre, local, rut, email, telefono, direccion } = req.body || {};
  if (!nombre || !rut || !email || !direccion) {
    return res.status(400).json({ message: "nombre, rut, email y direccion son requeridos" });
  }
  email = String(email).trim().toLowerCase();

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    // Generar password temporal
    const temp = generarPasswordTemporal();
    const password_hash = await bcrypt.hash(temp, 10);

    // Cifrar password temporal
    const { enc, iv, tag } = encryptTempPassword(temp);

    // Crear usuario
    const [uRes] = await conn.query(
      `INSERT INTO usuarios
       (email, password_hash, rol, force_password_change, temp_password_enc, temp_password_iv, temp_password_tag, temp_password_expires_at)
       VALUES (?, ?, 'cliente', 1, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [email, password_hash, enc, iv, tag, TEMP_PASS_TTL_DAYS]
    );
    const usuarioId = uRes.insertId;

    // Crear cliente
    await conn.query(
      `INSERT INTO clientes (usuario_id, nombre, local, rut, telefono, direccion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, nombre, local || null, rut, telefono || null, direccion]
    );

    if (direccion && String(direccion).trim()) {
      const [hasAny] = await conn.query(
        "SELECT id FROM direcciones WHERE usuario_id = ? LIMIT 1",
        [usuarioId]
      );
      if (!hasAny.length) {
        await conn.query(
          "INSERT INTO direcciones (usuario_id, texto, es_principal, created_at) VALUES (?, ?, 1, NOW())",
          [usuarioId, String(direccion).trim()]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: usuarioId, password_temporal: temp });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: "Error creando cliente" });
  } finally {
    conn.release();
  }
}));

router.delete("/:id", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  const { id } = req.params; // usuario_id
  try {
    // Borrar usuario (por FK ON DELETE CASCADE, borra cliente)
    const [r] = await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Cliente/usuario no encontrado" });
    res.json({ deleted: true });
  } catch (e) {
    if (e.errno === 1451) {
      return res.status(409).json({ message: "No se puede eliminar: registros relacionados (p.ej. pedidos)" });
    }
    res.status(500).json({ message: "Error eliminando" });
  }
}));

router.get("/:id/temp-password", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT
         u.temp_password_enc AS enc,
         u.temp_password_iv  AS iv,
         u.temp_password_tag AS tag,
         u.force_password_change AS force_flag,
         u.temp_password_expires_at AS exp
       FROM usuarios u
       WHERE u.id = ? LIMIT 1`,
      [id]
    );
    const r = rows[0];
    if (!r) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!r.force_flag) return res.json({ password_temporal: null });
    if (!r.exp || new Date(r.exp) < new Date()) return res.json({ password_temporal: null });
    if (!r.enc || !r.iv || !r.tag) return res.json({ password_temporal: null });

    const temp = decryptTempPassword(r.enc, r.iv, r.tag);
    res.json({ password_temporal: temp });
  } catch {
    res.status(500).json({ message: "Error obteniendo contraseña temporal" });
  }
}));

// ====== ADMIN Y CLIENTE PROPIETARIO ======
router.get("/:id/horarios-reparto", authRequired, asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Permite solo si es admin o si el usuario es dueño del cliente
  if (
    req.user.rol !== "admin" &&
    !(req.user.rol === "cliente" && String(id) === String(req.user.cliente_id))
  ) {
    return res.status(403).json({ error: "Acceso denegado" });
  }
  const [rows] = await pool.query(
    "SELECT id, hora FROM cliente_horarios_reparto WHERE cliente_id = ? ORDER BY hora",
    [id]
  );
  res.json(rows);
}));

router.post("/:id/horarios-reparto", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { hora } = req.body;
  if (!hora) return res.status(400).json({ message: "Hora requerida" });
  await pool.query(
    "INSERT INTO cliente_horarios_reparto (cliente_id, hora) VALUES (?, ?)",
    [id, hora]
  );
  res.status(201).json({ ok: true });
}));

router.delete("/:id/horarios-reparto/:horarioId", authRequired, requireRoles("admin"), asyncHandler(async (req, res) => {
  const { horarioId } = req.params;
  await pool.query("DELETE FROM cliente_horarios_reparto WHERE id = ?", [horarioId]);
  res.json({ deleted: true });
}));

/* ========================= Helpers ========================= */
function generarPasswordTemporal() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function encryptTempPassword(plain) {
  const iv = crypto.randomBytes(12); // GCM recomienda 12
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { enc, iv, tag };
}

function decryptTempPassword(enc, iv, tag) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export default router;