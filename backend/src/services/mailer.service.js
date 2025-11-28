import nodemailer from 'nodemailer';

const {
  MAIL_FROM = 'Panadería Matías <no-reply@panaderia-matias.com>',
  GMAIL_USER,
  GMAIL_PASS,

  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_USER,
  SMTP_PASS,
} = process.env;

let transporter;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
}

/**
 * Enviar correo genérico
 * @param {Object} options
 * @param {string|string[]} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const mailOptions = {
      from: MAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Nodemailer] Correo enviado:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Nodemailer] Error al enviar correo:', err?.message || err);
    throw err;
  }
}

function plantillaConfirmacionPedido({ 
  clienteNombre, 
  pedidoId, 
  fecha, 
  hora, 
  modalidad, 
  direccion, 
  items,
  abono
}) {
  const subject = `Pedido #${pedidoId} confirmado - Panadería Matías`;
  
  const itemsHtml = items.map(it => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${it.producto}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">
        ${it.unidad === 'kg' 
          ? String(Number(it.cantidad)).replace('.', ',') + ' KG' 
          : `${parseInt(it.cantidad, 10)} UN`}
      </td>
    </tr>
  `).join('');

  const fechaFormateada = fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Fecha no disponible';

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
      <h2 style="margin:0 0 8px;color:#8F5400;">¡Pedido confirmado!</h2>
      <p style="margin:0 0 16px;color:#333;">Hola <strong>${clienteNombre || 'cliente'}</strong>, tu pedido <strong>#${pedidoId}</strong> fue confirmado.</p>
      
      <div style="background:#f7f9ff;border:1px solid #dfe7ff;border-radius:10px;padding:16px;margin-bottom:16px;">
        <p style="margin:0;color:#8F5400;"><strong>Detalle</strong></p>
        <p style="margin:6px 0 0 0;color:#333;">Modalidad: <strong>${modalidad}</strong></p>
        <p style="margin:6px 0 0 0;color:#333;">Programado para: <strong>${fechaFormateada} ${hora}h</strong></p>
        ${direccion ? `<p style="margin:6px 0 0 0;color:#333;">Dirección: <strong>${direccion}</strong></p>` : ''}
        ${abono && abono > 0 ? `<p style="margin:6px 0 0 0;color:#333;">Abono recibido: <strong>$${abono.toLocaleString('es-CL')}</strong></p>` : ''}
      </div>

      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;background:#fafafa;border-bottom:1px solid #eee;">Producto</th>
            <th style="text-align:right;padding:8px;background:#fafafa;border-bottom:1px solid #eee;">Cantidad</th>
          </tr>
        </thead>
        <tbody>${itemsHtml || '<tr><td colspan="2" style="padding:12px;color:#666;">Sin ítems</td></tr>'}</tbody>
      </table>

      <p style="color:#666;margin:16px 0 0;">Gracias por tu preferencia.</p>
      <div style="border-top:1px solid #eee;padding-top:12px;margin-top:16px;text-align:center;">
        <p style="color:#666;margin:0;">Panadería Matías — Talcahuano</p>
      </div>
    </div>
  `;

  const text = [
    `Hola ${clienteNombre || 'cliente'}, tu pedido #${pedidoId} fue confirmado.`,
    `Modalidad: ${modalidad}`,
    `Programado para: ${fechaFormateada} ${hora}h`,
    direccion ? `Dirección: ${direccion}` : '',
    abono && abono > 0 ? `Abono: $${abono.toLocaleString('es-CL')}` : '',
    '',
    'Ítems:',
    ...items.map(it => `- ${it.producto}: ${it.cantidad}${it.unidad.toUpperCase()}`),
    '',
    'Gracias por tu preferencia.',
    'Panadería Matías — Talcahuano',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

/* Enviar notificación de confirmación de pedido*/
export async function enviarConfirmacionPedido(options) {
  const { para, ...resto } = options;
  if (!para) {
    console.warn('[Nodemailer] No hay destinatario para confirmación de pedido');
    return;
  }
  const { subject, html, text } = plantillaConfirmacionPedido(resto);
  try {
    await sendEmail({ to: para, subject, html, text });
  } catch (err) {
    console.error('[Nodemailer] Fallo al enviar confirmación:', err?.message || err);
  }
}

export async function enviarEmailAprobacion(prepedido) {
  const mailOptions = {
    from: MAIL_FROM,
    to: prepedido.cliente_email,
    subject: `Pre-pedido #${prepedido.id} APROBADO - Panadería Matías`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2 style="margin:0 0 8px;color:#16a34a;">¡Tu pedido ha sido aprobado!</h2>
        <p style="margin:0 0 16px;color:#333;">Hola <strong>${prepedido.cliente_nombre}</strong>,</p>
        <p style="margin:0 0 16px;color:#333;">Tu pre-pedido <strong>#${prepedido.id}</strong> ha sido aprobado por nuestro equipo.</p>
        
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin-bottom:16px;">
          <p style="margin:0;color:#16a34a;"><strong>Próximos pasos:</strong></p>
          <ul style="margin:8px 0 0 0;padding-left:20px;color:#333;">
            <li>Recibirás un PIN de confirmación próximamente</li>
            <li>Presenta el PIN en caja para confirmar tu pedido</li>
            <li>Fecha de entrega: ${prepedido.fecha_entrega} a las ${prepedido.hora_entrega}</li>
            <li>Tipo: ${prepedido.tipo_entrega === "reparto" ? "Reparto a domicilio" : "Retiro en local"}</li>
          </ul>
        </div>

        <p style="color:#666;margin:16px 0 0;">¡Gracias por tu preferencia!</p>
        <div style="border-top:1px solid #eee;padding-top:12px;margin-top:16px;text-align:center;">
          <p style="color:#666;margin:0;">Panadería Matías — Talcahuano</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function enviarEmailRechazo(prepedido, motivo) {
  const mailOptions = {
    from: MAIL_FROM,
    to: prepedido.cliente_email,
    subject: `Pre-pedido #${prepedido.id} RECHAZADO - Panadería Matías`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2 style="margin:0 0 8px;color:#dc2626;">Información sobre tu pedido</h2>
        <p style="margin:0 0 16px;color:#333;">Hola <strong>${prepedido.cliente_nombre}</strong>,</p>
        <p style="margin:0 0 16px;color:#333;">Lamentamos informarte que tu pre-pedido <strong>#${prepedido.id}</strong> ha sido rechazado.</p>
        
        ${motivo ? `
          <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px;margin-bottom:16px;">
            <p style="margin:0;color:#dc2626;"><strong>Motivo:</strong></p>
            <p style="margin:8px 0 0;color:#333;">${motivo}</p>
          </div>
        ` : ''}

        <p style="color:#666;margin:16px 0 0;">Disculpa las molestias.</p>
        <div style="border-top:1px solid #eee;padding-top:12px;margin-top:16px;text-align:center;">
          <p style="color:#666;margin:0;">Panadería Matías — Talcahuano</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export default { sendEmail, enviarConfirmacionPedido };
