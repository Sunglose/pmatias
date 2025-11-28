// backend/src/routes/index.routes.js
import { Router } from "express";

import accountRouter from "./account.js";
import clientesRouter from "./clientes.js";
import productosRouter from "./productos.js";
import pedidosRouter from "./pedidos.js";
import prepedidosRouter from "./prepedidos.js";
import addressRoutes from "./address.js";

const api = Router();

api.use("/account", accountRouter);
api.use("/productos", productosRouter);
api.use("/clientes", clientesRouter);
api.use("/pedidos", pedidosRouter);
api.use("/prepedidos", prepedidosRouter);
api.use("/address", addressRoutes);

export default api;
