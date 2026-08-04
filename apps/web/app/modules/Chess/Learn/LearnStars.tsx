type LearnStarsProps = {
  stars: number;
  className?: string;
  size?: "sm" | "md";
};

/** Simple star rank display (0–3). Mentingo-owned UI — not copied from external assets. */
export function LearnStars({ stars, className = "", size = "md" }: LearnStarsProps) {
  const clamped = Math.max(0, Math.min(3, Math.floor(stars)));
  const textSize = size === "sm" ? "text-sm" : "text-lg";

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${textSize} ${className}`}
      aria-label={`${clamped} of 3 stars`}
      title={`${clamped}/3`}
    >
      {[1, 2, 3].map((index) => (
        <span
          key={index}
          className={index <= clamped ? "text-amber-500" : "text-neutral-300"}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}
