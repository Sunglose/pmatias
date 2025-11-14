// backend/src/controllers/auth.controller.js
import { pool } from "../db.js";
import bcrypt from "bcrypt";
import { signToken } from "../lib/auth.js";

export const login = async (req, res) => {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email y password son requeridos" });
    }

    // normalizar email
    email = String(email).trim().toLowerCase();

    // buscar usuario por email
    const [users] = await pool.query(
      "SELECT id, email, password_hash, rol FROM usuarios WHERE email = ? LIMIT 1",
      [email]
    );
    const userRow = users[0];
    if (!userRow) return res.status(401).json({ message: "Credenciales inválidas" });

    // comparar password
    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

    // obtener datos de cliente (nombre, etc.) si es cliente
    let nombre = null;
    if (userRow.rol === "cliente") {
      const [cli] = await pool.query(
        "SELECT nombre FROM clientes WHERE usuario_id = ? LIMIT 1",
        [userRow.id]
      );
      nombre = cli[0]?.nombre || null;
    }

    const token = signToken({ id: userRow.id, rol: userRow.rol });

    const user = {
      id: userRow.id,
      email: userRow.email,
      rol: userRow.rol,
      nombre,
    };

    return res.json({ token, user });
  } catch (e) {
    console.error("[login] error:", e);
    res.status(500).json({ message: "Error en login" });
  }
};

export const me = async (req, res) => {
  try {
    const { id, rol } = req.user || {};
    if (!id) return res.status(401).json({ message: "No autenticado" });

    const [uRows] = await pool.query(
      "SELECT id, email, rol FROM usuarios WHERE id = ? LIMIT 1",
      [id]
    );
    const u = uRows[0];
    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });

    let nombre = null;
    if (u.rol === "cliente") {
      const [cli] = await pool.query("SELECT nombre FROM clientes WHERE usuario_id = ? LIMIT 1", [u.id]);
      nombre = cli[0]?.nombre || null;
    }

    return res.json({ user: { id: u.id, email: u.email, rol: u.rol, nombre } });
  } catch (e) {
    console.error("[me] error:", e);
    res.status(500).json({ message: "Error" });
  }
};
