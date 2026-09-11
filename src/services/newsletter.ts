"use server";

import { db } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/newsletter-token";
import { clientIp, rateLimit, TOO_MANY } from "@/lib/rate-limit";

/**
 * Newsletter actions reachable from the storefront.
 *
 * Like every server action, this is a public endpoint: anyone can call it with
 * any arguments. It trusts nothing from the page it was rendered on and checks
 * the signed link again itself.
 */

export interface UnsubscribeState {
  done?: boolean;
  error?: string;
}

export async function unsubscribeFromNewsletter(
  _prev: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  if (!rateLimit("newsletter-unsubscribe-page:ip", await clientIp(), 20, 10 * 60_000)) {
    return { error: TOO_MANY };
  }

  const email = verifyUnsubscribe(formData.get("e"), formData.get("t"));
  if (!email) {
    return {
      error:
        "This unsubscribe link is not valid. Please use the link in your latest WeekendCart email, or contact us and we will remove you.",
    };
  }

  // Already gone is still a success, so this never reveals whether the
  // address was on the list.
  await db.newsletterSubscriber.deleteMany({ where: { email } });
  return { done: true };
}
