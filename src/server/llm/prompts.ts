import type { NormalizedContent } from "@/server/ingest/types";

type SkillLevel = "beginner" | "intermediate" | "advanced";

const SKILL_INSTRUCTIONS: Record<SkillLevel, string> = {
  beginner: `
- Create more sessions with smaller chunks (aim for 10–20 minutes each).
- Define all domain-specific terms in key_concepts.
- Use plain language in focus goals and outcome statements.
- Learning objectives should be concrete and narrow — one idea at a time.
- Err on the side of more sessions rather than fewer.`,

  intermediate: `
- Create medium-sized sessions (15–30 minutes each).
- Assume the learner knows basic terminology; skip introductory definitions.
- Learning objectives can connect multiple concepts.
- Focus on understanding mechanics and relationships, not just surface facts.`,

  advanced: `
- Create fewer, larger sessions (25–45 minutes each) covering broader territory.
- Assume strong domain knowledge; omit beginner-level definitions.
- Learning objectives should emphasise synthesis, trade-offs, and critical analysis.
- Outcome statements should reference applying, evaluating, or designing — not just understanding.`,
};

function formatTranscript(content: Extract<NormalizedContent, { kind: "youtube" }>): string {
  return content.transcript
    .map((seg) => {
      const start = Math.floor(seg.startSeconds);
      const m = Math.floor(start / 60);
      const s = start % 60;
      return `[${m}:${s.toString().padStart(2, "0")}] ${seg.text}`;
    })
    .join("\n");
}

function formatText(content: Extract<NormalizedContent, { kind: "text" }>): string {
  return content.text;
}

function formatPDF(content: Extract<NormalizedContent, { kind: "pdf" }>): string {
  return content.pageTexts
    .map((text, i) => `--- Page ${i + 1} ---\n${text}`)
    .join("\n\n");
}

export function buildPrompt(
  content: NormalizedContent,
  skillLevel: SkillLevel
): { system: string; user: string } {
  const skillInstructions = SKILL_INSTRUCTIONS[skillLevel];

  const system = `You are an expert learning designer. Your job is to break a learning resource into well-structured study sessions so a learner can work through it incrementally.

Each session must have:
- title: short, descriptive name for the session
- focusGoal: 1–2 sentences describing what the learner focuses on in this session
- learningObjectives: 3–5 specific, actionable bullet points (start each with an action verb)
- keyConcepts: list of key terms or ideas covered (1–8 items)
- outcomeStatement: a single sentence starting "After this session you will be able to..."
- estimatedMinutes: realistic study time in minutes (integer)
${
  content.kind === "youtube"
    ? `- startSeconds: integer — the transcript timestamp where this session starts
- endSeconds: integer — the transcript timestamp where this session ends
Timestamps must come directly from the transcript. Do not invent timestamps.`
    : content.kind === "pdf"
    ? `- pages: array of 1-indexed page numbers this session covers (e.g. [1, 2, 3])
Pages must come from the document. Do not invent page numbers.`
    : ""
}

Skill-level guidance:${skillInstructions}

Respond only with valid JSON matching the requested schema. Do not include commentary outside the JSON.`;

  const user =
    content.kind === "youtube"
      ? `Break this YouTube video transcript into study sessions.

Video title: ${content.title}
Total duration: ${Math.floor(content.durationSeconds / 60)} minutes
Skill level: ${skillLevel}

Transcript (format: [M:SS] text):
${formatTranscript(content)}`
      : content.kind === "pdf"
      ? `Break this PDF document into study sessions.

Title: ${content.title}
Total pages: ${content.totalPages}
Skill level: ${skillLevel}

Document (each page is marked with "--- Page N ---"):
${formatPDF(content)}`
      : `Break this learning text into study sessions.

Title: ${content.title}
Skill level: ${skillLevel}

Text:
${formatText(content)}`;

  return { system, user };
}
