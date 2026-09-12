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

function getRoleBadgeStyle(role) {
  const normRole = (role || 'VIEWER').toUpperCase();
  switch (normRole) {
    case 'ADMIN':
    case 'OWNER':
      return { bg: '#581c87', color: '#e9d5ff', border: '#7e22ce', label: normRole };
    case 'DEVELOPER':
      return { bg: '#1e3a8a', color: '#bfdbfe', border: '#2563eb', label: normRole };
    case 'QA':
      return { bg: '#064e3b', color: '#a7f3d0', border: '#059669', label: normRole };
    default:
      return { bg: '#1f2937', color: '#d1d5db', border: '#374151', label: normRole };
  }
}

function generateInvitationEmailHtml({ email, workspaceName, role, acceptUrl }) {
  const badge = getRoleBadgeStyle(role);
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invitación a ${workspaceName}</title>
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #0b0e14; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-card { padding: 24px 18px !important; border-radius: 12px !important; }
      .email-header { padding-bottom: 20px !important; }
      .cta-button { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0e14; min-height: 100vh; padding: 40px 15px;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 560px; margin: 0 auto;">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" class="email-header" style="padding-bottom: 28px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <!-- Logo Icon Badge -->
                    <div style="display: inline-block; width: 44px; height: 44px; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); border-radius: 12px; text-align: center; line-height: 44px; box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);">
                      <span style="color: #ffffff; font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">API</span>
                    </div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle; text-align: left;">
                    <span style="display: block; color: #f8fafc; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.1;">API-Wallet</span>
                    <span style="display: block; color: #94a3b8; font-size: 12px; font-weight: 500;">Gestor de APIs & Credenciales</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td class="email-card" style="background-color: #131722; border: 1px solid #1e293b; border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45); text-align: left;">
              
              <!-- Tag / Greeting -->
              <div style="display: inline-block; background-color: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.3); color: #c084fc; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 20px; margin-bottom: 18px;">
                Invitación a colaborar
              </div>

              <h1 style="margin: 0 0 12px 0; color: #f8fafc; font-size: 22px; font-weight: 700; line-height: 1.3;">
                ¡Te han invitado al espacio de trabajo!
              </h1>
              
              <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Hola <strong style="color: #f1f5f9;">${email}</strong>, has recibido una invitación para unirte y colaborar en el espacio de trabajo de <strong style="color: #f1f5f9;">${workspaceName}</strong>.
              </p>

              <!-- Workspace Info Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1a202c; border: 1px solid #2d3748; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="vertical-align: middle;">
                          <span style="display: block; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Workspace</span>
                          <strong style="color: #ffffff; font-size: 16px; font-weight: 700;">${workspaceName}</strong>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <span style="display: block; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Rol asignado</span>
                          <span style="display: inline-block; background-color: ${badge.bg}; color: ${badge.color}; border: 1px solid ${badge.border}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px;">
                            ${badge.label}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}" target="_blank" class="cta-button" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; text-align: center; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4); border: 1px solid rgba(255, 255, 255, 0.15);">
                      Aceptar Invitación y Unirse →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link Section -->
              <div style="border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 10px;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                  ¿El botón no funciona? Copia y pega el siguiente enlace en tu navegador:
                </p>
                <div style="background-color: #0b0e14; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 12px; word-break: break-all;">
                  <a href="${acceptUrl}" target="_blank" style="color: #a855f7; font-size: 11px; font-family: monospace; text-decoration: underline; line-height: 1.4;">
                    ${acceptUrl}
                  </a>
                </div>
              </div>

              <!-- Security Expiration Notice -->
              <div style="margin-top: 22px; background-color: rgba(234, 179, 8, 0.08); border-left: 3px solid #eab308; border-radius: 0 6px 6px 0; padding: 10px 14px;">
                <p style="margin: 0; color: #fbbf24; font-size: 12px; line-height: 1.5;">
                  ⏳ <strong>Importante:</strong> Esta invitación es de un solo uso y expirará automáticamente en <strong>7 días</strong>.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 28px 20px 10px 20px; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                Recibiste este correo porque un administrador de <strong>API-Wallet</strong> te ha invitado. Si no esperabas esta invitación, puedes ignorar este mensaje de forma segura.
              </p>
              <p style="margin: 0; color: #475569; font-size: 11px;">
                © ${currentYear} API-Wallet. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendWorkspaceInvitation({ email, workspaceName, role, token }) {
  const acceptUrl = `${process.env.FRONTEND_URL}/invitations/accept?token=${encodeURIComponent(token)}`;
  const mailer = transporter();
  if (!mailer) {
    if (process.env.NODE_ENV === 'production') throw Object.assign(new Error('Email delivery is not configured'), { statusCode: 503 });
    console.info(`Development invitation for ${email}: ${acceptUrl}`);
    return { delivered: false, previewUrl: acceptUrl };
  }

  const html = generateInvitationEmailHtml({ email, workspaceName, role, acceptUrl });
  const text = `¡Has sido invitado a ${workspaceName}!\n\nHas sido invitado como ${role} al espacio de trabajo de ${workspaceName}.\n\nPara aceptar la invitación y unirte al equipo, abre el siguiente enlace en tu navegador:\n${acceptUrl}\n\nNota: Este enlace expirará en 7 días.\n\n--\nAPI-Wallet — Gestor de APIs & Credenciales`;

  await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: `Invitación para unirte a ${workspaceName} en API-Wallet`,
    text,
    html,
  });

  return { delivered: true };
}

async function sendEmailVerificationEmail({ email, name, token }) {
  const verifyUrl = `${process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const mailer = transporter();
  if (!mailer) {
    if (process.env.NODE_ENV === 'production') throw Object.assign(new Error('Email delivery is not configured'), { statusCode: 503 });
    console.info(`Development email verification for ${email}: ${verifyUrl}`);
    return { delivered: false, previewUrl: verifyUrl };
  }

  const greeting = name || email.split('@')[0];
  await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Confirma tu correo en API-Wallet',
    text: `Hola ${greeting},\n\nConfirma tu correo para activar tu cuenta en API-Wallet abriendo este enlace:\n${verifyUrl}\n\nEl enlace expira en 10 minutos y solo puede usarse una vez.`,
    html: `<p>Hola ${greeting},</p><p>Confirma tu correo para activar tu cuenta en API-Wallet:</p><p><a href="${verifyUrl}">Confirmar correo</a></p><p>El enlace expira en 10 minutos y solo puede usarse una vez.</p>`,
  });
  return { delivered: true };
}

module.exports = { sendWorkspaceInvitation, sendEmailVerificationEmail };

