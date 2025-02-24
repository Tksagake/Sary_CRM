"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function PaymentDetailsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { id } = useParams();
  const [payment, setPayment] = useState<any>(null);
  const [userRole, setUserRole] = useState<"admin" | "agent" | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPoP, setNewPoP] = useState<File | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserRole(userData?.role);

      const { data, error } = await supabase
        .from("payments")
        .select("*, agent:users(full_name), debtor:debtors(debtor_name)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching payment:", error.message);
        router.push("/dashboard/payments");
      } else {
        setPayment(data);
      }

      setLoading(false);
    }

    fetchData();
  }, [supabase, id, router]);

  async function approvePayment() {
    const { error } = await supabase.from("payments").update({ verified: true }).eq("id", id);
    if (!error) {
      alert("Payment approved!");
      setPayment({ ...payment, verified: true });
    }
  }

  async function uploadNewPoP() {
    if (!newPoP) return;

    const filePath = `pops/${id}.${newPoP.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("payments").upload(filePath, newPoP, {
      upsert: true,
    });

    if (uploadError) {
      alert(`Error uploading file: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from("payments").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("payments")
      .update({ pop_url: urlData.publicUrl, verified: false })
      .eq("id", id);

    if (!updateError) {
      alert("PoP updated successfully!");
      setPayment({ ...payment, pop_url: urlData.publicUrl, verified: false });
    }
  }

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Payment Details</h2>

        {payment ? (
          <>
            <p><strong>Debtor Name:</strong> {payment.debtor?.debtor_name || "Unknown"}</p>
            <p><strong>Agent:</strong> {payment.agent?.full_name || "Unassigned"}</p>
            <p><strong>Amount:</strong> KES {payment.amount.toLocaleString()}</p>
            <p><strong>Status:</strong> {payment.verified ? "✅ Verified" : "⏳ Pending"}</p>

            <h3 className="mt-6 text-xl font-semibold">Proof of Payment</h3>
            {payment.pop_url && (
              <a href={payment.pop_url} target="_blank" className="text-blue-600 underline">
                View PoP
              </a>
            )}

            {userRole === "admin" && !payment.verified && (
              <button onClick={approvePayment} className="bg-green-600 text-white px-4 py-2 rounded-md mt-4">
                Approve Payment
              </button>
            )}

            {userRole === "agent" && (
              <>
                <input type="file" onChange={(e) => setNewPoP(e.target.files?.[0] || null)} />
                <button onClick={uploadNewPoP} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4">
                  Re-upload PoP
                </button>
              </>
            )}
          </>
        ) : (
          <p>Payment not found.</p>
        )}
      </main>
    </div>
  );
}
