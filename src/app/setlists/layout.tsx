import { RequireAuth } from "@/components/auth/RequireAuth";

export default function SetlistsLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
