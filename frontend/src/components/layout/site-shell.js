"use client";

import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";
import { usePathname } from "next/navigation";

export function SiteShell({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative flex min-h-screen flex-col">
        {!isHome ? (
          <SiteHeader brand={siteConfig.name} navigation={siteConfig.navigation} />
        ) : null}

        <main className="flex-1">
          <div
            className={
              isHome
                ? "w-full"
                : "mx-auto w-full max-w-[1500px] px-4 pb-20 pt-6 md:px-6 md:pb-28 md:pt-8"
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
