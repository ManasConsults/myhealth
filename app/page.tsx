import { LoginForm } from "@/components/LoginForm";
import { googleEnabled } from "@/auth";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted/30 p-4">
      <LoginForm googleEnabled={googleEnabled} />
    </div>
  );
}
