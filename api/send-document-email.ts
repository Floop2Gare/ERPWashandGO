import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

type RequestBody = {
  to?: string[];
  subject?: string;
  body?: string;
  attachment?: {
    filename?: string;
    content?: string;
    contentType?: string;
  };
};

const resolveBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }
  return value === 'true' || value === '1';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return res.status(503).json({ error: 'smtp_not_configured' });
  }

  const body = (req.body ?? {}) as RequestBody;
  const recipients = Array.isArray(body.to) ? body.to.filter(Boolean) : [];
  const subject = body.subject?.trim();
  const text = body.body ?? '';

  if (!recipients.length || !subject) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  try {
    const port = Number.parseInt(SMTP_PORT, 10);
    const secure = resolveBoolean(process.env.SMTP_SECURE, port === 465);

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number.isFinite(port) ? port : 587,
      secure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const attachments = [] as {
      filename: string;
      content: Buffer;
      contentType?: string;
    }[];

    if (body.attachment?.filename && body.attachment.content) {
      attachments.push({
        filename: body.attachment.filename,
        content: Buffer.from(body.attachment.content, 'base64'),
        contentType: body.attachment.contentType,
      });
    }

    await transporter.sendMail({
      from: SMTP_FROM ?? SMTP_USER,
      to: recipients.join(','),
      subject,
      text,
      attachments,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Wash&Go] send-document-email failed', error);
    return res.status(500).json({ error: 'email_send_failed' });
  }
}
