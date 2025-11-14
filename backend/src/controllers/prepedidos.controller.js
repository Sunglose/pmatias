// backend/src/controllers/pedidosPre.controller.js
import { pool } from "../db.js";
import { notificarPedidoPorId } from "../services/notificacion.service.js";
import { requiereAprobPorItem } from "../services/aprobar.service.js";
import { genPIN, pinExpiryDate } from "../services/pin.service.js";
import { getTomorrowYMD, getMaxDateYMD } from "../utils/fecha.js"; // ← NUEVO import
import { enviarEmailRechazo } from "../services/mailer.service.js";

/* ============================================================================
   CREAR PRE-PEDIDO PÚBLICO (PASAJEROS SIN LOGIN)
============================================================================ */
export async function crearPrePedidoPublic(req, res) {
  const {
    tipo_entrega, fecha_entrega, hora_entrega,
    observaciones = null,
    cliente = {},
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
  const maxDateYMD = getMaxDateYMD(7); // ← NUEVO
  
  if (fecha_entrega < tomorrowYMD || fecha_entrega > maxDateYMD) {
    return res.status(400).json({ 
      message: `Solo se permiten pedidos entre ${tomorrowYMD} y ${maxDateYMD} (hasta 1 semana desde mañana).` 
    });
  }

  const nombre = (cliente?.nombre || "").trim();
  const email = (cliente?.email || "").trim().toLowerCase() || null;
  const telefono = (cliente?.telefono || "").trim() || null;
  const direccionTxt = (cliente?.direccion || "").trim() || null;

  if (!nombre) return res.status(400).json({ message: "Falta nombre del cliente." });
  if (!email && !telefono) return res.status(400).json({ message: "Debes indicar email o teléfono." });
  if (tipo_entrega === "reparto" && !direccionTxt) {
    return res.status(400).json({ message: "Para reparto debes indicar una dirección de entrega." });
  }

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const [ins] = await conn.query(
      `INSERT INTO prepedidos
       (cliente_usuario_id, cliente_nombre, cliente_email, cliente_telefono,
        fecha_entrega, hora_entrega, tipo_entrega, estado, direccion_entrega, observaciones,
        requiere_aprobacion, confirm_pin, confirm_expires_at, pedido_id)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, 0, NULL, NULL, NULL)`,
      [nombre, email, telefono, fecha_entrega, hora_entrega, tipo_entrega, direccionTxt, observaciones]
    );
    const preId = ins.insertId;

    for (const it of items) {
      const { producto_id, unidad, cantidad } = it || {};
      if (!producto_id || !["kg", "un"].includes(unidad) || !(Number(cantidad) > 0)) {
        await conn.rollback();
        return res.status(400).json({ message: "Item inválido" });
      }
      await conn.query(
        `INSERT INTO prepedido_items (prepedido_id, producto_id, unidad, cantidad)
         VALUES (?, ?, ?, ?)`,
        [preId, producto_id, unidad, Number(cantidad)]
      );
    }

    const requiereAprob = requiereAprobPorItem(items);

    let pin = null;
    let expAt = null;

    if (requiereAprob) {
      await conn.query(
        `UPDATE prepedidos SET estado='requiere_aprobacion', requiere_aprobacion=1 WHERE id=?`,
        [preId]
      );
    } else {
      pin = genPIN();
      expAt = pinExpiryDate();
      await conn.query(
        `UPDATE prepedidos SET confirm_pin=?, confirm_expires_at=? WHERE id=?`,
        [pin, expAt, preId]
      );
    }

    await conn.commit();

    return res.status(201).json({
      id: preId,
      requiere_aprobacion: requiereAprob,
      confirm_pin: pin,
      expires_at: expAt ? expAt.toISOString() : null,
    });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return res.status(500).json({ message: "Error creando pre-pedido" });
  } finally {
    conn.release();
  }
}

