import { getDashboardData } from "@/server/db/queries";
import { DashboardContent } from "@/components/dashboard-content";
import { requireUserId } from "@/lib/auth";

export default async function HomePage() {
  const userId = await requireUserId();
  const data = await getDashboardData(userId);

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">task gamifier</h1>
        <p className="text-muted-foreground">Something went wrong loading your data.</p>
      </div>
    );
  }

  return <DashboardContent user={data.user} nextUp={data.nextUp} hasResources={data.hasResources} />;
}
