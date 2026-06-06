import { createAuthClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { AppNavbar } from "@/components/abhyas/AppNavbar";

export default async function DashboardPage() {
  const supabase = createAuthClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/");

  const { data: user } = await supabase
    .from("users")
    .select("github_username, github_avatar, encrypted_api_key")
    .eq("id", session.user.id)
    .single();

  if (!user?.encrypted_api_key) redirect("/onboarding");

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#f7f4ef", color: "#1c1c1c" }}
    >
      <div
        style={{
          height: 3,
          background:
            "linear-gradient(90deg, #3d6b4f 0%, #7ab394 60%, #f7f4ef 100%)",
        }}
      />
      <AppNavbar
        userName={user.github_username}
        activePage="dashboard"
        avatarUrl={user.github_avatar}
      />

      <main className="max-w-4xl mx-auto px-8 py-16">
        <DashboardClient username={user.github_username ?? ""} />
      </main>
    </div>
  );
}
