import Link from "next/link";
import { Home } from "lucide-react";

export function HomeLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 focus-ring ${className}`}
    >
      <Home className="h-4 w-4" />
      Inicio
    </Link>
  );
}
