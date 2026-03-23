import Link from "next/link";

export const metadata = {
  title: "功能二"
};

export default function FeatureTwoPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <section className="ui-stage-shell w-full max-w-3xl p-8 text-center md:p-10">
        <span className="ui-chip-accent">Placeholder</span>
        <h1 className="mt-5 text-4xl font-semibold text-slate-950">
          功能二暂未开放
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          这里已经预留为独立功能页。你后续给出业务方向后，可以在这个路由下直接实现。
        </p>

        <div className="mt-8 flex justify-center">
          <Link href="/" className="ui-button-secondary rounded-[22px]">
            返回功能首页
          </Link>
        </div>
      </section>
    </div>
  );
}
