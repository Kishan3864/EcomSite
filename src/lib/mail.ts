import "server-only";

import { createTransport, type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { BUSINESS } from "@/config/business";

/**
 * Outgoing email, through the store's Gmail account over SMTP.
 *
 *   GMAIL_USER           the Gmail address mail is sent from
 *   GMAIL_APP_PASSWORD   a 16-character App Password for that account (Google
 *                        Account → Security → 2-Step Verification → App
 *                        passwords), never the account's own password
 *
 * Until both are set nothing is sent: sendMail() returns false and every
 * caller carries on without the email. Messages go out as automated no-reply
 * mail, so no Reply-To is set; each email says how to reach support instead.
 *
 * Neither variable's value, nor the SMTP conversation, is ever logged.
 */

type Transport = Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>;

interface Credentials {
  user: string;
  pass: string;
}

function credentials(): Credentials | null {
  const user = process.env.GMAIL_USER?.trim();
  // Google shows App Passwords in four groups of four; the spaces are not part
  // of the password, and pasting them into .env is the usual mistake.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  return user && pass ? { user, pass } : null;
}

let transport: Transport | null = null;

/** Built on first use, so a server without mail credentials never opens a socket. */
function getTransport(auth: Credentials): Transport {
  if (!transport) {
    transport = createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: auth.user, pass: auth.pass },
      // Bounded so a stalled SMTP server cannot hold a request's after()
      // callback open indefinitely.
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transport;
}

/** Whether email can be sent at all. */
export function mailConfigured(): boolean {
  return credentials() !== null;
}

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

/** Sends one message. True once Gmail has accepted it for delivery. */
export async function sendMail(message: OutgoingMail): Promise<boolean> {
  const auth = credentials();
  if (!auth) return false;

  try {
    const info = await getTransport(auth).sendMail({
      // Gmail only sends as the authenticated account, so the From address is
      // always that account; the display name is the brand.
      from: { name: BUSINESS.brandName, address: auth.user },
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.headers,
    });
    return info.accepted.length > 0 && info.rejected.length === 0;
  } catch (error) {
    // The error's message and code are enough to act on. The error object
    // itself is not logged: it carries the SMTP transcript.
    const detail = error as { code?: string; responseCode?: number; message?: string };
    console.error("[mail] send failed", detail.code ?? "", detail.responseCode ?? "", detail.message ?? "");
    return false;
  }
}
