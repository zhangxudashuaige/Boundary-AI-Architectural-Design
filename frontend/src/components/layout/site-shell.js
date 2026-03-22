import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";

export function SiteShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-[12%] top-16 h-64 w-64 rounded-full bg-emerald/20 blur-3xl" />
        <div className="absolute right-[8%] top-20 h-72 w-72 rounded-full bg-accent/[0.15] blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <SiteHeader brand={siteConfig.name} navigation={siteConfig.navigation} />

        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-6 pb-20 pt-8 md:px-10 md:pb-28 md:pt-12">
            {children}
          </div>
        </main>

        <footer className="border-t border-white/10 bg-black/10">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between md:px-10">
            <p>{siteConfig.name}</p>
            <p>静态页面骨架已就位，可继续接入上传、任务创建与历史记录接口。</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
