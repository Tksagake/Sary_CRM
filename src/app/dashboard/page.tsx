"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
// Import the custom Navbar component

export default function Dashboard() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | null>(null);
  const [userName, setUserName] = useState<string | null>(null); // State for user's name
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<{ full_name: string; email: string; phone?: string }[]>([]);

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
        setUserName(data.full_name); // Set user's name
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

    fetchUserRole();
    fetchAgents();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      {/* Replace manual sidebar with the custom Navbar component */}
      <Navbar handleLogout={handleLogout} />

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {userName || "User"}
          </h1>
          <p className="text-lg text-gray-600">
            Role: {userRole ? `${userRole.charAt(0).toUpperCase()}${userRole.slice(1)}` : "Loading..."}
          </p>
        </div>
        {userRole === "admin" ? <AdminDashboard agents={agents} /> : <AgentDashboard />}
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

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-2xl font-bold text-blue-600 mt-2">{value}</p>
    </div>
  );
}

import React from 'react';

interface NavbarProps {
  handleLogout: () => Promise<void>;
}
