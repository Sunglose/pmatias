import { Router } from "express";
import { pool } from "../db.js";
import { notificarPedidoPorId } from "../services/notificacion.service.js";
import { formatFechaDDMMYYYY, getTomorrowYMD, getMaxDateYMD } from "../utils/fecha.js";
import { authRequired, requireRoles, asyncHandler } from "./auth.js"; // <-- importa authRequired

const router = Router();

// ===== CREAR PEDIDO (público para pasajeros) =====
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      tipo_entrega, fecha_entrega, hora_entrega,
      observaciones = null, cliente = {}, direccion_id = null,
      items = [],
    } = req.body || {};

    if (!["retiro", "reparto"].includes(tipo_entrega)) {
      return res.status(400).json({ message: "tipo_entrega inválido" });
    }
    if (!fecha_entrega || !hora_entrega) {
      return res.status(400).json({ message: "fecha_entrega y hora_entrega son requeridos" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Debes enviar al menos un item" });
    }

    const tomorrowYMD = getTomorrowYMD();
    const maxDateYMD = getMaxDateYMD(7);

    if (fecha_entrega < tomorrowYMD || fecha_entrega > maxDateYMD) {
      return res.status(400).json({
        message: `Solo se permiten pedidos entre ${tomorrowYMD} y ${maxDateYMD} (hasta 1 semana desde mañana).`
      });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const { rol, id: userId } = req.user || {};
      let clienteUsuarioId = null;
      let clienteNombre = null, clienteEmail = null, clienteTelefono = null;
      let direccionEntrega = null;

      if (rol === "cliente") {
        clienteUsuarioId = userId;
        if (tipo_entrega === "reparto") {
          if (!direccion_id) { await conn.rollback(); return res.status(400).json({ message: "Para reparto debes seleccionar una dirección de entrega." }); }
          const [adr] = await conn.query("SELECT texto FROM direcciones WHERE id = ? AND usuario_id = ? LIMIT 1", [direccion_id, userId]);
          if (!adr.length) { await conn.rollback(); return res.status(400).json({ message: "Dirección seleccionada no existe." }); }
          direccionEntrega = adr[0].texto;
        }
      } else {
        clienteNombre = (cliente?.nombre || "").trim();
        clienteEmail = (cliente?.email || "").trim().toLowerCase() || null;
        clienteTelefono = (cliente?.telefono || "").trim() || null;
        if (!clienteNombre) {
          await conn.rollback();
          return res.status(400).json({ message: "Falta nombre del cliente." });
        }
        if (tipo_entrega === "reparto") {
          const dir = (cliente?.direccion || "").trim();
          if (!dir) { await conn.rollback(); return res.status(400).json({ message: "Para reparto debes indicar una dirección de entrega." }); }
          direccionEntrega = dir;
        }
      }

      const [pRes] = await conn.query(
        `INSERT INTO pedidos
        (cliente_usuario_id, cliente_nombre, cliente_email, cliente_telefono,
         fecha_entrega, hora_entrega, tipo_entrega, estado, direccion_entrega, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`,
        [
          clienteUsuarioId, clienteNombre || null, clienteEmail || null, clienteTelefono || null,
          fecha_entrega, hora_entrega, tipo_entrega, direccionEntrega || null, observaciones,
        ]
      );
      const pedidoId = pRes.insertId;

      for (const it of items) {
        const { producto_id, unidad, cantidad } = it || {};
        if (!producto_id || !["kg", "un"].includes(unidad) || !(Number(cantidad) > 0)) {
          await conn.rollback(); return res.status(400).json({ message: "Item inválido" });
        }
        await conn.query(
          `INSERT INTO pedido_items (pedido_id, producto_id, unidad, cantidad) VALUES (?, ?, ?, ?)`,
          [pedidoId, producto_id, unidad, Number(cantidad)]
        );
      }

      await conn.commit();

      const notify = String(req.query.notify || "0") === "1";

      if (notify) {
        try {
          await notificarPedidoPorId(pedidoId, {
            asuntoEmail: `Pedido #${pedidoId} confirmado`
          });
        } catch (err) {
          console.warn("Error enviando notificación:", err.message);
        }
      }

      return res.status(201).json({
        id: pedidoId,
        requiere_aprobacion: false,
      });
    } catch (e) {
      await conn.rollback();
      res.status(500).json({ message: "Error creando pedido" });
    } finally {
      conn.release();
    }
  })
);

