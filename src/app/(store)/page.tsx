import type { Metadata } from "next";
import { BRAND } from "@/components/brand/logo";

export const revalidate = 120;

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: "/",
  },
};

/**
 * Homepage — being rebuilt, one band at a time.
 *
 * Deliberately empty. The header and the footer are not rendered here at all:
 * they belong to the `(store)` layout's shell, so the page can be stripped to
 * nothing without touching either. The trust strip and the newsletter that sit
 * above the footer links are part of the footer component too, which is why
 * they are still on the page with nothing else left.
 *
 * Nothing has been deleted to get here. Every band this page used to render —
 * the masthead, the counter, the departments, the spotlight, the shelves, the
 * order journey, the closing statement — is still in `src/components/home/`,
 * unchanged and unused. They go back one at a time, starting with the hero, so
 * each can be judged on its own instead of as one of seven.
 *
 * No data is read here any more, so this page is now pure static HTML. Each
 * band that returns brings its own query back with it.
 */
export default function HomePage() {
  return null;
}
