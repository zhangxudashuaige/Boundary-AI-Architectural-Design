import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center">
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-2">
          <div className="min-w-0 flex-1">
            <div className="ui-stage-shell overflow-hidden p-3 md:h-full md:p-5">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] bg-white">
                <Image
                  src="/picture/workflow-overview-v2.png"
                  alt="Workflow overview"
                  fill
                  priority
                  sizes="(min-width: 1536px) 1320px, (min-width: 768px) calc(100vw - 180px), 96vw"
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          <div className="hidden md:flex md:self-stretch md:items-start md:pt-2">
            <Link
              href="/render"
              aria-label="Start"
              className="inline-flex h-1/2 shrink-0 transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Image
                src="/picture/start-sidebar-tight.png"
                alt=""
                width={496}
                height={1744}
                sizes="(min-width: 768px) 100px"
                className="h-full w-auto object-contain"
              />
            </Link>
          </div>
        </div>

        <div className="flex justify-end md:hidden">
          <Link
            href="/render"
            aria-label="Start"
            className="inline-flex h-[180px] shrink-0 transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Image
              src="/picture/start-sidebar-tight.png"
              alt=""
              width={496}
              height={1744}
              sizes="52px"
              className="h-full w-auto object-contain"
            />
          </Link>
        </div>
      </section>
    </div>
  );
}
