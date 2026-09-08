"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";

/** On-screen only: the printed sheet must carry nothing but the invoice. */
export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href={backHref} className={buttonClasses("ghost", "sm")}>
        <ArrowLeft size={14} /> Back to order
      </Link>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer size={14} /> Print or save as PDF
      </Button>
    </div>
  );
}
