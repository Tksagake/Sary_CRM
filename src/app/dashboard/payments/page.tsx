"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function PaymentsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id, debtor_id, amount, pop_url, verified, uploaded_at, debtor:debtors(debtor_name), clients:debtors(client)" // Different aliases for debtor and client
        )
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error.message);
      } else {
        setPayments(data);
      }

      setLoading(false);
    }

    fetchPayments();
  }, [supabase]);

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Payment Tracking</h2>

        {loading ? (
          <p className="text-center text-lg">Loading payments...</p>
        ) : payments.length === 0 ? (
          <p className="text-center text-lg text-gray-500">No payments found.</p>
        ) : (
          <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4 text-left">Debtor Name</th>
                <th className="p-4 text-left">Client</th> {/* New row for Client */}
                <th className="p-4 text-left">Amount</th>
                <th className="p-4 text-left">Uploaded At</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-gray-100 cursor-pointer">
                  <td className="p-4">{payment.debtor?.debtor_name || "Unknown"}</td> {/* Debtor Name */}
                  <td className="p-4">{payment.clients?.client || "Unknown"}</td> {/* Client Name from debtors table */}
                  <td className="p-4">KES {payment.amount.toLocaleString()}</td>
                  <td className="p-4">{new Date(payment.uploaded_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    {payment.verified ? (
                      <span className="text-green-600 font-bold">✅ Verified</span>
                    ) : (
                      <span className="text-yellow-600 font-bold">⏳ Pending</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => router.push(`/dashboard/payments/${payment.id}`)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
