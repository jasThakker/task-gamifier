import Link from "next/link";
import { getAllResources } from "@/server/db/queries";
import { buttonVariants } from "@/components/ui/button";
import { ResourceList } from "@/components/resource-list";
import { requireUserId } from "@/lib/auth";

export default async function ResourcesPage() {
  const userId = await requireUserId();
  const allResources = await getAllResources(userId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your resources</h1>
        <Link href="/resources/new" className={buttonVariants()}>
          + New
        </Link>
      </div>
      <ResourceList resources={allResources} />
    </div>
  );
}
