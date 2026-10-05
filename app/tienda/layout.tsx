import { SiteHeader } from "@/components/layout/site-header";

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
