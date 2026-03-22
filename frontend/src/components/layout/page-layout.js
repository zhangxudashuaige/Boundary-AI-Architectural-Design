import { Panel } from "@/components/ui/panel";

export function PageLayout({ eyebrow, title, description, aside, children }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-4">
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.34em] text-accent">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="max-w-4xl font-display text-5xl leading-none text-white md:text-6xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            {description}
          </p>
        </div>

        {aside ? <Panel className="px-6 py-6">{aside}</Panel> : null}
      </section>

      {children}
    </div>
  );
}
