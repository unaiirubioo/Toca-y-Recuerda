import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[140px] w-full rounded-xl border border-ink-100 bg-white p-4 text-base text-ink-900 placeholder:text-ink-300 focus-ring",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