/* ============================================================================
   CONFIRMAR PRE-PEDIDO POR PIN (CAJERA/ADMIN)
============================================================================ */
export async function confirmarPrePedidoPorPin(req, res) {
  const { preId } = req.params;
  const { pin, abono } = req.body || {}; // ← leer abono

  if (!pin) return res.status(400).json({ ok: false, message: "Falta PIN" });

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const [rows] = await conn.query(
      `SELECT id, estado, requiere_aprobacion, confirm_pin, confirm_expires_at,
              cliente_usuario_id, cliente_nombre, cliente_email, cliente_telefono,
              fecha_entrega, hora_entrega, tipo_entrega, direccion_entrega, observaciones
       FROM prepedidos WHERE id=? FOR UPDATE`,
      [preId]
    );
    const p = rows[0];
    if (!p) { await conn.rollback(); return res.status(404).json({ ok: false, message: "Pre-pedido no encontrado" }); }

    if (p.requiere_aprobacion || p.estado === "requiere_aprobacion") {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "Este pre-pedido requiere aprobación." });
    }
    if (!p.confirm_pin) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "No hay PIN vigente para este pre-pedido." });
    }
    if (String(pin) !== String(p.confirm_pin)) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "PIN incorrecto." });
    }
    const now = new Date();
    const exp = p.confirm_expires_at ? new Date(p.confirm_expires_at) : null;
    if (!exp || now > exp) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "PIN vencido. Solicita regeneración." });
    }

    const [items] = await conn.query(
      `SELECT producto_id, unidad, cantidad FROM prepedido_items WHERE prepedido_id=?`,
      [preId]
    );
    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "El pre-pedido no tiene ítems." });
    }

    // ...tras validar pin e items...
    const abonoNum = Number(abono);
    const hasAbono = Number.isFinite(abonoNum) && abonoNum >= 0;
    const obsFinal = [
      p.observaciones || null,
      hasAbono ? `Abono pasajero: $${Math.round(abonoNum)}` : null,
    ].filter(Boolean).join(" | ") || null;

    const [insPedido] = await conn.query(
      `INSERT INTO pedidos
       (cliente_usuario_id, cliente_nombre, cliente_email, cliente_telefono,
        fecha_entrega, hora_entrega, tipo_entrega, estado, direccion_entrega, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`,
      [
        p.cliente_usuario_id || null, p.cliente_nombre || null, p.cliente_email || null,
        p.cliente_telefono || null, p.fecha_entrega, p.hora_entrega, p.tipo_entrega,
        p.direccion_entrega || null, obsFinal, // ← guardar abono en observaciones
      ]
    );
    const pedidoId = insPedido.insertId;

    for (const it of items) {
      if (!it.producto_id || !["kg","un"].includes(it.unidad) || !(Number(it.cantidad) > 0)) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: "Ítem inválido al promover pre-pedido." });
      }
      await conn.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, unidad, cantidad) VALUES (?, ?, ?, ?)`,
        [pedidoId, it.producto_id, it.unidad, Number(it.cantidad)]
      );
    }

    await conn.query(`DELETE FROM prepedido_items WHERE prepedido_id = ?`, [preId]);
    await conn.query(`DELETE FROM prepedidos WHERE id = ?`, [preId]);

    await conn.commit();

    try {
      await notificarPedidoPorId(pedidoId, {
        asuntoEmail: `Pedido #${pedidoId} confirmado en caja`,
        textoWaPrefix: "tu pedido",
      });
    } catch (e) {
      console.warn("[Notificación] Error:", e?.message || e);
    }

    return res.json({ ok: true, message: "Pre-pedido confirmado y promovido a pedido.", pedido_id: pedidoId });
  } catch (e) {
    await conn.rollback();
    console.error("[confirmarPrePedidoPorPin] Error:", e);
    return res.status(500).json({ ok: false, message: e?.sqlMessage || e?.message || "Error al confirmar pre-pedido." });
  } finally {
    conn.release();
  }
}

/* ============================================================================
   LISTAR PRE-PEDIDOS PENDIENTES DE APROBACIÓN
============================================================================ */
export async function listarPendientesAprobacion(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        CAST('prepedido' AS CHAR(10) CHARACTER SET utf8mb4) AS tipo,
        pp.id,
        CONVERT(COALESCE(pp.cliente_nombre, '') USING utf8mb4) AS cliente_nombre,
        CONVERT(DATE_FORMAT(pp.fecha_entrega,'%Y-%m-%d') USING utf8mb4) AS fecha_entrega,
        CONVERT(DATE_FORMAT(pp.hora_entrega,'%H:%i') USING utf8mb4) AS hora_entrega
      FROM prepedidos pp
      WHERE pp.requiere_aprobacion = 1 OR pp.estado = 'requiere_aprobacion'
      ORDER BY fecha_entrega ASC, hora_entrega ASC, id ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error("[listarPendientesAprobacion] SQL error:", e);
    res.status(500).json({ message: "Error listando pedidos para aprobar" });
  }
}

