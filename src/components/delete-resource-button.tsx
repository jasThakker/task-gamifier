"use client";

import { useRef } from "react";
import { deleteResource } from "@/server/actions/resources";
import { buttonVariants } from "@/components/ui/button";

export function DeleteResourceButton({ resourceId }: { resourceId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    if (!confirm("Delete this resource and all its sessions? This can't be undone.")) {
      e.preventDefault();
    }
  }

  return (
    <form ref={formRef} action={deleteResource} onSubmit={handleSubmit}>
      <input type="hidden" name="resourceId" value={resourceId} />
      <button
        type="submit"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive hover:text-destructive hover:bg-destructive/10" })}
      >
        Delete
      </button>
    </form>
  );
}
