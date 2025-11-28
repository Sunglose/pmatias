export function passwordResetTemplate({ resetUrl }) {
  return {
    subject: "Recupera tu contraseña - Panadería Matías",
    html: `
      <p>Solicitaste recuperar tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para restablecerla:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si no solicitaste esto, ignora este correo.</p>
    `,
  };
}
