"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function FollowUpsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [dealStage, setDealStage] = useState("Pending");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [notes, setNotes] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchFollowUps() {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("debtors")
        .select("id, debtor_name, client, debtor_phone, debt_amount, next_followup_date, deal_stage, assigned_to (full_name)")
        .lte("next_followup_date", today)
        .order("next_followup_date", { ascending: true });

      if (error) {
        console.error("Error fetching follow-ups:", error.message);
      } else {
        setFollowUps(data || []);
      }
      setLoading(false);
    }

    fetchFollowUps();
  }, [supabase]);

  const openModal = (debtor) => {
    setSelectedDebtor(debtor);
    setDealStage(debtor.deal_stage || "Pending");
    setNextFollowUp(debtor.next_followup_date || "");
    setNotes("");
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  async function updateFollowUp() {
    const { error } = await supabase
      .from("debtors")
      .update({ deal_stage: dealStage, next_followup_date: nextFollowUp })
      .eq("id", selectedDebtor.id);

    if (error) {
      console.error("Error updating follow-up:", error.message);
    } else {
      // Remove the debtor from the list dynamically
      setFollowUps((prev) => prev.filter((debtor) => debtor.id !== selectedDebtor.id));
      closeModal();
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Follow-Ups</h2>
        {loading ? (
          <p className="text-center text-lg">Loading follow-ups...</p>
        ) : followUps.length === 0 ? (
          <p className="text-center text-lg text-gray-500">No follow-ups due.</p>
        ) : (
          <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4 text-left">Debtor Name</th>
                <th className="p-4 text-left">Client (Company)</th>
                <th className="p-4 text-left">Phone</th>
                <th className="p-4 text-left">Debt Amount</th>
                <th className="p-4 text-left">Follow-Up Date</th>
                <th className="p-4 text-left">Deal Stage</th>
                <th className="p-4 text-left">Assigned Agent</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {followUps.map((debtor) => (
                <tr key={debtor.id} className="border-b">
                  <td className="p-4 text-blue-600 hover:underline cursor-pointer" onClick={() => router.push(`/dashboard/debtors/${debtor.id}`)}>
                    {debtor.debtor_name}
                  </td>
                  <td className="p-4">{debtor.client}</td>
                  <td className="p-4">{debtor.debtor_phone}</td>
                  <td className="p-4">KES {debtor.debt_amount.toLocaleString()}</td>
                  <td className="p-4">{debtor.next_followup_date}</td>
                  <td className="p-4">{debtor.deal_stage || "Pending"}</td>
                  <td className="p-4">{debtor.assigned_to?.full_name || "Unassigned"}</td>
                  <td className="p-4">
                    <button onClick={() => openModal(debtor)} className="bg-blue-600 text-white px-3 py-1 rounded-md">
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Modal for updating follow-ups */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="text-xl font-bold mb-4">Update Follow-Up</h3>
              <label className="block">Follow-Up Stage:</label>
              <select className="border p-2 rounded-md w-full mb-4" value={dealStage} onChange={(e) => setDealStage(e.target.value)}>
                <option value="Pending">Pending</option>
                <option value="Follow-Up Done">Follow-Up Done</option>
                <option value="Promise to Pay">Promise to Pay</option>
                <option value="Resolved">Resolved</option>
              </select>
              <label className="block">Next Follow-Up Date:</label>
              <input className="border p-2 rounded-md w-full mb-4" type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
              <label className="block">Notes:</label>
              <textarea className="border p-2 rounded-md w-full mb-4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
              <div className="flex justify-between">
                <button onClick={closeModal} className="bg-gray-500 text-white px-3 py-1 rounded-md">Cancel</button>
                <button onClick={updateFollowUp} className="bg-blue-600 text-white px-3 py-1 rounded-md">Save</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
