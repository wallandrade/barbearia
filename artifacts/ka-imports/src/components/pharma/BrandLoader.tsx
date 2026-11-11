import { cn } from "@/lib/utils";

const SIZES = {
  sm: 24,
  md: 32,
  lg: 48,
} as const;

export type BrandLoaderSize = keyof typeof SIZES;

export function BrandLoader({
  size = "md",
  className,
  label = "Carregando",
}: {
  size?: BrandLoaderSize;
  className?: string;
  label?: string;
}) {
  const px = SIZES[size];
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex shrink-0", className)}
      style={{ width: px, height: px }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width={px}
        height={px}
        fill="none"
        aria-hidden="true"
        className="brand-loader-svg overflow-visible"
      >
        <circle cx="256" cy="256" r="256" fill="var(--pharma-green-ink, #166534)" />
        <g fill="none" stroke="#ffffff" strokeWidth="20" strokeLinecap="round">
          <circle cx="256" cy="256" r="150" />
          <ellipse cx="256" cy="256" rx="150" ry="52" />
          <ellipse cx="256" cy="256" rx="52" ry="150" />
        </g>
        <g className="brand-loader-orbit">
          <path
            d="M107.39 131.30 L113.02 124.88 L118.92 118.72 L125.10 112.82 L131.52 107.20 L138.19 101.87 L145.09 96.83 L152.20 92.11 L159.51 87.70 L167.01 83.62 L174.68 79.87 L182.50 76.46 L190.47 73.40 L198.57 70.70 L206.78 68.35 L215.08 66.36 L223.47 64.75 L231.91 63.50 L240.40 62.63 L248.93 62.13 L257.46 62.01 L266.00 62.26 L274.51 62.89 L282.99 63.89 L291.42 65.26 L299.77 67.00 L308.05 69.11 L316.22 71.58 L324.27 74.41 L332.20 77.59 L339.97 81.11 L347.58 84.98 L355.02 89.17 L362.26 93.69 L369.30 98.52 L376.12 103.66 L382.71 109.09 L389.05 114.81 L395.13 120.80 L400.94 127.05 L406.48 133.55 L411.72 140.29 L416.66 147.26 L421.29 154.43 L425.60 161.80 L429.58 169.35 L433.22 177.07 L436.52 184.95 L439.47 192.96"
            fill="none"
            stroke="var(--pharma-green, #22c55e)"
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M449.23 236.92 L412.59 177.44 L468.05 169.65 Z" fill="var(--pharma-green, #22c55e)" />
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function BrandPageLoader({
  label = "Carregando",
  message,
  className,
}: {
  label?: string;
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen", className)}>
      <BrandLoader size="lg" label={label} />
      {message ? (
        <p className="mt-4 text-muted-foreground font-medium">{message}</p>
      ) : null}
    </div>
  );
}
