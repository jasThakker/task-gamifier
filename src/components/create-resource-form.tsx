"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createResource } from "@/server/actions/resources";
import type { CreateResourceState } from "@/server/actions/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Breaking it down… this takes 10–30 seconds" : "Create resource"}
    </Button>
  );
}

export function CreateResourceForm() {
  const [state, action] = useActionState<CreateResourceState, FormData>(
    createResource,
    null
  );
  const [tab, setTab] = useState<"text" | "youtube_video" | "pdf">("text");
  const [skillLevel, setSkillLevel] = useState("intermediate");

  return (
    <form action={action} className="space-y-6">
      {/* hidden field so the server action knows which tab */}
      <input type="hidden" name="sourceType" value={tab} />
      {/* hidden field for skillLevel (Select updates state, state drives hidden input) */}
      <input type="hidden" name="skillLevel" value={skillLevel} />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "text" | "youtube_video" | "pdf")}
      >
        <TabsList className="w-full">
          <TabsTrigger value="text" className="flex-1">
            Plain text
          </TabsTrigger>
          <TabsTrigger value="youtube_video" className="flex-1">
            YouTube video
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex-1">
            PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Introduction to Distributed Systems"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="content"
              name="content"
              placeholder="Paste your text here…"
              rows={10}
              required
            />
          </div>
        </TabsContent>

        <TabsContent value="youtube_video" className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              YouTube URL
            </label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
            />
            <p className="text-xs text-muted-foreground">
              Requires{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">yt-dlp</code>{" "}
              installed locally. The video must have English captions.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="pdf" className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="file" className="text-sm font-medium">
              PDF file
            </label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".pdf,application/pdf"
              required={tab === "pdf"}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Text-based PDFs only — scanned or image-only PDFs won&apos;t work. Max 10 MB.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <label className="text-sm font-medium">Your skill level</label>
        <Select
          value={skillLevel}
          onValueChange={(v) => { if (v !== null) setSkillLevel(v); }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner — new to this topic</SelectItem>
            <SelectItem value="intermediate">Intermediate — know the basics</SelectItem>
            <SelectItem value="advanced">Advanced — deep expertise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state?.error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
