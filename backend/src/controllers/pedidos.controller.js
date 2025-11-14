// src/controllers/pedidos.controller.js
import { pool } from "../db.js";
import { notificarPedidoPorId } from "../services/notificacion.service.js";
import { formatFechaDDMMYYYY, getTomorrowYMD, getMaxDateYMD } from "../utils/fecha.js";

/* ========================= Listar actuales (no entregados) ========================= */
export async function listarPedidos(req, res) {
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
        COALESCE(u.email, p.cliente_email) AS cliente_email, -- ← NUEVO
        COALESCE(c.telefono, p.cliente_telefono) AS cliente_telefono, -- ← NUEVO
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
      LEFT JOIN usuarios u      ON u.id = p.cliente_usuario_id -- ← NUEVO
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
}

/* ========================= Listar histórico (entregados) ========================= */
export async function listarHistorico(req, res) {
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
        COALESCE(u.email, p.cliente_email) AS cliente_email, -- ← NUEVO
        COALESCE(c.telefono, p.cliente_telefono) AS cliente_telefono, -- ← NUEVO
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
      LEFT JOIN usuarios u      ON u.id = p.cliente_usuario_id -- ← NUEVO
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
}

/* ========================= Crear pedido (SOLO USUARIOS AUTENTICADOS) ========================= */
export async function crearPedido(req, res) {
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
  const maxDateYMD = getMaxDateYMD(7); // ← NUEVO: 7 días desde mañana
  
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
      // Cliente logueado
      clienteUsuarioId = userId;
      if (tipo_entrega === "reparto") {
        if (!direccion_id) { await conn.rollback(); return res.status(400).json({ message: "Para reparto debes seleccionar una dirección de entrega." }); }
        const [adr] = await conn.query("SELECT texto FROM direcciones WHERE id = ? AND usuario_id = ? LIMIT 1", [direccion_id, userId]);
        if (!adr.length) { await conn.rollback(); return res.status(400).json({ message: "Dirección seleccionada no existe." }); }
        direccionEntrega = adr[0].texto;
      }
    } else {
      // Staff creando pedido directo (NO pasajero/kiosco)
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
    
    const notify = String(req.query.notify || "0") === "1"; // ← NUEVO
    
    if (notify) {
      try {
        await notificarPedidoPorId(pedidoId, { 
          asuntoEmail: `Pedido #${pedidoId} confirmado`, 
          textoWaPrefix: "tu pedido" 
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
}

/* ========================= Eliminar ========================= */
export async function eliminarPedido(req, res) {
  const { id } = req.params;
  try {
    const [r] = await pool.query("DELETE FROM pedidos WHERE id = ?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Pedido no encontrado" });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ message: "Error eliminando pedido" });
  }
}

/* ========================= Actualizar estado ========================= */
export async function actualizarEstado(req, res) {
  const { id } = req.params;
  const { estado } = req.body || {};
  if (!["pendiente", "entregado", "cancelado"].includes(estado || "")) {
    return res.status(400).json({ message: "estado inválido" });
  }
  try {
    const [r] = await pool.query("UPDATE pedidos SET estado = ? WHERE id = ?", [estado, id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Pedido no encontrado" });
    res.json({ updated: true });
  } catch {
    res.status(500).json({ message: "Error actualizando estado" });
  }
}

/* ========================= Confirmar (solo notifica) ========================= */
export async function confirmarPedido(req, res) {
  const { id } = req.params;
  try {
    await notificarPedidoPorId(id, { asuntoEmail: `Confirmación de pedido #${id}`, textoWaPrefix: "tu pedido" });
    return res.json({ ok: true, message: "Notificaciones enviadas (email/WhatsApp cuando aplica)." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error al confirmar y notificar." });
  }
}
