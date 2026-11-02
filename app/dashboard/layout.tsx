import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { InstallTip } from "@/components/app/InstallTip";
import { Sidebar, SidebarSkeleton } from "@/components/dash/Sidebar";
import { site } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `Dashboard | ${site.name}`,
  robots: { index: false },
  // iPhone Home Screen app: full screen, dark status bar, "Bayline" under the icon.
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "black" },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className={`dash ${inter.variable} ${jetbrains.variable} flex flex-1 flex-col lg:flex-row`}>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <main className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8 print:m-0 print:max-w-none print:p-0">
        <InstallTip />
        {children}
      </main>
    </div>
  );
}
