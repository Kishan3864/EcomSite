/**
 * Rules about an order's state that both the server and the browser need.
 *
 * Deliberately not in `services/commerce.ts`: that file is `"use server"`, and
 * every export of a server-action module has to be an async function that can
 * be called over the wire. A plain predicate like this one cannot live there
 * and be imported by a client component, so it lives here instead.
 */

/**
 * Whether a customer may still cancel this order themselves.
 *
 * The line is packing. Once an order is PACKED it has been picked, boxed and
 * very often handed to a courier, and a cancellation at that point is really a
 * return — the parcel has to come back before anybody can be made whole. The
 * order page says that in words rather than hiding the control, because a
 * customer who cannot find out why simply calls instead.
 */
export function customerMayCancel(status: string): boolean {
  const s = status.toUpperCase();
  return s === "PENDING" || s === "CONFIRMED";
}
