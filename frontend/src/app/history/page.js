import { HistoryCard } from "@/components/history/history-card";
import { PageLayout } from "@/components/layout/page-layout";
import { SummaryPanel } from "@/components/ui/summary-panel";

const historyCards = [
  {
    title: "现代住宅外观方案",
    status: "待接入真实数据",
    time: "2026-03-21 10:30",
    summary: "这里后续会展示提示词摘要、缩略图和结果图入口。"
  },
  {
    title: "商业街区夜景渲染",
    status: "静态占位",
    time: "2026-03-20 19:12",
    summary: "历史记录接口接通后，这里会显示真实任务状态和渲染结果。"
  },
  {
    title: "办公楼立面材质测试",
    status: "静态占位",
    time: "2026-03-19 15:46",
    summary: "当前先保留列表形态，后续直接替换成接口返回的数据结构。"
  }
];

const summaryItems = [
  {
    label: "列表形态",
    value: "卡片列表"
  },
  {
    label: "当前数据",
    value: "静态占位"
  }
];

export const metadata = {
  title: "历史记录"
};

export default function HistoryPage() {
  return (
    <PageLayout
      eyebrow="History"
      title="历史记录"
      description="这个页面先提供统一的历史记录展示样式。真实接口接入后，可以直接把任务列表、缩略图、状态和结果图链接映射到当前卡片结构里。"
      aside={<SummaryPanel title="List Summary" items={summaryItems} />}
    >
      <section className="grid gap-6">
        {historyCards.map((item) => (
          <HistoryCard key={`${item.title}-${item.time}`} {...item} />
        ))}
      </section>
    </PageLayout>
  );
}