/* ============================================================================
   APROBAR PRE-PEDIDO
============================================================================ */
export async function aprobarPrepedido(req, res) {
  const { preId } = req.params;
  const notify = String(req.query.notify || "0") === "1";

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [rows] = await conn.query(
      `SELECT id, cliente_usuario_id, cliente_nombre, cliente_email, cliente_telefono,
              fecha_entrega, hora_entrega, tipo_entrega, direccion_entrega, observaciones,
              estado, requiere_aprobacion, pedido_id
       FROM prepedidos WHERE id = ? FOR UPDATE`,
      [preId]
    );
    const p = rows[0];
    if (!p) { await conn.rollback(); return res.status(404).json({ ok: false, message: "Pre-pedido no encontrado" }); }
    if (!p.requiere_aprobacion && p.estado !== "requiere_aprobacion") {
      await conn.rollback(); return res.status(400).json({ ok: false, message: "El pre-pedido no requiere aprobación." });
    }
    if (p.pedido_id) {
      await conn.rollback(); return res.status(400).json({ ok: false, message: "Este pre-pedido ya fue promovido a pedido." });
    }

    const [items] = await conn.query(
      `SELECT producto_id, unidad, cantidad FROM prepedido_items WHERE prepedido_id = ?`,
      [preId]
    );
    if (!items.length) {
      await conn.rollback(); return res.status(400).json({ ok: false, message: "El pre-pedido no tiene ítems." });
    }

    const [insPedido] = await conn.query(
      `INSERT INTO pedidos
       (cliente_usuario_id, cliente_nombre, cliente_email, cliente_telefono,
        fecha_entrega, hora_entrega, tipo_entrega, estado, direccion_entrega, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`,
      [
        p.cliente_usuario_id || null, p.cliente_nombre || null, p.cliente_email || null,
        p.cliente_telefono || null, p.fecha_entrega, p.hora_entrega, p.tipo_entrega,
        p.direccion_entrega || null, p.observaciones || null,
      ]
    );
    const pedidoId = insPedido.insertId;

    for (const it of items) {
      await conn.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, unidad, cantidad) VALUES (?, ?, ?, ?)`,
        [pedidoId, it.producto_id, it.unidad, Number(it.cantidad)]
      );
    }

    await conn.query(
      `UPDATE prepedidos
       SET estado='aprobado', requiere_aprobacion=0, pedido_id=?, confirm_pin=NULL, confirm_expires_at=NULL
       WHERE id=?`,
      [pedidoId, preId]
    );

    await conn.commit();

    if (notify) {
      try {
        await notificarPedidoPorId(pedidoId, { asuntoEmail: `Pedido #${pedidoId} aprobado`, textoWaPrefix: "tu pedido" });
      } catch {}
    }

    return res.json({ ok: true, pedido_id: pedidoId });
  } catch (e) {
    await conn.rollback();
    console.error("[aprobarPrepedido] Error:", e);
    return res.status(500).json({ ok: false, message: "Error al aprobar pre-pedido" });
  } finally {
    conn.release();
  }
}

