import { SiteShell } from "@/components/layout/site-shell";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="bg-background font-sans text-foreground antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
