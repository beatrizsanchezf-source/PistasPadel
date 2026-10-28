const resendEndpoint = "https://api.resend.com/emails";

export function getMissingPasswordResetEmailConfig() {
  return (["APP_URL", "RESEND_API_KEY", "MAIL_FROM"] as const)
    .filter((key) => !process.env[key]?.trim());
}

export function isPasswordResetEmailConfigured() {
  return getMissingPasswordResetEmailConfig().length === 0;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey) {
    throw new Error("Falta configurar RESEND_API_KEY");
  }
  if (!from) {
    throw new Error("Falta configurar MAIL_FROM");
  }

  const response = await fetch(resendEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Restablece tu contraseña de Pistas Pádel",
      text: `Hemos recibido una solicitud para cambiar la contraseña de tu cuenta.

Abre este enlace en los próximos 30 minutos:
${resetUrl}

Si no lo solicitaste, ignora este mensaje.`,
    }),
  });

  const result = await response.json().catch(() => null) as { id?: unknown } | null;

  if (!response.ok) {
    const deliveryError = new Error(`Resend rejected request (${response.status}).`);
    Object.assign(deliveryError, { code: `RESEND_${response.status}` });
    throw deliveryError;
  }

  return result;
}
