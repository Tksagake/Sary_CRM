"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function DebtorsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [filteredDebtors, setFilteredDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDebtors, setSelectedDebtors] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
      setUserId(userData.id);

      // Fetch debtors
      let query = supabase
        .from("debtors")
        .select("*, users:assigned_to(full_name)");

      if (userData.role === "agent") {
        query = query.eq("assigned_to", userData.id);
      } else if (userData.role === "client") {
        query = query.eq("client_id", userData.id);
      }

      const { data: debtorsData, error: debtorsError } = await query;

      if (debtorsError) {
        console.error("Error fetching debtors:", debtorsError.message);
      } else {
        // Fetch payments for each debtor
        const debtorsWithPayments = await Promise.all(
          debtorsData.map(async (debtor) => {
            const { data: paymentsData, error: paymentsError } = await supabase
              .from("payments")
              .select("amount")
              .eq("debtor_id", debtor.id);

            if (paymentsError) {
              console.error("Error fetching payments:", paymentsError.message);
              return {
                ...debtor,
                total_paid: 0,
                balance_due: debtor.debt_amount,
              };
            }

            const total_paid = paymentsData.reduce((sum, p) => sum + p.amount, 0);
            return {
              ...debtor,
              total_paid,
              balance_due: debtor.debt_amount - total_paid,
            };
          })
        );

        setDebtors(debtorsWithPayments);
        setFilteredDebtors(debtorsWithPayments);
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

  // Handle row click to view debtor details
  const handleRowClick = (debtorId: string) => {
    router.push(`/dashboard/debtors/${debtorId}`);
  };

  // Handle single debtor delete (Admin-only)
  const handleDeleteDebtor = async (debtorId: string) => {
    if (!confirm("Are you sure you want to delete this debtor?")) return;

    const { error } = await supabase.from("debtors").delete().eq("id", debtorId);

    if (error) {
      setMessage({ text: `Error deleting debtor: ${error.message}`, type: "error" });
    } else {
      setDebtors((prev) => prev.filter((debtor) => debtor.id !== debtorId));
      setFilteredDebtors((prev) => prev.filter((debtor) => debtor.id !== debtorId));
      setMessage({ text: "Debtor deleted successfully!", type: "success" });
    }
  };

  // Handle bulk delete (Admin-only)
  const handleBulkDelete = async () => {
    if (selectedDebtors.length === 0) {
      setMessage({ text: "No debtors selected for deletion.", type: "error" });
      return;
    }

    if (!confirm("Are you sure you want to delete the selected debtors?")) return;

    const { error } = await supabase.from("debtors").delete().in("id", selectedDebtors);

    if (error) {
      setMessage({ text: `Error deleting debtors: ${error.message}`, type: "error" });
    } else {
      setDebtors((prev) => prev.filter((debtor) => !selectedDebtors.includes(debtor.id)));
      setFilteredDebtors((prev) => prev.filter((debtor) => !selectedDebtors.includes(debtor.id)));
      setSelectedDebtors([]); // Reset selection
      setMessage({ text: "Selected debtors deleted successfully!", type: "success" });
    }
  };

  // Handle checkbox selection for bulk delete
  const handleSelectDebtor = (debtorId: string) => {
    setSelectedDebtors((prev) =>
      prev.includes(debtorId) ? prev.filter((id) => id !== debtorId) : [...prev, debtorId]
    );
  };

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      {/* Navbar */}
      <Navbar handleLogout={handleLogout} />

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Debtors</h2>

          {/* Bulk Delete Button (Only for Admins) */}
          {userRole === "admin" && selectedDebtors.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md"
            >
              Delete Selected
            </button>
          )}
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`p-3 mb-4 rounded-md text-white ${
              message.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {message.text}
          </div>
        )}

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
                {userRole === "admin" && <th className="px-4 py-2 border">Select</th>}
                <th className="px-4 py-2 border">Debtor Name</th>
                <th className="px-4 py-2 border">Client (Company)</th>
                <th className="px-4 py-2 border">Phone</th>
                <th className="px-4 py-2 border">Total Debt</th>
                <th className="px-4 py-2 border">Total Paid</th>
                <th className="px-4 py-2 border">Remaining Balance</th>
                <th className="px-4 py-2 border">Next Follow-Up</th>
                <th className="px-4 py-2 border">Assigned Agent</th>
                {userRole === "admin" && <th className="px-4 py-2 border">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.map((debtor) => (
                <tr
                  key={debtor.id}
                  className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleRowClick(debtor.id)}
                >
                  {userRole === "admin" && (
                    <td className="px-4 py-2 border text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        onChange={() => handleSelectDebtor(debtor.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-2 border">{debtor.debtor_name}</td>
                  <td className="px-4 py-2 border">{debtor.client}</td>
                  <td className="px-4 py-2 border">{debtor.debtor_phone}</td>
                  <td className="px-4 py-2 border">KES {debtor.debt_amount.toLocaleString()}</td>
                  <td className="px-4 py-2 border">KES {debtor.total_paid.toLocaleString()}</td>
                  <td className="px-4 py-2 border">KES {debtor.balance_due.toLocaleString()}</td>
                  <td className="px-4 py-2 border">{debtor.next_followup_date}</td>
                  <td className="px-4 py-2 border">{debtor.users?.full_name || "Unassigned"}</td>
                  {userRole === "admin" && (
                    <td className="px-4 py-2 border text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteDebtor(debtor.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-md"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
