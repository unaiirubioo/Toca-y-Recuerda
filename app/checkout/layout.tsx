import { SiteHeader } from "@/components/layout/site-header";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
