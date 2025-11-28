import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { sendEmail } from "../services/mailer.service.js";
import { passwordResetTemplate } from "../utils/mailTemplates.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token requerido" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    next();
  };
}

export function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

async function getUserByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
  return rows[0];
}

async function saveRefreshToken(userId, refreshToken) {
  await pool.query("UPDATE usuarios SET refresh_token = ? WHERE id = ?", [refreshToken, userId]);
}

async function removeRefreshToken(refreshToken) {
  await pool.query("UPDATE usuarios SET refresh_token = NULL WHERE refresh_token = ?", [refreshToken]);
}

async function createPasswordResetToken(userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
  const expires = new Date(Date.now() + 3600 * 1000);
  await pool.query(
    "UPDATE usuarios SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
    [token, expires, userId]
  );
  return token;
}

async function verifyPasswordResetToken(token) {
  const [rows] = await pool.query(
    "SELECT id, reset_token_expires FROM usuarios WHERE reset_token = ?",
    [token]
  );
  if (!rows[0] || new Date(rows[0].reset_token_expires) < new Date()) {
    throw new Error("Invalid or expired token");
  }
  return rows[0].id;
}

async function setNewPassword(userId, hashedPassword) {
  await pool.query(
    "UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
    [hashedPassword, userId]
  );
}

// /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const accessToken = jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
    await saveRefreshToken(user.id, refreshToken);

    // Incluye el usuario en la respuesta
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const [rows] = await pool.query(
      "SELECT id, email, rol, refresh_token FROM usuarios WHERE id = ?",
      [payload.userId]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });

    if ((user.refresh_token || "").trim() !== (refreshToken || "").trim()) {
      return res.status(401).json({ error: "Refresh token inválido" });
    }

    const accessToken = jwt.sign(
      { id: user.id, rol: user.rol, cliente_id },
      JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ accessToken, user });
  } catch (err) {
    res.status(401).json({ error: "Refresh token inválido" });
  }
});

// /auth/logout
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await removeRefreshToken(refreshToken);
    res.json({ message: "Logout exitoso" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// /auth/request-password-reset
router.post("/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    const token = await createPasswordResetToken(user.id);

    const resetUrl = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/auth/restablecer/${token}`;

    const { subject, html } = passwordResetTemplate({ resetUrl });
    await sendEmail({ to: email, subject, html });

    res.json({ message: "Email de reseteo enviado" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// /auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const userId = await verifyPasswordResetToken(token);
    const hashed = await bcrypt.hash(newPassword, 10);
    await setNewPassword(userId, hashed);
    res.json({ message: "Contraseña restablecida correctamente" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;