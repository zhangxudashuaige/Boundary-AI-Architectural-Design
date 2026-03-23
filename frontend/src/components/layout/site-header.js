"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const HEADER_SURFACE = "bg-[#f7f6f2]";

export function SiteHeader({ brand }) {
  const pathname = usePathname();
  const useBackHeader =
    pathname.startsWith("/render") || pathname.startsWith("/history");

  if (useBackHeader) {
    return (
      <header className="sticky top-0 z-30 px-4 pt-4 md:px-6 md:pt-5">
        <div className="mx-auto w-full max-w-[1500px]">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 rounded-[18px] border border-black/12 ${HEADER_SURFACE} px-4 py-3 text-sm text-slate-900 shadow-soft transition hover:bg-[#f1f0ea]`}
          >
            <span aria-hidden="true">←</span>
            <span>返回首页</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 md:px-6 md:pt-5">
      <div
        className={`mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 rounded-[30px] border border-black/12 ${HEADER_SURFACE} px-4 py-4 shadow-soft md:px-5`}
      >
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="relative block h-[72px] w-[210px] shrink-0 overflow-visible">
            <Image
              src="/picture/baad-logo-latest.png"
              alt="BAAD logo"
              fill
              sizes="210px"
              className="origin-left scale-[1.85] object-contain object-left"
              priority
            />
          </span>

          <div className="-ml-1 min-w-0">
            <p className="truncate font-display text-[1.45rem] leading-none text-slate-950 md:text-[1.7rem]">
              {brand}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-500">
              BAAD
            </p>
          </div>
        </Link>

        <div
          className={`shrink-0 rounded-[24px] border border-black/12 ${HEADER_SURFACE} px-5 py-3 shadow-[0_8px_20px_rgba(17,17,17,0.04)]`}
        >
          <div className="flex min-w-[168px] flex-col items-end text-right">
            <p className="text-base font-medium leading-none text-slate-950">
              极光工作室
            </p>
            <p className="mt-1.5 text-[11px] uppercase leading-none tracking-[0.28em] text-slate-500">
              Aurora Studio
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
