import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        id={id}
        className={cn(
          "h-12 w-full rounded-xl border bg-white px-4 text-base text-ink-900 placeholder:text-ink-300 focus-ring",
          error ? "border-danger" : "border-ink-100",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
);
Input.displayName = "Input";
