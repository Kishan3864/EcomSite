import { NotFoundBody } from "@/components/layout/not-found-body";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * The 404 for a `notFound()` thrown inside the storefront — an unknown product
 * slug, a dead category, an order that is not yours.
 *
 * No chrome here: the (store) layout has already wrapped this in the header,
 * footer and cart drawer. Rendering `StoreChrome` again, as the root 404 does,
 * is what used to stack two mastheads and two footers down the page.
 */
export default function StoreNotFound() {
  return <NotFoundBody />;
}
