import Image from "@/components/ui/image";
import { ImageOff, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { ConfirmForm, CopyButton } from "@/components/admin/client";
import { Card, DateCell, PageHeader, Pill } from "@/components/admin/ui";
import { formatBytes, mediaUrl } from "@/lib/media";
import { deleteMedia } from "@/services/admin/media-actions";

export const metadata = { title: "Images" };

/**
 * Every image uploaded through the admin panel, and where each one is used.
 *
 * The "used by" count is the point of the page. A picture's only link to the
 * product or category showing it is the URL, so without this there is no way to
 * know whether deleting one will leave a hole somewhere — and the delete is
 * refused while anything still points at it.
 */
export default async function MediaPage() {
  const session = await requireAdmin();
  const canDelete = hasRole(session, "MANAGER");

  const assets = await db.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      key: true,
      filename: true,
      mime: true,
      bytes: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });

  const urls = assets.map((a) => mediaUrl(a.key));
  const [productUses, categoryUses, subcategoryUses, bannerUses] = await Promise.all([
    db.productImage.groupBy({ by: ["url"], where: { url: { in: urls } }, _count: { _all: true } }),
    db.category.groupBy({ by: ["imageUrl"], where: { imageUrl: { in: urls } }, _count: { _all: true } }),
    db.subcategory.groupBy({ by: ["imageUrl"], where: { imageUrl: { in: urls } }, _count: { _all: true } }),
    db.banner.groupBy({ by: ["imageUrl"], where: { imageUrl: { in: urls } }, _count: { _all: true } }),
  ]);

  const uses = new Map<string, number>();
  const add = (url: string, n: number) => uses.set(url, (uses.get(url) ?? 0) + n);
  for (const r of productUses) add(r.url, r._count._all);
  for (const r of categoryUses) add(r.imageUrl, r._count._all);
  for (const r of subcategoryUses) add(r.imageUrl, r._count._all);
  for (const r of bannerUses) add(r.imageUrl, r._count._all);

  const totalBytes = assets.reduce((sum, a) => sum + a.bytes, 0);

  return (
    <>
      <PageHeader
        title="Images"
        description="Everything uploaded from a product, category or banner form. Images are stored in the database, so they survive every deploy and are included in the nightly backup."
      />

      <Card
        title={`${assets.length} image${assets.length === 1 ? "" : "s"}`}
        description={assets.length > 0 ? `${formatBytes(totalBytes)} in total` : undefined}
      >
        {assets.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-500">
            Nothing uploaded yet. Use <strong>Upload</strong> on any product, category or banner
            form and the file will appear here.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {assets.map((asset) => {
              const url = mediaUrl(asset.key);
              const used = uses.get(url) ?? 0;

              return (
                <li key={asset.id} className="overflow-hidden rounded-xl border border-hairline bg-surface">
                  <div className="relative aspect-square bg-ink-100">
                    <Image src={url} alt={asset.filename} fill sizes="200px" className="object-cover" />
                  </div>
                  <div className="grid gap-1.5 p-2.5">
                    <p className="truncate text-[12px] font-medium text-ink-900" title={asset.filename}>
                      {asset.filename}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      {formatBytes(asset.bytes)} · <DateCell value={asset.createdAt} />
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      {used > 0 ? (
                        <Pill tone="brand">Used {used}×</Pill>
                      ) : (
                        <Pill tone="neutral">Unused</Pill>
                      )}
                      <div className="flex items-center gap-1">
                        <CopyButton value={url} label="Copy URL" />
                        {canDelete && (
                          <ConfirmForm
                            action={deleteMedia}
                            message={
                              used > 0
                                ? `${asset.filename} is used ${used}× — the delete will be refused until those are changed. Continue?`
                                : `Delete ${asset.filename}? This cannot be undone.`
                            }
                            className="inline-flex"
                          >
                            <input type="hidden" name="key" value={asset.key} />
                            <button
                              type="submit"
                              title="Delete image"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
                            >
                              <Trash2 size={13} />
                            </button>
                          </ConfirmForm>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {assets.length === 0 && (
        <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-400">
          <ImageOff size={13} /> Images pasted in as an external address are not listed here — only
          files uploaded through the panel.
        </p>
      )}
    </>
  );
}
