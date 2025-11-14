import { Router } from "express";
import upload from "../lib/upload.js";
import { requireRoles, asyncHandler } from "../middlewares/auth.middleware.js";
import {
  listarProductos,
  listarProductosAdmin,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  toggleActivo,
} from "../controllers/productos.controller.js";

const router = Router();

// Catálogo general (solo activos, todos los roles)
router.get(
  "/",
  asyncHandler(listarProductos)
);

// Admin: lista todos los productos (activos e inactivos)
router.get(
  "/admin",
  requireRoles("admin"),
  asyncHandler(listarProductosAdmin)
);

router.post("/", requireRoles("admin"), upload.single("imagen"), asyncHandler(crearProducto));
router.put("/:id", requireRoles("admin"), upload.single("imagen"), asyncHandler(actualizarProducto));
router.delete("/:id", requireRoles("admin"), asyncHandler(eliminarProducto));
router.patch("/:id/activo", requireRoles("admin"), asyncHandler(toggleActivo));

export default router;
