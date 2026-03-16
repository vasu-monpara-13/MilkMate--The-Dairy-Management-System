import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  roundedClassName?: string;
  fallbackSrc?: string;
};

export default function PremiumProductImage({
  src,
  alt,
  className,
  roundedClassName = "rounded-2xl",
  fallbackSrc,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const finalSrc = useMemo(() => {
    if (!src || failed) return fallbackSrc || "";
    return src;
  }, [src, failed, fallbackSrc]);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", roundedClassName, className)}>
      {/* Blur background */}
      {finalSrc ? (
        <img
          src={finalSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-60"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/70 via-muted to-muted/40" />
      )}

      {/* Shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/10 dark:bg-white/5" />
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}

      {/* Foreground image */}
      {finalSrc ? (
        <img
          src={finalSrc}
          alt={alt}
          draggable={false}
          className={cn(
            "relative h-full w-full object-cover transition duration-500",
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
        />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="text-xs text-muted-foreground">No image</div>
        </div>
      )}

      {/* Premium overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
    </div>
  );
}