"use client";

import { useState } from "react";

type ProfileAvatarProps = {
  src: string | null;
  alt: string;
  fallbackText: string;
  className?: string;
  imageClassName?: string;
  loading?: "lazy" | "eager";
};

export default function ProfileAvatar({
  src,
  alt,
  fallbackText,
  className,
  imageClassName,
  loading = "lazy",
}: ProfileAvatarProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const shouldRenderImage = Boolean(src) && !hasError;

  return (
    <div className={`relative overflow-hidden bg-[#ecf3f9] ${className ?? ""}`}>
      {shouldRenderImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? ""}
          alt={alt}
          width={256}
          height={256}
          loading={loading}
          decoding="async"
          onLoad={() => setHasLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            hasLoaded ? "opacity-100" : "opacity-0"
          } ${imageClassName ?? ""}`}
        />
      )}

      {!hasLoaded && shouldRenderImage && (
        <div className="absolute inset-0 bg-[#dce8f1]" aria-hidden="true" />
      )}

      {!shouldRenderImage && (
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[#2c4f70]">
          {fallbackText || "RN"}
        </div>
      )}
    </div>
  );
}
