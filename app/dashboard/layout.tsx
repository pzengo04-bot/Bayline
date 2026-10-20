import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader, AppHeaderSkeleton } from "@/components/app/AppHeader";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: `Dashboard | ${site.name}`, robots: { index: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<AppHeaderSkeleton />}>
        <AppHeader />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-5 sm:pt-8 print:m-0 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
