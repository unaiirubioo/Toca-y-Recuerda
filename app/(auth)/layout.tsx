import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Image src="/logo.jpeg" alt="Toca y Recuerda" width={40} height={40} className="rounded-full" />
        <span className="font-display text-lg font-semibold text-ink-900">Toca y Recuerda</span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-card">{children}</div>
    </div>
  );
}
