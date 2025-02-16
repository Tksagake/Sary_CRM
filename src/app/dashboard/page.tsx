"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { FaHome, FaUserFriends, FaMoneyBill, FaFileAlt, FaBell, FaPhone, FaAngleDown } from "react-icons/fa"; // Import icons

export default function Dashboard() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Authentication error:", authError?.message || authError);
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Error fetching role:", error.message || error);
        router.push("/login");
      } else {
        setUserRole(data.role);
      }
      setLoading(false);
    }

    fetchUserRole();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <Sidebar handleLogout={handleLogout} />

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
        {userRole === "admin" ? <AdminDashboard /> : <AgentDashboard />}
      </main>
    </div>
  );
}

function Sidebar({ handleLogout }: { handleLogout: () => void }) {
  return (
    <aside className="w-64 bg-blue-900 text-white p-6 h-screen flex flex-col fixed left-0 top-0">
      <h2 className="text-2xl font-bold mb-6">Sary CRM</h2>
      <nav className="flex-1 space-y-3">
        <NavItem link="/dashboard" label="Dashboard" icon={<FaHome />} />
        <DropdownMenu label="Debtors" icon={<FaUserFriends />}>
          <NavItem link="/debtors" label="View Debtors" />
          <NavItem link="/debtors/import" label="Import Debtors" />
          <NavItem link="/debtors/follow-ups" label="Follow-Ups" />
        </DropdownMenu>
        <DropdownMenu label="Payments" icon={<FaMoneyBill />}>
          <NavItem link="/payments" label="Payment Tracking" />
          <NavItem link="/payments/approve" label="Approve PoP" />
        </DropdownMenu>
        <DropdownMenu label="Reports" icon={<FaFileAlt />}>
          <NavItem link="/reports/monthly" label="Monthly Reports" />
          <NavItem link="/reports/performance" label="Performance Dashboard" />
        </DropdownMenu>
        <DropdownMenu label="Notifications" icon={<FaBell />}>
          <NavItem link="/notifications/sms" label="Bulk SMS" />
          <NavItem link="/notifications/reminders" label="Agent Reminders" />
        </DropdownMenu>
        <DropdownMenu label="Communication" icon={<FaPhone />}>
          <NavItem link="/communication/calls" label="Call Log" />
          <NavItem link="/communication/sms" label="SMS Log" />
          <NavItem link="/communication/emails" label="Email Log" />
        </DropdownMenu>
      </nav>
      <button onClick={handleLogout} className="mt-6 p-3 bg-red-500 w-full rounded-lg hover:bg-red-600">
        Logout
      </button>
    </aside>
  );
}

function NavItem({ link, label, icon }: { link: string; label: string; icon?: React.ReactNode }) {
  return (
    <li>
      <a href={link} className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700 transition">
        {icon} <span>{label}</span>
      </a>
    </li>
  );
}

function DropdownMenu({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full p-3 rounded-lg hover:bg-blue-700 transition"
      >
        <span className="flex items-center gap-3">
          {icon} {label}
        </span>
        <FaAngleDown className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <ul className="ml-5 space-y-2">{children}</ul>}
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <DashboardCard title="Total Outstanding Debt" value="KES 5,000,000" />
      <DashboardCard title="Total Collected (Month)" value="KES 1,200,000" />
      <DashboardCard title="Overdue Leads" value="48" />
      <DashboardCard title="Agent Performance" value="87% Success Rate" />
      <DashboardCard title="Upcoming Follow-Ups" value="14 Pending Calls" />
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
