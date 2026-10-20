import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/Logo";
import { card } from "@/components/ui/styles";
import { site } from "@/lib/site";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: `Venue login | ${site.name}` };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <Link href="/" aria-label={`${site.name} home`}>
        <Logo />
      </Link>
      <div className={`${card} mt-8 w-full max-w-sm p-6 sm:p-8`}>
        <Suspense fallback={<LoginForm linkError={false} />}>
          <LoginFormWithParams searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginFormWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  return <LoginForm linkError={error === "link"} />;
}
