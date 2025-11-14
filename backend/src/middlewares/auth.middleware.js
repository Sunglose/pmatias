// backend/src/middlewares/auth.middleware.js
import { verifyToken } from "../lib/auth.js";

/** Autenticación por Bearer JWT */
export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Token requerido" });

  try {
    const decoded = verifyToken(token); // { id, rol, iat, exp }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

/** Autorización por roles (incluye autenticación automática) */
export function requireRoles(...roles) {
  return (req, res, next) => {
    // Primero autenticar
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ message: "Token requerido" });
    }

    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      
      // Normalizar el rol del usuario
      const userRole = String(decoded.rol || "").toLowerCase().trim();
      
      // Normalizar roles permitidos
      const allowedRoles = roles.map(r => String(r).toLowerCase().trim());
      
      // Verificar si el rol está permitido
      if (!allowedRoles.includes(userRole)) {
        console.log(`Acceso denegado para rol: ${userRole}`);
        return res.status(403).json({ 
          message: "No autorizado",
          userRole: decoded.rol,
          requiredRoles: roles
        });
      }
      
      console.log(`Acceso permitido para rol: ${userRole}`);
      next();
    } catch (error) {
      console.error("Error en autenticación:", error.message);
      return res.status(401).json({ message: "Token inválido o expirado" });
    }
  };
}

/** Wrapper para rutas async (propaga errores a errorHandler) */
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
