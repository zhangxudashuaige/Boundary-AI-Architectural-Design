import Link from "next/link";

export const metadata = {
  title: "功能三"
};

export default function FeatureThreePage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <section className="ui-stage-shell w-full max-w-3xl p-8 text-center md:p-10">
        <span className="ui-chip-accent">Placeholder</span>
        <h1 className="mt-5 text-4xl font-semibold text-slate-950">
          功能三暂未开放
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          这里同样作为独立功能页的预留位。后面你可以直接将新功能接入到这个页面。
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
