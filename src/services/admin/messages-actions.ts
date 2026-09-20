"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import type { FormState } from "./form-state";
import { revalidateAdmin, str } from "./shared";

/**
 * Inbox actions: contact messages and newsletter subscribers.
 *
 * Replies are stored on the message for the team's records; nothing is emailed
 * in this phase. The detail page says so and offers a mailto link instead.
 */

const MESSAGE_STATUSES = ["NEW", "REPLIED", "CLOSED"] as const;
type MessageStatus = (typeof MESSAGE_STATUSES)[number];

function isMessageStatus(value: string): value is MessageStatus {
  return (MESSAGE_STATUSES as readonly string[]).includes(value);
}

function withFlash(path: string, text: string, tone: "ok" | "error" = "ok") {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}flash=${encodeURIComponent(text)}${tone === "error" ? "&tone=error" : ""}`;
}

/** Only ever bounce back to a path inside this module — never to an arbitrary URL. */
function safeReturnTo(raw: string, fallback: string) {
  if (raw.startsWith(fallback) && !raw.startsWith("//") && !/[\r\n]/.test(raw)) return raw;
  return fallback;
}

export async function replyToMessage(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const reply = str(formData, "reply");

  if (reply.length === 0) return { error: "Write a reply before saving.", field: "reply" };
  if (reply.length < 10) return { error: "That is too short to be useful — add a sentence or two.", field: "reply" };
  if (reply.length > 5000) return { error: "Keep the reply under 5,000 characters.", field: "reply" };

  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) return { error: "This message no longer exists." };

  const isUpdate = Boolean(message.reply);
  const updated = await db.contactMessage.update({
    where: { id },
    data: { reply, repliedAt: new Date(), status: "REPLIED" },
  });

  await logActivity(session, {
    action: isUpdate ? "message.reply.update" : "message.reply",
    entity: "ContactMessage",
    entityId: id,
    summary: `${isUpdate ? "Updated the reply to" : "Replied to"} ${updated.name} · ${updated.topic}`,
    metadata: { email: updated.email, orderNumber: updated.orderNumber, previousStatus: message.status },
  });
  revalidateAdmin("messages");
  return {
    ok: true,
    message: isUpdate ? "Reply updated." : "Reply saved and the message marked as replied.",
  };
}

export async function setMessageStatus(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!id) redirect(withFlash("/admin/messages", "Message not found", "error"));

  const back = `/admin/messages/${id}`;
  if (!isMessageStatus(status)) redirect(withFlash(back, "Unknown status", "error"));

  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) redirect(withFlash("/admin/messages", "Message not found", "error"));
  if (message.status === status) redirect(withFlash(back, "No change — the message is already in that state"));
  if (status === "REPLIED" && !message.reply) {
    redirect(withFlash(back, "Save a reply first; it will be marked as replied automatically.", "error"));
  }

  await db.contactMessage.update({ where: { id }, data: { status } });

  const closing = status === "CLOSED";
  await logActivity(session, {
    action: closing ? "message.close" : "message.reopen",
    entity: "ContactMessage",
    entityId: id,
    summary: `${closing ? "Closed" : "Reopened"} the conversation with ${message.name} · ${message.topic}`,
    metadata: { from: message.status, to: status, email: message.email },
  });
  revalidateAdmin("messages");
  redirect(withFlash(back, closing ? "Conversation closed" : "Conversation reopened"));
}

export async function deleteSubscriber(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  const base = "/admin/messages/subscribers";
  const returnTo = safeReturnTo(str(formData, "returnTo"), base);

  const subscriber = await db.newsletterSubscriber.findUnique({ where: { id } });
  if (!subscriber) redirect(withFlash(returnTo, "Subscriber not found", "error"));

  await db.newsletterSubscriber.delete({ where: { id } });
  await logActivity(session, {
    action: "subscriber.delete",
    entity: "NewsletterSubscriber",
    entityId: id,
    summary: `Removed ${subscriber.email} from the newsletter`,
    metadata: { source: subscriber.source, subscribedAt: subscriber.createdAt },
  });
  revalidateAdmin("messages");
  redirect(withFlash(returnTo, `${subscriber.email} removed from the newsletter`));
}

/* --------------------------- Contact blocklist --------------------------- */

/**
 * Blocks the sender of a message, by IP or by email address.
 *
 * Deliberately a manual act with a button behind it rather than something the
 * rate limiter does on its own. An automatic block is how a shop loses a real
 * customer on a shared office connection and never finds out; this way the
 * owner has looked at the message first.
 *
 * Blocking an IP is the blunter of the two — mobile networks and offices put
 * many people behind one address — so the confirmation copy says which is
 * which and the activity log records who did it.
 */
export async function blockContactSender(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const kind = str(formData, "kind");
  const back = safeReturnTo(str(formData, "returnTo"), `/admin/messages/${id}`);

  if (kind !== "IP" && kind !== "EMAIL") {
    redirect(withFlash(back, "Choose whether to block the address or the email", "error"));
  }

  const message = await db.contactMessage.findUnique({
    where: { id },
    select: { email: true, ip: true, name: true },
  });
  if (!message) redirect(withFlash("/admin/messages", "Message not found", "error"));

  const value = kind === "IP" ? message.ip?.trim() : message.email.toLowerCase();
  if (!value) {
    // Messages stored before the IP column existed have none, and there is
    // nothing honest to block.
    redirect(withFlash(back, "No IP was recorded for this message", "error"));
  }

  const existing = await db.contactBlock.findUnique({ where: { kind_value: { kind, value } } });
  if (existing) redirect(withFlash(back, `${value} is already blocked`));

  await db.contactBlock.create({
    data: { kind, value, reason: `From message by ${message.name}`, createdBy: session.name },
  });

  await logActivity(session, {
    action: "contact.block",
    entity: "ContactBlock",
    summary: `Blocked ${kind === "IP" ? "IP" : "email"} ${value} from the contact form`,
    metadata: { kind, value, messageId: id },
  });
  revalidateAdmin("messages");
  redirect(withFlash(back, `${value} can no longer use the contact form`));
}

/** Lifts a block. The counterpart to the button above, for the inevitable mistake. */
export async function unblockContactSender(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const blockId = str(formData, "blockId");
  const back = safeReturnTo(str(formData, "returnTo"), "/admin/messages/blocked");

  const block = await db.contactBlock.findUnique({ where: { id: blockId } });
  if (!block) redirect(withFlash(back, "That block has already been lifted", "error"));

  await db.contactBlock.delete({ where: { id: blockId } });
  await logActivity(session, {
    action: "contact.unblock",
    entity: "ContactBlock",
    summary: `Unblocked ${block.kind === "IP" ? "IP" : "email"} ${block.value}`,
    metadata: { kind: block.kind, value: block.value },
  });
  revalidateAdmin("messages");
  redirect(withFlash(back, `${block.value} can use the contact form again`));
}
