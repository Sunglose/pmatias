// backend/src/routes/index.routes.js
import { Router } from "express";
import { authRequired } from "../middlewares/auth.middleware.js";

import authRouter from "./auth.routes.js";
import accountRouter from "./account.routes.js";
import clientesRouter from "./clientes.routes.js";
import productosRouter from "./productos.routes.js";
import pedidosRouter from "./pedidos.routes.js";
import publicRoutes from "./public.routes.js";

const api = Router();

// Rutas públicas (no requieren token) - DEBEN IR PRIMERO
api.use("/public", publicRoutes);

// Rutas protegidas
api.use("/auth", authRouter);
api.use("/account", authRequired, accountRouter);
api.use("/productos", authRequired, productosRouter);
api.use("/clientes", authRequired, clientesRouter);
// IMPORTANTE: /pedidos tiene rutas mixtas (públicas y protegidas)
// Las rutas públicas se definen primero dentro de pedidos.routes.js
api.use("/pedidos", pedidosRouter);

export default api;
