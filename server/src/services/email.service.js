const nodemailer = require('nodemailer');

function transporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

async function sendWorkspaceInvitation({ email, workspaceName, role, token }) {
  const acceptUrl = `${process.env.FRONTEND_URL}/invitations/accept?token=${encodeURIComponent(token)}`;
  const mailer = transporter();
  if (!mailer) {
    if (process.env.NODE_ENV === 'production') throw Object.assign(new Error('Email delivery is not configured'), { statusCode: 503 });
    console.info(`Development invitation for ${email}: ${acceptUrl}`);
    return { delivered: false, previewUrl: acceptUrl };
  }
  await mailer.sendMail({ from: process.env.MAIL_FROM, to: email, subject: `Invitación a ${workspaceName}`, text: `Has sido invitado como ${role}. Acepta la invitación: ${acceptUrl}`, html: `<p>Has sido invitado como <strong>${role}</strong> a <strong>${workspaceName}</strong>.</p><p><a href="${acceptUrl}">Aceptar invitación</a></p>` });
  return { delivered: true };
}

module.exports = { sendWorkspaceInvitation };
