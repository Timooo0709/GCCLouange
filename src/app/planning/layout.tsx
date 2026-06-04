import { PlanningTabs } from "@/components/planning/PlanningTabs"

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PlanningTabs />
      <main className="max-w-[1080px] mx-auto px-4 py-6 pb-16">
        {children}
      </main>
    </div>
  )
}
