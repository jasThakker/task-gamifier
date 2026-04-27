type Props = {
  fullText: string;
  range: [number, number];
};

export function TextExcerpt({ fullText, range }: Props) {
  const [start, end] = range;
  const excerpt = fullText.slice(start, end).trim();

  return (
    <div className="rounded-lg border bg-muted/40 p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Your reading for this session
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{excerpt}</p>
    </div>
  );
}
