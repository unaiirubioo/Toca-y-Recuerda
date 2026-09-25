import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-ink-50 text-ink-500",
        premium: "bg-amber-500/15 text-amber-600",
        success: "bg-success/15 text-success",
        warning: "bg-orange-500/15 text-orange-600",
        danger: "bg-danger/15 text-danger",
        outline: "border border-ink-100 text-ink-500",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
