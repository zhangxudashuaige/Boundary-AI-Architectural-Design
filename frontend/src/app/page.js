import Image from "next/image";
import Link from "next/link";

const featureEntries = [
  {
    href: "/render",
    eyebrow: "Plan Inspiration",
    title: "ai模型发散",
    description: "为平面图和立体图提供灵感辅助",
    action: "START",
    imageSrc: "/picture/model-divergence-reference.jpeg",
    imageAlt: "ai模型发散预览图"
  },
  {
    href: "/feature-2",
    eyebrow: "Rendering",
    title: "ai建筑渲染",
    description:
      "对用户输入的建筑模型进行智能渲染，生成高质量的视觉效果。",
    action: "START",
    imageSrc: "/picture/render-preview-reference.png",
    imageAlt: "智能建筑渲染预览图"
  },
  {
    href: "/feature-3",
    eyebrow: "Thermal Performance",
    title: "建筑热工性能分析",
    description:
      "围绕遮阳、通风、得热损失与能耗流向，快速形成面向建筑方案的热工分析视图。",
    action: "START",
    imageSrc: "/picture/thermal-performance-reference.png",
    imageAlt: "建筑热工性能分析预览图"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-3">
        {featureEntries.map((item) => (
          <article
            key={item.href}
            className="ui-gallery-card flex min-h-[680px] h-full flex-col overflow-hidden p-0"
          >
            <div className="ui-gallery-media flex min-h-[340px] items-center p-5 md:min-h-[380px] md:p-6">
              <div className="flex h-full w-full items-center justify-center">
                <div className="ui-feature-preview-shell">
                  <Image
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    fill
                    sizes="(min-width: 1280px) 30vw, 100vw"
                    className="object-contain p-4"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-between p-5">
              <div className="space-y-4">
                <span className="ui-chip-accent">{item.eyebrow}</span>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-slate-950">
                    {item.title}
                  </h2>
                  <p className="text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={item.href}
                  className="ui-button-secondary w-full justify-center rounded-[22px]"
                >
                  {item.action}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