// ===== RUTAS PROTEGIDAS (listar, editar, eliminar, etc.) =====
router.get(
  "/",
  authRequired, requireRoles("admin", "cajera", "cliente"),
  asyncHandler(async (req, res) => {

    const { page = 1, limit = 7 } = req.query;
    const lim = Math.min(Math.max(parseInt(limit, 10) || 7, 1), 200);
    const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

    const isCliente = req.user?.rol === "cliente";
    const where = ["p.estado <> 'entregado'"];
    const params = [];
    if (isCliente) { where.push("p.cliente_usuario_id = ?"); params.push(req.user.id); }
    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    try {
      const [cRows] = await pool.query(`SELECT COUNT(DISTINCT p.id) AS total FROM pedidos p ${whereSQL}`, params);
      const total = cRows[0]?.total || 0;

      const [rows] = await pool.query(
        `
        SELECT
          p.id,
          COALESCE(c.nombre, p.cliente_nombre) AS cliente_nombre,
          COALESCE(u.email, p.cliente_email) AS cliente_email,
          COALESCE(c.telefono, p.cliente_telefono) AS cliente_telefono,
          DATE_FORMAT(p.fecha_entrega, '%Y-%m-%d') AS fecha_iso,
          DATE_FORMAT(p.hora_entrega,  '%H:%i')   AS hora,
          p.tipo_entrega,
          p.estado,
          p.direccion_entrega,
          GROUP_CONCAT(
            CONCAT(
              CASE WHEN pi.unidad = 'kg'
                THEN TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM FORMAT(pi.cantidad, 3)))
                ELSE TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM FORMAT(pi.cantidad, 0)))
              END,
              UPPER(pi.unidad),' ',pr.nombre
            )
            SEPARATOR ' · '
          ) AS productos_resumen
        FROM pedidos p
        LEFT JOIN clientes c      ON c.usuario_id = p.cliente_usuario_id
        LEFT JOIN usuarios u      ON u.id = p.cliente_usuario_id
        LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
        LEFT JOIN productos pr    ON pr.id = pi.producto_id
        ${whereSQL}
        GROUP BY p.id
        ORDER BY p.fecha_entrega DESC, p.hora_entrega ASC
        LIMIT ? OFFSET ?
        `,
        [...params, lim, off]
      );

      const data = rows.map(r => ({ ...r, fecha: formatFechaDDMMYYYY(r.fecha_iso) }));
      res.json({ data, page: Number(page), limit: lim, total, totalPages: Math.max(1, Math.ceil(total / lim)) });
    } catch {
      res.status(500).json({ message: "Error listando pedidos" });
    }
  })
);

