import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center">
      <section className="w-full max-w-[1380px] space-y-6">
        <div className="ui-stage-shell overflow-hidden p-3 md:p-5">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] bg-white">
            <Image
              src="/picture/workflow-overview.jpg"
              alt="Workflow overview"
              fill
              priority
              sizes="(min-width: 1536px) 1360px, (min-width: 768px) 92vw, 96vw"
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Link
            href="/render"
            className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-black bg-black px-8 py-4 text-base font-semibold uppercase tracking-[0.24em] text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#161616]"
          >
            Start
          </Link>
        </div>
      </section>
    </div>
  );
}
