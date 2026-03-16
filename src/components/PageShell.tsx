// src/components/PageShell.tsx
import React from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function PageShell({
  title,
  subtitle,
  rightSlot,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("w-full", className)}>
      {(title || subtitle || rightSlot) && (
        <div className="relative mb-6 overflow-hidden rounded-3xl border bg-card/70 shadow-sm">
          {/* Premium background pattern + gradients */}
          <div className="pointer-events-none absolute inset-0">
            {/* soft gradient wash */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/10" />
            {/* subtle top highlight */}
            <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-sky-500/10 blur-2xl" />
            <div className="absolute -top-20 -right-28 h-56 w-56 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-orange-500/10 blur-2xl" />
            {/* dot grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(120,120,120,0.25) 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            />
          </div>

          <div className="relative flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between md:gap-6 md:p-6">
            <div className="min-w-0">
              {title ? (
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                  {title}
                </h1>
              ) : null}
              {subtitle ? (
                <p className="mt-1 text-sm md:text-base text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {rightSlot ? (
              <div className="shrink-0 flex items-center gap-2">
                {rightSlot}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}