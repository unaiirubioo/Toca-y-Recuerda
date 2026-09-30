import { HashSessionHandler } from "@/components/auth/hash-session-handler";

export default async function CompletarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <HashSessionHandler next={next ?? "/onboarding"} />;
}
