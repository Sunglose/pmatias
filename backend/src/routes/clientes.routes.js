// backend/src/routes/clientes.routes.js
import { Router } from "express";
import { authRequired, requireRoles, asyncHandler } from "../middlewares/auth.middleware.js";
import {
  listarClientes,
  crearCliente,
  obtenerTempPasswordCliente,
  deleteClienteYUsuario,
} from "../controllers/clientes.controller.js";

const router = Router();

router.use(authRequired, requireRoles("admin"));

router.get("/", asyncHandler(listarClientes));
router.post("/", asyncHandler(crearCliente));
router.get("/:id/temp-password", asyncHandler(obtenerTempPasswordCliente));
router.delete("/:id", asyncHandler(deleteClienteYUsuario));

export default router;
