"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | null>(null);

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users") // Assuming roles are stored in 'profiles' table
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Error fetching role:", error);
        router.push("/login");
      } else {
        setUserRole(data.role);
      }
    }

    fetchUserRole();
  }, [supabase, router]);

  if (!userRole) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {userRole === "admin" ? <AdminDashboard /> : <AgentDashboard />}
    </div>
  );
}

function AdminDashboard() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Admin Panel</h2>
      <p>Manage users, debts, and collections.</p>
    </div>
  );
}

function AgentDashboard() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Agent Panel</h2>
      <p>Track assigned debts and follow-ups.</p>
    </div>
  );
}