router.get(
  "/historico",
  authRequired, requireRoles("admin", "cajera", "cliente"),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 7 } = req.query;
    const lim = Math.min(Math.max(parseInt(limit, 10) || 7, 1), 200);
    const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

    const isCliente = req.user?.rol === "cliente";
    const where = ["p.estado = 'entregado'"];
    const params = [];
    if (isCliente) { where.push("p.cliente_usuario_id = ?"); params.push(req.user.id); }
    const whereSQL = `WHERE ${where.join(" AND ")}`;

    try {
      const [cRows] = await pool.query(`SELECT COUNT(DISTINCT p.id) AS total FROM pedidos p ${whereSQL}`, params);
      const total = cRows[0]?.total || 0;

      const [rows] = await pool.query(
        `
        SELECT
          p.id,
          COALESCE(c.nombre, p.cliente_nombre) AS cliente_nombre,
          COALESCE(u.email, p.cliente_email) AS cliente_email,
          COALESCE(c.telefono, p.cliente_telefono) AS cliente_telefono,
          DATE_FORMAT(p.fecha_entrega, '%Y-%m-%d') AS fecha_iso,
          DATE_FORMAT(p.hora_entrega,  '%H:%i')   AS hora,
          p.tipo_entrega,
          p.estado,
          p.direccion_entrega,
          GROUP_CONCAT(
            CONCAT(
              CASE WHEN pi.unidad = 'kg'
                THEN TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM FORMAT(pi.cantidad, 3)))
                ELSE TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM FORMAT(pi.cantidad, 0)))
              END,
              UPPER(pi.unidad),' ',pr.nombre
            )
            SEPARATOR ' · '
          ) AS productos_resumen
        FROM pedidos p
        LEFT JOIN clientes c      ON c.usuario_id = p.cliente_usuario_id
        LEFT JOIN usuarios u      ON u.id = p.cliente_usuario_id
        LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
        LEFT JOIN productos pr    ON pr.id = pi.producto_id
        ${whereSQL}
        GROUP BY p.id
        ORDER BY p.fecha_entrega DESC, p.hora_entrega DESC
        LIMIT ? OFFSET ?
        `,
        [...params, lim, off]
      );

      const data = rows.map(r => ({ ...r, fecha: formatFechaDDMMYYYY(r.fecha_iso) }));
      res.json({ data, page: Number(page), limit: lim, total, totalPages: Math.max(1, Math.ceil(total / lim)) });
    } catch {
      res.status(500).json({ message: "Error listando histórico" });
    }
  })
);

router.patch(
  "/:id/estado",
  authRequired, requireRoles("admin", "cajera"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body || {};
    if (!["pendiente", "entregado", "cancelado"].includes(estado || "")) {
      return res.status(400).json({ message: "estado inválido" });
    }
    try {
      const [r] = await pool.query("UPDATE pedidos SET estado = ? WHERE id = ?", [estado, id]);
      if (r.affectedRows === 0) {
        return res.status(404).json({ message: "Pedido no encontrado" });
      }
      res.json({ message: "Estado actualizado" });
    } catch {
      res.status(500).json({ message: "Error actualizando estado" });
    }
  })
);

router.get(
  "/:id",
  authRequired, requireRoles("admin", "cajera", "cliente"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query(
        `
        SELECT
          p.id,
          COALESCE(c.nombre, p.cliente_nombre) AS cliente_nombre,
          COALESCE(u.email, p.cliente_email) AS cliente_email,
          COALESCE(c.telefono, p.cliente_telefono) AS cliente_telefono,
          DATE_FORMAT(p.fecha_entrega, '%Y-%m-%d') AS fecha_iso,
          DATE_FORMAT(p.hora_entrega,  '%H:%i')   AS hora,
          p.tipo_entrega,
          p.estado,
          p.direccion_entrega,
          GROUP_CONCAT(
            CONCAT(
              CASE WHEN pi.unidad = 'kg'
                THEN TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM FORMAT(pi.cantidad, 3)))
                ELSE TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM FORMAT(pi.cantidad, 0)))
              END,
              UPPER(pi.unidad),' ',pr.nombre
            )
            SEPARATOR ' · '
          ) AS productos_resumen
        FROM pedidos p
        LEFT JOIN clientes c      ON c.usuario_id = p.cliente_usuario_id
        LEFT JOIN usuarios u      ON u.id = p.cliente_usuario_id
        LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
        LEFT JOIN productos pr    ON pr.id = pi.producto_id
        WHERE p.id = ?
        GROUP BY p.id
        LIMIT 1
        `,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Pedido no encontrado" });
      }

      const r = rows[0];
      const data = { ...r, fecha: formatFechaDDMMYYYY(r.fecha_iso) };
      res.json({ data });
    } catch {
      res.status(500).json({ message: "Error obteniendo detalle del pedido" });
    }
  })
);

router.post("/:id/horarios-reparto", asyncHandler(async (req, res) => {
  const { id } = req.params;

  const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!horaRegex.test(hora)) {
    return res.status(400).json({ message: "Hora inválida (formato HH:mm)" });
  }

  await pool.query(
    "INSERT INTO cliente_horarios_reparto (cliente_id, hora) VALUES (?, ?, ?)",
    [id, hora]
  );
  res.status(201).json({ ok: true });
}));

export default router;