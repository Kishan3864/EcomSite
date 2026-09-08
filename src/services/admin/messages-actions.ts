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
