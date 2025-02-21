"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function DebtorsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setUserRole(data.role);
        fetchDebtors(data.role, user.id);
      }
    }

    async function fetchDebtors(role: string, userId: string) {
      let query = supabase.from("debtors").select("*");

      if (role === "agent") {
        query = query.eq("assigned_to", userId);
      } else if (role === "client") {
        query = query.eq("client_id", userId);
      }

      const { data, error } = await query;

      if (!error && data) {
        setDebtors(data);
      }
    }

    fetchUserRole();
  }, [supabase, router]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredDebtors = debtors.filter((debtor) =>
    debtor.debtor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6 text-blue-900">Debtors</h2>

      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
        <table className="w-full border-collapse text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Client (Who They Owe)</th>
              <th className="p-4">Debt Amount (KES)</th>
              <th className="p-4">Next Follow-Up</th>
            </tr>
          </thead>
          <tbody>
            {filteredDebtors.length > 0 ? (
              filteredDebtors.map((debtor) => (
                <tr key={debtor.id} className="border-b hover:bg-gray-100 transition">
                  <td className="p-4">{debtor.debtor_name}</td>
                  <td className="p-4 font-semibold">{debtor.client || "N/A"}</td>
                  <td className="p-4 text-blue-700 font-semibold">{debtor.debt_amount.toLocaleString()}</td>
                  <td className="p-4">{debtor.next_followup_date || "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-500">No debtors found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
