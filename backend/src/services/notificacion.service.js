// src/services/notifications.service.js
import { pool } from "../db.js";
import { sendEmail } from "./mailer.service.js";
import { toE164CL, twWaSendText } from "./wsp.service.js";
import { fechaProgramadaLegible } from "../utils/fecha.js";
import { enviarConfirmacionPedido } from "./mailer.service.js";

export async function notificarPedidoPorId(pedidoId, { asuntoEmail, textoWaPrefix } = {}) {
  // 1) Pedido + cliente
  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      DATE_FORMAT(p.fecha_entrega, '%Y-%m-%d') AS fecha_iso,
      DATE_FORMAT(p.hora_entrega,  '%H:%i')   AS hora,
      p.tipo_entrega,
      p.direccion_entrega,
      p.observaciones,
      COALESCE(c.nombre,   p.cliente_nombre)   AS cliente_nombre,
      COALESCE(u.email,    p.cliente_email)    AS cliente_email,
      COALESCE(c.telefono, p.cliente_telefono) AS cliente_telefono
      
    FROM pedidos p
    LEFT JOIN clientes c ON c.usuario_id = p.cliente_usuario_id
    LEFT JOIN usuarios u ON u.id = p.cliente_usuario_id
    WHERE p.id = ?
    LIMIT 1
    `,
    [pedidoId]
  );
  if (!rows.length) return false;
  const pedido = rows[0];

  // 2) Items
  const [items] = await pool.query(
    `
    SELECT pr.nombre AS producto, pi.cantidad, pi.unidad
    FROM pedido_items pi
    JOIN productos pr ON pr.id = pi.producto_id
    WHERE pi.pedido_id = ?
    `,
    [pedidoId]
  );

  // 3) Extraer abono desde observaciones
  const obs = (pedido.observaciones || "");
  const matchAbono = obs.match(/Abono\s+pasajero:\s*\$?\s*([0-9]+)/i);
  const abono = matchAbono ? parseInt(matchAbono[1], 10) : null;

  console.log("📧 Datos para email:");
  console.log("  - observaciones:", obs);
  console.log("  - abono extraído:", abono);
  console.log("  - fecha_iso:", pedido.fecha_iso);
  console.log("  - hora:", pedido.hora);

  // 4) Email
  if (pedido.cliente_email) {
    await enviarConfirmacionPedido({
      para: pedido.cliente_email,
      clienteNombre: pedido.cliente_nombre,
      pedidoId,
      fecha: pedido.fecha_iso, // ← FIX: cambiar de pedido.fecha a pedido.fecha_iso
      hora: pedido.hora,
      modalidad: pedido.tipo_entrega === "reparto" ? "Reparto a domicilio" : "Retiro en local",
      direccion: pedido.direccion_entrega || null,
      items,
      abono // ← Incluir abono
    });
  }

  // 5) WhatsApp (si hay)
  const fechaStr = fechaProgramadaLegible(pedido.fecha_iso, pedido.hora);
  const modalidad = pedido.tipo_entrega === "reparto" ? "Reparto a domicilio" : "Retiro en local";
  const num = pedido.cliente_telefono ? toE164CL(pedido.cliente_telefono) : null;
  if (num) {
    const prefix = textoWaPrefix || "tu pedido";
    const wa = `Hola ${pedido.cliente_nombre || "cliente"}: ${prefix} #${pedido.id} fue confirmado para ${fechaStr}. Modalidad: ${modalidad}.`;
    try { await twWaSendText(num, wa); } catch (e) { console.warn("[Twilio WA] No se pudo enviar:", e?.message || e); }
  }

  return true;
}
