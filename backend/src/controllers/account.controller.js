import { pool } from "../db.js";
import bcrypt from "bcrypt";

/**
 * GET /api/account/me
 */
export const profile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autenticado" });

    const [rows] = await pool.query(
      `SELECT 
      u.id, u.email, u.rol,
      c.nombre, c.local, c.telefono, c.direccion, c.rut
      FROM usuarios u
      LEFT JOIN clientes c ON c.usuario_id = u.id
      WHERE u.id = ?
      LIMIT 1`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json(rows[0]);
  } catch (e) {
    return res.status(500).json({ message: "Error obteniendo el perfil" });
  }
};


/**
 * PUT /api/account/profile
 * Actualiza campos editables: email (usuarios), local y telefono (clientes).
 * body: { email, local?, telefono? }
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autenticado" });

    let { email, local, telefono } = req.body || {};
    email = (email || "").trim().toLowerCase();
    local = (local ?? "").trim();
    telefono = (telefono ?? "").trim();

    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    // Verificar que email no esté en uso por otro usuario
    const [eRows] = await pool.query(
      "SELECT id FROM usuarios WHERE email = ? AND id <> ? LIMIT 1",
      [email, userId]
    );
    if (eRows.length) {
      return res.status(409).json({ message: "Ese email ya está en uso" });
    }

    // Actualizar email
    await pool.query("UPDATE usuarios SET email = ? WHERE id = ?", [email, userId]);

    // Actualizar datos cliente si existe
    await pool.query(
      "UPDATE clientes SET local = ?, telefono = ? WHERE usuario_id = ?",
      [local || null, telefono || null, userId]
    );

    return res.json({ updated: true });
  } catch (e) {
    return res.status(500).json({ message: "Error actualizando perfil" });
  }
};

/**
 * PUT /api/account/password
 * Cambiar contraseña propia SIN pedir la actual.
 * body: { new_password }
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autenticado" });

    const { new_password } = req.body || {};
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ message: "Nueva contraseña inválida (mín. 6 caracteres)" });
    }

    const newHash = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE usuarios
        SET password_hash = ?,
            force_password_change = 0,
            temp_password_enc = NULL,
            temp_password_iv = NULL,
            temp_password_tag = NULL,
            temp_password_expires_at = NULL,
            password_changed_at = NOW()
      WHERE id = ?`,
      [newHash, userId]
    );

    return res.json({ changed: true });
  } catch (e) {
    return res.status(500).json({ message: "Error cambiando contraseña" });
  }
};

/* ============================ DIRECCIONES ============================ */
/**
 * GET /api/account/addresses
 * Lista direcciones del usuario.
 */
export const listAddresses = async (req, res) => {
  try {
    const userId = req.user?.id;
    const [rows] = await pool.query(
      "SELECT id, texto, es_principal FROM direcciones WHERE usuario_id = ? ORDER BY es_principal DESC, id DESC",
      [userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Error listando direcciones" });
  }
};

/**
 * POST /api/account/addresses
 * Crea nueva dirección (máx 5). Si no hay principal, esta se marca principal.
 * body: { texto }
 */
export const createAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { texto } = req.body || {};
    const clean = (texto || "").trim();
    if (!clean) return res.status(400).json({ message: "La dirección es requerida" });

    const [countRows] = await pool.query(
      "SELECT COUNT(*) AS n FROM direcciones WHERE usuario_id = ?",
      [userId]
    );
    if (countRows[0].n >= 5) {
      return res.status(400).json({ message: "Máximo 5 direcciones" });
    }

    const [hasPrincipalRows] = await pool.query(
      "SELECT id FROM direcciones WHERE usuario_id = ? AND es_principal = 1 LIMIT 1",
      [userId]
    );
    const esPrincipal = hasPrincipalRows.length ? 0 : 1;

    const [ins] = await pool.query(
      "INSERT INTO direcciones (usuario_id, texto, es_principal, created_at) VALUES (?, ?, ?, NOW())",
      [userId, clean, esPrincipal]
    );
    res.status(201).json({ id: ins.insertId });
  } catch (e) {
    res.status(500).json({ message: "Error creando dirección" });
  }
};

/**
 * PUT /api/account/addresses/:id
 * Actualiza el texto de una dirección propia.
 */
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { texto } = req.body || {};
    const clean = (texto || "").trim();
    if (!clean) return res.status(400).json({ message: "La dirección es requerida" });

    const [r] = await pool.query(
      "UPDATE direcciones SET texto = ? WHERE id = ? AND usuario_id = ?",
      [clean, id, userId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "Dirección no encontrada" });
    res.json({ updated: true });
  } catch (e) {
    res.status(500).json({ message: "Error actualizando dirección" });
  }
};

/**
 * DELETE /api/account/addresses/:id
 * Elimina una dirección propia. Si era principal, intenta promover otra como principal.
 */
export const deleteAddress = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // ¿era principal?
    const [rows] = await conn.query(
      "SELECT es_principal FROM direcciones WHERE id = ? AND usuario_id = ? LIMIT 1",
      [id, userId]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Dirección no encontrada" });
    }
    const wasPrincipal = !!rows[0].es_principal;

    await conn.query("DELETE FROM direcciones WHERE id = ? AND usuario_id = ?", [id, userId]);

    if (wasPrincipal) {
      // promover otra
      const [any] = await conn.query(
        "SELECT id FROM direcciones WHERE usuario_id = ? ORDER BY id DESC LIMIT 1",
        [userId]
      );
      if (any.length) {
        await conn.query(
          "UPDATE direcciones SET es_principal = 1 WHERE id = ?",
          [any[0].id]
        );
      }
    }

    await conn.commit();
    res.json({ deleted: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: "Error eliminando dirección" });
  } finally {
    conn.release();
  }
};

/**
 * PATCH /api/account/addresses/:id/default
 * Marca una dirección como principal.
 */
export const setDefaultAddress = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const [rows] = await conn.query(
      "SELECT id FROM direcciones WHERE id = ? AND usuario_id = ? LIMIT 1",
      [id, userId]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Dirección no encontrada" });
    }

    await conn.query(
      "UPDATE direcciones SET es_principal = 0 WHERE usuario_id = ?",
      [userId]
    );
    await conn.query(
      "UPDATE direcciones SET es_principal = 1 WHERE id = ? AND usuario_id = ?",
      [id, userId]
    );

    await conn.commit();
    res.json({ updated: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: "Error estableciendo principal" });
  } finally {
    conn.release();
  }
};
