import { Router } from "express";
import {
  listarPedidos,
  crearPedido,
  actualizarEstado,
  eliminarPedido,
  listarHistorico,
  confirmarPedido,
} from "../controllers/pedidos.controller.js";

import {
  crearPrePedidoPublic,
  confirmarPrePedidoPorPin,
  listarPendientesAprobacion,
  aprobarPrepedido,
  rechazarPrepedido,
  previsualizarPrepedido,
} from "../controllers/prepedidos.controller.js";

import { requireRoles, asyncHandler } from "../middlewares/auth.middleware.js";

const router = Router();

// ===== RUTAS PÚBLICAS (sin autenticación) =====
// DEBEN IR PRIMERO antes de cualquier middleware de autenticación
router.post(
  "/pre",
  asyncHandler(crearPrePedidoPublic)
);

// ===== RUTAS PROTEGIDAS =====

router.get(
  "/",
  requireRoles("admin", "cajera", "cliente"),
  asyncHandler(listarPedidos)
);

router.get(
  "/historico",
  requireRoles("admin", "cajera", "cliente"),
  asyncHandler(listarHistorico)
);

router.post(
  "/",
  requireRoles("admin", "cajera", "cliente"),
  asyncHandler(crearPedido)
);

router.patch(
  "/:id/estado",
  requireRoles("admin", "cajera"),
  asyncHandler(actualizarEstado)
);

router.delete(
  "/:id",
  requireRoles("admin", "cajera"),
  asyncHandler(eliminarPedido)
);

router.post(
  "/:id/confirmar",
  requireRoles("admin", "cajera", "cliente"),
  asyncHandler(confirmarPedido)
);

router.post(
  "/pre/:preId/aprobar",
  requireRoles("admin"),
  asyncHandler(aprobarPrepedido)
);

router.post(
  "/pre/:preId/rechazar",
  requireRoles("admin"),
  asyncHandler(rechazarPrepedido)
);

router.get(
  "/aprobar",
  requireRoles("admin"),
  asyncHandler(listarPendientesAprobacion)
);

// Confirmar pre-pedido con PIN en caja (cajera/admin)
router.post(
  "/pre/:preId/confirmar-pin",
  requireRoles("admin", "cajera"),
  asyncHandler(confirmarPrePedidoPorPin)
);

// Vista previa de pre-pedido (validando PIN) para cajera/admin
router.post(
  "/pre/:preId/preview",
  requireRoles("admin", "cajera"),
  asyncHandler(previsualizarPrepedido)
);


export default router;
