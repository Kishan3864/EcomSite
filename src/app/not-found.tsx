import { StoreChrome } from "@/components/layout/store-chrome";
import { NotFoundBody } from "@/components/layout/not-found-body";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * The 404 for a URL that matched no route group at all.
 *
 * Nothing has laid this page out, so it brings the storefront chrome itself.
 * The twin of this file inside the (store) group deliberately does not — see
 * the note on `NotFoundBody`.
 */
export default function NotFound() {
  return (
    <StoreChrome>
      <NotFoundBody />
    </StoreChrome>
  );
}
