import { useState } from "react";

export default function ImageCard({
  src,
  alt,
  label,
}: {
  src: string;
  alt: string;
  label: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-zinc-800 rounded-lg p-3">
      <div className="text-xs text-zinc-400 mb-2">{label}</div>

      <div className="aspect-video bg-zinc-900 rounded-md flex items-center justify-center overflow-hidden">
        {src && !imgError ? (
          <img
            src={src}
            alt={alt}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-xs text-zinc-500">Not available</div>
        )}
      </div>
    </div>
  );
}

