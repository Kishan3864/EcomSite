import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { DelhiveryError, delhiveryConfig, packingSlipUrl } from "@/lib/shipping/delhivery";

/**
 * Opens the courier's shipping label for an order. A link rather than an
 * action so it can open in a new tab, ready to print.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return new Response("Sign in to the admin panel first.", { status: 401 });

  const { id } = await context.params;
  const config = delhiveryConfig();
  const order = await db.order.findUnique({ where: { id }, select: { awb: true, courier: true } });
  if (!config || !order?.awb || order.courier !== "Delhivery") {
    return new Response("This order has no Delhivery waybill yet.", { status: 404 });
  }

  try {
    const url = await packingSlipUrl(config, order.awb);
    if (!url) {
      return new Response("Delhivery has not produced a label for this waybill yet. Try again in a minute.", {
        status: 404,
      });
    }
    return Response.redirect(url, 302);
  } catch (error) {
    const message = error instanceof DelhiveryError ? error.message : "Delhivery could not be reached.";
    return new Response(message, { status: 502 });
  }
}
