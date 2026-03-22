import { PageLayout } from "@/components/layout/page-layout";
import { HomeWorkspace } from "@/components/home/home-workspace";
import { SummaryPanel } from "@/components/ui/summary-panel";

const summaryItems = [
  {
    label: "当前阶段",
    value: "上传、任务创建、状态轮询"
  },
  {
    label: "当前能力",
    value: "刷新恢复任务状态并自动继续轮询"
  }
];

export default function HomePage() {
  return (
    <PageLayout
      eyebrow="Workspace"
      title="AI 建筑渲染"
      description="首页已经接入真实的图片上传、渲染任务创建与任务状态轮询。创建任务后会自动查询后端状态，任务结束后停止请求；页面刷新后会恢复 taskId、图片地址和 prompt。"
      aside={<SummaryPanel title="Project Overview" items={summaryItems} />}
    >
      <HomeWorkspace />
    </PageLayout>
  );
}
