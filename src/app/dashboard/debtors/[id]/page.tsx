"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";

export default function EditDebtorPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { id } = useParams();
  const [debtor, setDebtor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dealStage, setDealStage] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");

  useEffect(() => {
    async function fetchDebtor() {
      const { data, error } = await supabase.from("debtors").select("*").eq("id", id).single();
      if (error) console.error("Error fetching debtor:", error.message);
      else {
        setDebtor(data);
        setDealStage(data.deal_stage || "Pending");
        setNextFollowUp(data.next_followup_date || "");
      }
      setLoading(false);
    }
    fetchDebtor();
  }, [id, supabase]);

  async function updateDebtor() {
    const { error } = await supabase
      .from("debtors")
      .update({ deal_stage: dealStage, next_followup_date: nextFollowUp })
      .eq("id", id);

    if (error) {
      console.error("Error updating debtor:", error.message);
    } else {
      router.push("/dashboard/debtors/follow-ups");
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold">Edit Debtor: {debtor.debtor_name}</h2>
        <div className="mt-4">
          <label className="block">Deal Stage:</label>
          <select className="border p-2 rounded-md" value={dealStage} onChange={(e) => setDealStage(e.target.value)}>
            <option value="Pending">Pending</option>
            <option value="Follow-Up Done">Follow-Up Done</option>
            <option value="Promise to Pay">Promise to Pay</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <div className="mt-4">
          <label className="block">Next Follow-Up Date:</label>
          <input className="border p-2 rounded-md" type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
        </div>
        <button className="mt-6 p-3 bg-blue-600 text-white rounded-md" onClick={updateDebtor}>
          Save Changes
        </button>
      </main>
    </div>
  );
}
