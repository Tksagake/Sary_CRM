"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface Debtor {
  id: string;
  debtor_name: string;
  client: string;
  debt_amount: number;
}

export default function DebtorsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Error fetching user data:", error?.message || error);
        router.push("/login");
      } else {
        setUserRole(data.role);
        setUserId(data.id);
      }
    }

    fetchUserData();
  }, [supabase, router]);

  useEffect(() => {
    if (userRole && userId) {
      fetchDebtors();
    }
  }, [userRole, userId]);

  async function fetchDebtors() {
    let query = supabase.from("debtors").select("id, debtor_name, client, debt_amount");

    if (userRole === "agent") {
      query = query.eq("assigned_to", userId);
    } else if (userRole === "client") {
      query = query.eq("client_id", userId);
    } // Admin sees all debtors, no filtering needed

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching debtors:", error.message);
    } else {
      setDebtors(data);
    }
    setLoading(false);
  }

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); router.push("/login"); }} />

      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Debtors</h2>
        <table className="w-full bg-white rounded-lg shadow-md">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-3 text-left">Debtor Name</th>
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Debt Amount (KES)</th>
            </tr>
          </thead>
          <tbody>
            {debtors.length > 0 ? (
              debtors.map((debtor) => (
                <tr key={debtor.id} className="border-b hover:bg-gray-100">
                  <td className="p-3">{debtor.debtor_name}</td>
                  <td className="p-3">{debtor.client}</td>
                  <td className="p-3 font-bold text-red-600">KES {debtor.debt_amount.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">No debtors found</td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
