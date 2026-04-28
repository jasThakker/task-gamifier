import { CreateResourceForm } from "@/components/create-resource-form";

export default function NewResourcePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">New resource</h1>
        <p className="mt-1 text-muted-foreground">
          Paste text, drop a YouTube link, or upload a PDF — we&apos;ll break it into sessions.
        </p>
      </div>
      <CreateResourceForm />
    </div>
  );
}
