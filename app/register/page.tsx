import { RegisterForm } from "@/components/RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted/30 p-4">
      <RegisterForm pendingStatus={status} />
    </div>
  );
}
