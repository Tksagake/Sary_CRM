"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function DebtorsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [filteredDebtors, setFilteredDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Fetch user role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, id")
        .eq("id", user.id)
        .single();

      if (userError || !userData) {
        console.error("Error fetching user data:", userError?.message || userError);
        router.push("/login");
        return;
      }

      setUserRole(userData.role);

      // Fetch debtors & JOIN users table to get assigned agent's name
      let query = supabase
        .from("debtors")
        .select("*, users:assigned_to(full_name)"); // 👈 Fetch agent's name

      if (userData.role === "agent") {
        query = query.eq("assigned_to", userData.id);
      } else if (userData.role === "client") {
        query = query.eq("client_id", userData.id);
      }

      const { data: debtorsData, error: debtorsError } = await query;

      if (debtorsError) {
        console.error("Error fetching debtors:", debtorsError.message);
      } else {
        setDebtors(debtorsData);
        setFilteredDebtors(debtorsData);
      }

      setLoading(false);
    }

    fetchUserData();
  }, [supabase, router]);

  // Search Functionality
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredDebtors(
      debtors.filter(
        (debtor) =>
          debtor.debtor_name.toLowerCase().includes(query) ||
          debtor.client.toLowerCase().includes(query) ||
          debtor.debtor_phone.includes(query) ||
          (debtor.users?.full_name && debtor.users.full_name.toLowerCase().includes(query))
      )
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      {/* Navbar */}
      <Navbar handleLogout={handleLogout} />

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Debtors</h2>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search debtors..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Debtors Table */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-2 border">Debtor Name</th>
                <th className="px-4 py-2 border">Client (Company)</th>
                <th className="px-4 py-2 border">Phone</th>
                <th className="px-4 py-2 border">Debt Amount</th>
                <th className="px-4 py-2 border">Next Follow-Up</th>
                <th className="px-4 py-2 border">Assigned Agent</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.length > 0 ? (
                filteredDebtors.map((debtor) => (
                  <tr key={debtor.id} className="hover:bg-gray-100">
                    <td className="px-4 py-2 border">{debtor.debtor_name}</td>
                    <td className="px-4 py-2 border">{debtor.client}</td>
                    <td className="px-4 py-2 border">{debtor.debtor_phone}</td>
                    <td className="px-4 py-2 border">KES {debtor.debt_amount.toLocaleString()}</td>
                    <td className="px-4 py-2 border">{debtor.next_followup_date}</td>
                    <td className="px-4 py-2 border">{debtor.users ? debtor.users.full_name : "Unassigned"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-600">
                    No debtors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
