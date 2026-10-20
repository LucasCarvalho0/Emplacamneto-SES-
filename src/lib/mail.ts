import nodemailer from "nodemailer";

/** Envia e-mail por SMTP. Sem SMTP_URL: em desenvolvimento, mostra o conteúdo no terminal. */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") console.log(`\n[e-mail para ${to}] ${subject}\n${text}\n`);
    else console.error("SMTP_URL não configurado: e-mail de recuperação não enviado.");
    return;
  }
  const transport = nodemailer.createTransport(url);
  await transport.sendMail({ from: process.env.MAIL_FROM ?? "Emplacamento SESÉ <no-reply@localhost>", to, subject, text });
}
