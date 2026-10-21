import { getAdminSession } from "@/lib/auth/admin";
import { domainSaleHtml, getDomainSale } from "@/lib/domain-sale";

/** The sale page exactly as visitors would get it, from the saved settings, whether or not it is switched on. */
export async function GET() {
  const session = await getAdminSession();
  if (!session || session.role !== "OWNER") return new Response("Not found", { status: 404 });
  return new Response(domainSaleHtml(await getDomainSale()), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
