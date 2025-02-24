"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function DebtorDetailsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { id } = useParams(); // Get debtor ID from URL
  const [debtor, setDebtor] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editable Fields
  const [dealStage, setDealStage] = useState("0"); // Default to "Select"
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [notes, setNotes] = useState("");

  // Define the deal stages as an array of objects
  const dealStages = [
    { value: "0", label: "Select" },
    { value: "1", label: "Outsource Email" },
    { value: "13", label: "No Contact Provided" },
    { value: "27", label: "On Hold" },
    { value: "16", label: "Requesting more Information" },
    { value: "22", label: "Invalid Email" },
    { value: "21", label: "Invalid Number" },
    { value: "15", label: "Wrong Number" },
    { value: "2", label: "Introduction Call" },
    { value: "19", label: "Out of Service" },
    { value: "18", label: "Not in Service" },
    { value: "24", label: "Phone Switched Off" },
    { value: "17", label: "Calls Dropped" },
    { value: "25", label: "Follow Up-Email" },
    { value: "3", label: "Ringing No Response" },
    { value: "20", label: "Requested Call Back" },
    { value: "4", label: "Field Visit Meeting" },
    { value: "5", label: "Negotiation in progress" },
    { value: "23", label: "PTP" },
    { value: "7", label: "Scheduled Payment" },
    { value: "8", label: "One-Off Payment" },
    { value: "9", label: "Payment Confirmed by Client" },
    { value: "10", label: "Debt Settled" },
    { value: "14", label: "Non-Committal" },
    { value: "11", label: "Disputing" },
    { value: "12", label: "Legal" },
    { value: "26", label: "Not Interested - BD" },
  ];

  useEffect(() => {
    async function fetchDebtor() {
      const { data, error } = await supabase
        .from("debtors")
        .select("*, assigned_to(full_name), created_by(full_name)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching debtor:", error.message);
        router.push("/dashboard/debtors");
      } else {
        setDebtor(data);
        setDealStage(data.deal_stage || "0"); // Default to "Select"
        setNextFollowUp(data.next_followup_date || "");
      }
    }

    async function fetchFollowUps() {
      const { data, error } = await supabase
        .from("follow_ups")
        .select("*")
        .eq("debtor_id", id)
        .order("follow_up_date", { ascending: false });

      if (error) console.error("Error fetching follow-ups:", error.message);
      else setFollowUps(data || []);
    }

    async function fetchPayments() {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("debtor_id", id)
        .order("uploaded_at", { ascending: false });

      if (error) console.error("Error fetching payments:", error.message);
      else setPayments(data || []);
    }

    fetchDebtor();
    fetchFollowUps();
    fetchPayments();
    setLoading(false);
  }, [supabase, id, router]);

  async function updateDebtor() {
    // Prevent saving if "Select" is chosen
    if (dealStage === "0") {
      alert("Please select a valid deal stage.");
      return;
    }

    const { error } = await supabase
      .from("debtors")
      .update({
        deal_stage: dealStage,
        next_followup_date: nextFollowUp,
        collection_update: notes,
        collection_update_date: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating debtor:", error.message);
      alert(`Error updating debtor: ${error.message}`);
      return;
    }

    alert("Debtor updated successfully!");
    router.push("/dashboard/debtors/follow-ups");
  }

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Debtor Details</h2>

        {debtor ? (
          <>
            {/* Basic Debtor Information */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-xl font-semibold">Basic Information</h3>
              <p><strong>Name:</strong> {debtor.debtor_name}</p>
              <p><strong>Client (Company):</strong> {debtor.client}</p>
              <p><strong>Phone:</strong> {debtor.debtor_phone}</p>
              <p><strong>Email:</strong> {debtor.debtor_email || "N/A"}</p>
              <p><strong>Address:</strong> {debtor.address || "N/A"}</p>
              <p><strong>Debt Amount:</strong> KES {debtor.debt_amount.toLocaleString()}</p>
              <p><strong>Created By:</strong> {debtor.created_by?.full_name || "Unknown"}</p>
              <p><strong>Assigned Agent:</strong> {debtor.assigned_to?.full_name || "Unassigned"}</p>
            </div>

            {/* Editable Follow-Up Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-xl font-semibold">Follow-Up Details</h3>
              <label className="block">Update Follow-Up Stage:</label>
              <select
                className="border p-2 rounded-md w-full mb-4"
                value={dealStage}
                onChange={(e) => setDealStage(e.target.value)}
              >
                {dealStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>

              <label className="block">Next Follow-Up Date:</label>
              <input
                className="border p-2 rounded-md w-full mb-4"
                type="date"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
              />

              <label className="block">Notes:</label>
              <textarea
                className="border p-2 rounded-md w-full mb-4"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any follow-up notes..."
              />

              <button onClick={updateDebtor} className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Save Changes
              </button>
            </div>
          </>
        ) : (
          <p>Loading debtor details...</p>
        )}

        {/* Follow-Up History */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Follow-Up History</h3>
          {followUps.length === 0 ? (
            <p className="text-gray-500">No follow-ups recorded.</p>
          ) : (
            <ul className="list-disc ml-6">
              {followUps.map((f) => (
                <li key={f.id}>
                  <strong>{f.status}:</strong> {f.notes} ({new Date(f.follow_up_date).toDateString()})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold">Payment History</h3>
          {payments.length === 0 ? (
            <p className="text-gray-500">No payments recorded.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Proof</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3">KES {p.amount.toLocaleString()}</td>
                    <td className="p-3">{new Date(p.uploaded_at).toDateString()}</td>
                    <td className="p-3">
                      <a href={p.pop_url} target="_blank" className="text-blue-600 hover:underline">View PoP</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}