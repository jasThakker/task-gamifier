import { getDashboardData } from "@/server/db/queries";
import { DashboardContent } from "@/components/dashboard-content";

export default async function HomePage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">task gamifier</h1>
        <p className="text-muted-foreground">Something went wrong loading your data.</p>
      </div>
    );
  }

  return <DashboardContent user={data.user} nextUp={data.nextUp} />;
}
