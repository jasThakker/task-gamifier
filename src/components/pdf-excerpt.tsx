type Props = {
  rawContent: string;
  pages: number[];
};

export function PdfExcerpt({ rawContent, pages }: Props) {
  const allPages = rawContent.split("\f");
  const entries = pages
    .map((p) => ({ page: p, text: allPages[p - 1]?.trim() ?? "" }))
    .filter((e) => e.text.length > 0);

  const label =
    pages.length === 1
      ? `Page ${pages[0]}`
      : `Pages ${pages[0]}–${pages[pages.length - 1]}`;

  return (
    <div className="card-playful space-y-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">📄</span>
        <span className="text-sm font-bold">{label}</span>
      </div>
      <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
        {entries.map(({ page, text }) => (
          <div key={page}>
            {entries.length > 1 && (
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Page {page}
              </p>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
