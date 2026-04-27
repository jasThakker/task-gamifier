type Props = {
  videoId: string;
  startSeconds: number;
  endSeconds: number;
};

export function YouTubeEmbed({ videoId, startSeconds, endSeconds }: Props) {
  const src = `https://www.youtube.com/embed/${videoId}?start=${Math.floor(startSeconds)}&end=${Math.floor(endSeconds)}&rel=0`;

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ paddingTop: "56.25%" }}>
      <iframe
        className="absolute inset-0 h-full w-full"
        src={src}
        title="Session video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
