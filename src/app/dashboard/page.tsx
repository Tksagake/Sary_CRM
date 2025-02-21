"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import DashboardCard from "@/components/DashboardCard";

export default function Dashboard() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<{ full_name: string; email: string; phone?: string }[]>([]);
  const [clientDebtors, setClientDebtors] = useState<{ debtor_name: string; debt_amount: number; deal_stage: string }[]>([]);

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Fetch user's role and full name
      const { data, error } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Error fetching user data:", error?.message || error);
        router.push("/login");
      } else {
        setUserRole(data.role);
        setUserName(data.full_name);

        // If user is a client, fetch their assigned debtors
        if (data.role === "client") {
          fetchClientDebtors(user.id);
        }
      }
      setLoading(false);
    }

    async function fetchAgents() {
      const { data, error } = await supabase
        .from("users")
        .select("full_name, email, phone")
        .eq("role", "agent");

      if (error) {
        console.error("Error fetching agents:", error.message);
      } else {
        setAgents(data);
      }
    }

    async function fetchClientDebtors(clientId: string) {
      const { data, error } = await supabase
        .from("debtors")
        .select("debtor_name, debt_amount, deal_stage")
        .eq("client_id", clientId);

      if (error) {
        console.error("Error fetching client debtors:", error.message);
      } else {
        setClientDebtors(data);
      }
    }

    fetchUserRole().then(() => {
      if (userRole === "admin") {
        fetchAgents();
      }
    });

  }, [supabase, router, userRole]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={handleLogout} />

      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">
            Welcome, {userName || "User"}
          </h2>
        </div>

        {userRole === "admin" && <AdminDashboard agents={agents} />}
        {userRole === "agent" && <AgentDashboard />}
        {userRole === "client" && <ClientDashboard debtors={clientDebtors} />}
      </main>
    </div>
  );
}

function AdminDashboard({ agents }: { agents: { full_name: string; email: string; phone?: string }[] }) {
  const router = useRouter();

  const handleAgentsOverviewClick = () => {
    router.push("/reports/agents");
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <DashboardCard title="Total Outstanding Debt" value="KES 5,000,000" />
        <DashboardCard title="Total Collected (Month)" value="KES 1,200,000" />
        <DashboardCard title="Overdue Leads" value="48" />
        <DashboardCard title="Agent Performance" value="87% Success Rate" />
        <DashboardCard title="Upcoming Follow-Ups" value="14 Pending Calls" />
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Agents Overview</h3>
        <div
          className="cursor-pointer p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition duration-300"
          onClick={handleAgentsOverviewClick}
        >
          <p className="text-center text-gray-600 text-lg">Click to view detailed report</p>
        </div>
      </div>
    </div>
  );
}

function AgentDashboard() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <DashboardCard title="Assigned Debtors" value="34" />
      <DashboardCard title="Personal Target" value="KES 500,000" />
      <DashboardCard title="Amount Recovered" value="KES 120,000" />
      <DashboardCard title="Overdue Follow-Ups" value="5 Cases" />
    </div>
  );
}

function ClientDashboard({ debtors }: { debtors: { debtor_name: string; debt_amount: number; deal_stage: string }[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Your Assigned Debtors</h3>
      <div className="grid grid-cols-3 gap-6">
        {debtors.length === 0 ? (
          <p className="text-gray-600">No assigned debtors found.</p>
        ) : (
          debtors.map((debtor, index) => (
            <DashboardCard
              key={index}
              title={`${debtor.debtor_name} (${debtor.deal_stage})`}
              value={`KES ${debtor.debt_amount.toLocaleString()}`}
            />
          ))
        )}
      </div>
    </div>
  );
}

import React from "react";
interface NavbarProps {
  handleLogout: () => Promise<void>;
}
