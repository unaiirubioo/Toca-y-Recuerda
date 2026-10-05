"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Image as ImageIcon, Nfc, Package, ShoppingBag, Mail } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Métricas", icon: BarChart3, exact: true },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/albumes", label: "Álbumes", icon: ImageIcon },
  { href: "/admin/nfc", label: "NFC", icon: Nfc },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/productos", label: "Productos", icon: ShoppingBag },
  { href: "/admin/contacto", label: "Contacto", icon: Mail },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Administración">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-cream-100 text-ink-900 shadow-soft"
                : "text-ink-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            <item.icon className={`h-4 w-4 ${active ? "text-amber-600" : ""}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