/* ============================================================================
   RECHAZAR PRE-PEDIDO
============================================================================ */
export async function rechazarPrepedido(req, res) {
  const { preId } = req.params;
  const { motivo } = req.body || {};
  const notify = String(req.query.notify || "0") === "1";
  const msg = (motivo || "").toString().trim().slice(0, 255) || null;

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [rows] = await conn.query(
      `SELECT id, estado, requiere_aprobacion, pedido_id,
              cliente_nombre, cliente_email, fecha_entrega, hora_entrega, tipo_entrega
       FROM prepedidos WHERE id = ? FOR UPDATE`,
      [preId]
    );
    const p = rows[0];
    
    if (!p) { 
      await conn.rollback(); 
      return res.status(404).json({ ok: false, message: "Pre-pedido no encontrado" }); 
    }
    
    if (p.pedido_id) { 
      await conn.rollback(); 
      return res.status(400).json({ ok: false, message: "Este pre-pedido ya fue promovido a pedido." }); 
    }
    
    if (!p.requiere_aprobacion && p.estado !== "requiere_aprobacion") {
      await conn.rollback(); 
      return res.status(400).json({ ok: false, message: "El pre-pedido no está pendiente de aprobación." });
    }

    await conn.query(
      `UPDATE prepedidos
       SET estado='rechazado', requiere_aprobacion=0, confirm_pin=NULL, confirm_expires_at=NULL, motivo_rechazo=?
       WHERE id=?`,
      [msg, preId]
    );

    await conn.commit();

    console.log("📧 Verificando envío de correo de rechazo...");
    console.log("  notify:", notify);
    console.log("  cliente_email:", p.cliente_email);
    console.log("  motivo:", msg);

    if (notify && p.cliente_email) {
      try { 
        console.log("📨 Enviando email de rechazo a:", p.cliente_email);
        await enviarEmailRechazo(p, msg); 
        console.log("✅ Email de rechazo enviado correctamente");
      } catch (err) {
        console.error("❌ Error enviando email de rechazo:", err.message);
      }
    } else {
      console.log("⚠️ No se envió email de rechazo. Razón:");
      if (!notify) console.log("  - notify=false (falta ?notify=1 en la URL)");
      if (!p.cliente_email) console.log("  - cliente_email vacío");
    }

    return res.json({ ok: true, message: "Pre-pedido rechazado." });
  } catch (e) {
    await conn.rollback();
    console.error("[rechazarPrepedido] Error:", e);
    return res.status(500).json({ ok: false, message: "Error al rechazar pre-pedido" });
  } finally {
    conn.release();
  }
}

/* ============================================================================
   PREVISUALIZAR PRE-PEDIDO
============================================================================ */
export async function previsualizarPrepedido(req, res) {
  const { preId } = req.params;
  const { pin } = req.body || {};
  if (!preId) return res.status(400).json({ ok: false, message: "Falta preId" });
  if (!pin)   return res.status(400).json({ ok: false, message: "Falta PIN" });

  try {
    const [rows] = await pool.query(
      `SELECT id, cliente_nombre, cliente_email, cliente_telefono,
              DATE_FORMAT(fecha_entrega,'%Y-%m-%d') AS fecha_entrega,
              DATE_FORMAT(hora_entrega, '%H:%i')    AS hora_entrega,
              tipo_entrega, direccion_entrega, observaciones,
              requiere_aprobacion, estado, confirm_pin, confirm_expires_at
       FROM prepedidos WHERE id = ? LIMIT 1`,
      [preId]
    );
    const pre = rows[0];
    if (!pre) return res.status(404).json({ ok: false, message: "Pre-pedido no encontrado" });

    if (pre.requiere_aprobacion || pre.estado === "requiere_aprobacion") {
      return res.status(400).json({ ok: false, message: "Este pre-pedido requiere aprobación del administrador." });
    }
    if (!pre.confirm_pin) {
      return res.status(400).json({ ok: false, message: "No hay PIN vigente para este pre-pedido." });
    }
    if (String(pin) !== String(pre.confirm_pin)) {
      return res.status(400).json({ ok: false, message: "PIN incorrecto." });
    }
    const now = new Date();
    const exp = pre.confirm_expires_at ? new Date(pre.confirm_expires_at) : null;
    if (!exp || now > exp) {
      return res.status(400).json({ ok: false, message: "PIN vencido." });
    }

    const [items] = await pool.query(
      `SELECT pi.producto_id, pr.nombre AS producto, pi.unidad, pi.cantidad
       FROM prepedido_items pi
       JOIN productos pr ON pr.id = pi.producto_id
       WHERE pi.prepedido_id = ?`,
      [preId]
    );

    return res.json({
      ok: true,
      prepedido: {
        id: pre.id,
        cliente_nombre: pre.cliente_nombre,
        cliente_email: pre.cliente_email,
        cliente_telefono: pre.cliente_telefono,
        fecha_entrega: pre.fecha_entrega,
        hora_entrega: pre.hora_entrega,
        tipo_entrega: pre.tipo_entrega,
        direccion_entrega: pre.direccion_entrega,
        observaciones: pre.observaciones,
      },
      items: items.map(it => ({
        producto_id: it.producto_id,
        producto: it.producto,
        unidad: it.unidad,
        cantidad: Number(it.cantidad),
      })),
    });
  } catch (e) {
    console.error("[previsualizarPrepedido] Error:", e);
    return res.status(500).json({ ok: false, message: "Error obteniendo detalles del pre-pedido." });
  }
}

