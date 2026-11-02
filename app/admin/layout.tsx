import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Sidebar, SidebarSkeleton } from "@/components/dash/Sidebar";
import { site } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = { title: `Admin | ${site.name}`, robots: { index: false } };

/** Same shell as the dashboard, so admins keep the sidebar and venue switcher. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={`dash ${inter.variable} ${jetbrains.variable} flex flex-1 flex-col lg:flex-row`}>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <main className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}
