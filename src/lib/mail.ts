import "server-only";

import { createHash } from "node:crypto";

import { createTransport, type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { BUSINESS } from "@/config/business";

/**
 * Outgoing email, over SMTP.
 *
 * The server is taken from the SMTP_* variables, which is how production is
 * configured (the mailbox for the store's own domain):
 *
 *   SMTP_HOST   the SMTP server's hostname                (default smtp.gmail.com)
 *   SMTP_PORT   the port to connect on                    (default 465)
 *               465 means implicit TLS; on any other port the connection
 *               starts in the clear and is upgraded by STARTTLS
 *   SMTP_USER   the mailbox to authenticate as, and the address mail is sent from
 *   SMTP_PASS   that mailbox's password
 *
 * The older Gmail pair is still read, as the fallback for a server where the
 * SMTP_* variables have not been set yet:
 *
 *   GMAIL_USER           the Gmail address mail is sent from
 *   GMAIL_APP_PASSWORD   a 16-character App Password for that account (Google
 *                        Account → Security → 2-Step Verification → App
 *                        passwords), never the account's own password
 *
 * Until a user and a password are set, from either pair, nothing is sent:
 * sendMail() returns false and every caller carries on without the email.
 * Customer-facing mail sets no Reply-To, so a reply reaches the support mailbox
 * it was sent from; the admin notifications set one deliberately, so that a
 * reply reaches the customer instead.
 *
 * No variable's value, nor the SMTP conversation, is ever logged.
 */

type Transport = Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>;

interface Credentials {
  user: string;
  pass: string;
  /** Which pair of variables these came from. Logged, never the values. */
  source: "SMTP" | "GMAIL";
}

function credentials(): Credentials | null {
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    /**
     * Used EXACTLY as written in .env.
     *
     * This used to run the value through .replace(/\s+/g, ""), which is right
     * for a Gmail App Password — Google prints those in four groups of four and
     * the spaces are display formatting — and badly wrong for an ordinary
     * mailbox password, where a space is a character like any other. A password
     * containing one was silently shortened before it reached the server, which
     * then answers 535 Invalid login, while the same .env read by a plain
     * dotenv script authenticates perfectly. Do not "tidy" this value again.
     */
    return { user: smtpUser, pass: smtpPass, source: "SMTP" };
  }

  const gmailUser = process.env.GMAIL_USER?.trim();
  // Google shows App Passwords in four groups of four; the spaces are not part
  // of the password, and pasting them into .env is the usual mistake. This
  // stripping applies to the Gmail fallback ONLY, for that reason.
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (gmailUser && gmailPass) return { user: gmailUser, pass: gmailPass, source: "GMAIL" };

  return null;
}

/**
 * One line, once per process, the first time mail is sent.
 *
 * A wrong password is invisible from the outside: the server answers 535
 * whatever you sent it. This says which variables were used, how long the
 * password was, and a short hash of it — never the value — so it can be
 * compared with the same hash taken from .env without either of us printing a
 * password. It also reports whether the raw value contained whitespace, since
 * that is precisely what the old code destroyed.
 */
let described = false;
function describeCredentialsOnce(auth: Credentials) {
  if (described) return;
  described = true;

  const raw =
    auth.source === "SMTP" ? (process.env.SMTP_PASS ?? "") : (process.env.GMAIL_APP_PASSWORD ?? "");
  console.log(
    "[mail] using",
    auth.source === "SMTP" ? "SMTP_USER/SMTP_PASS" : "GMAIL_USER/GMAIL_APP_PASSWORD",
    "| user:",
    auth.user,
    "| host:",
    process.env.SMTP_HOST || "smtp.gmail.com",
    "| port:",
    Number(process.env.SMTP_PORT) || 465,
    "| pass length:",
    auth.pass.length,
    "| raw length:",
    raw.length,
    "| whitespace in raw:",
    /\s/.test(raw),
    "| sha256(pass)[0..8]:",
    createHash("sha256").update(auth.pass).digest("hex").slice(0, 8),
  );
}

let transport: Transport | null = null;
/**
 * What the cached transport was built with. A process that is handed different
 * credentials — a reload that re-reads .env, a test that sets them — must not
 * keep authenticating with the old ones from a connection pool it made earlier.
 */
let transportKey = "";

/** Built on first use, so a server without mail credentials never opens a socket. */
function getTransport(auth: Credentials): Transport {
  const key = `${auth.user}:${auth.pass.length}:${process.env.SMTP_HOST ?? ""}:${process.env.SMTP_PORT ?? ""}`;
  if (transport && key !== transportKey) {
    transport.close();
    transport = null;
  }
  transportKey = key;

  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transport = createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      // 465 is implicit TLS; every other port (587, 25) starts in the clear
      // and is upgraded by STARTTLS.
      secure: port === 465,
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
  /**
   * Where a reply should go when that is not the sending mailbox. Used by the
   * admin notifications: the owner reads a contact message in their inbox and
   * hits reply, and it reaches the customer rather than the shop itself.
   * Customer-facing mail leaves this unset, so replies land in support.
   */
  replyTo?: string;
}

/** Sends one message. True once the SMTP server has accepted it for delivery. */
export async function sendMail(message: OutgoingMail): Promise<boolean> {
  const auth = credentials();
  if (!auth) return false;
  describeCredentialsOnce(auth);

  try {
    const info = await getTransport(auth).sendMail({
      // The SMTP server only sends as the authenticated account, so the From
      // address is always that account; the display name is the brand.
      from: { name: BUSINESS.brandName, address: auth.user },
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.headers,
      replyTo: message.replyTo,
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
