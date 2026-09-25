import Link from "next/link";
import { BarChart3, Users, Image as ImageIcon, Nfc, Package, ShoppingBag, ArrowLeft } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Métricas", icon: BarChart3 },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/albumes", label: "Álbumes", icon: ImageIcon },
  { href: "/admin/nfc", label: "NFC", icon: Nfc },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/productos", label: "Productos", icon: ShoppingBag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-100">
      <header className="border-b border-ink-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-6">
          <span className="font-display font-semibold text-ink-900">Toca y Recuerda · Admin</span>
          <nav className="flex gap-4 text-sm text-ink-500">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-1.5 hover:text-ink-900">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/dashboard" className="ml-auto flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
            <ArrowLeft className="h-4 w-4" />
            Volver a la app
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
