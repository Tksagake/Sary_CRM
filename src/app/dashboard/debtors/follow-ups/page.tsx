"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function FollowUpsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Function to get the label for a deal stage value
  const getDealStageLabel = (value) => {
    const stage = dealStages.find((stage) => stage.value === value);
    return stage ? stage.label : "Pending";
  };

  useEffect(() => {
    async function fetchFollowUps() {
      const today = new Date().toISOString().split("T")[0];

      // Fetch debtors whose follow-up date is today or overdue
      const { data, error } = await supabase
        .from("debtors")
        .select("id, debtor_name, client, debtor_phone, debt_amount, next_followup_date, deal_stage, collection_update, assigned_to (full_name)")
        .lte("next_followup_date", today)
        .order("next_followup_date", { ascending: true });

      if (error) {
        console.error("Error fetching follow-ups:", error.message);
      } else {
        // Separate into today's and overdue follow-ups
        const todayList = data.filter((d) => d.next_followup_date === today);
        const overdueList = data.filter((d) => d.next_followup_date < today);

        setTodayFollowUps(todayList);
        setOverdueFollowUps(overdueList);
      }
      setLoading(false);
    }

    fetchFollowUps();
  }, [supabase]);

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Follow-Ups</h2>

        {loading ? (
          <p className="text-center text-lg">Loading follow-ups...</p>
        ) : (
          <>
            {/* Section: Today's Follow-Ups */}
            <FollowUpTable
              title="Today's Follow-Ups"
              data={todayFollowUps}
              router={router}
              getDealStageLabel={getDealStageLabel}
              highlight
            />

            {/* Section: Overdue Follow-Ups */}
            <FollowUpTable
              title="Overdue Follow-Ups"
              data={overdueFollowUps}
              router={router}
              getDealStageLabel={getDealStageLabel}
            />
          </>
        )}
      </main>
    </div>
  );
}

// Reusable Table Component
function FollowUpTable({ title, data, router, getDealStageLabel, highlight = false }) {
  return (
    <div className="mb-8">
      <h3 className={`text-xl font-semibold mb-3 ${highlight ? "text-red-600" : "text-gray-800"}`}>
        {title} ({data.length})
      </h3>

      {data.length === 0 ? (
        <p className="text-gray-500">No {title.toLowerCase()}.</p>
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
              <th className="p-4 text-left">Notes</th>
              <th className="p-4 text-left">Assigned Agent</th>
            </tr>
          </thead>
          <tbody>
            {data.map((debtor) => (
              <tr
                key={debtor.id}
                className="border-b hover:bg-gray-100 cursor-pointer"
                onClick={() => router.push(`/dashboard/debtors/${debtor.id}`)}
              >
                <td className="p-4 text-blue-600 hover:underline">{debtor.debtor_name}</td>
                <td className="p-4">{debtor.client}</td>
                <td className="p-4">{debtor.debtor_phone}</td>
                <td className="p-4">KES {debtor.debt_amount.toLocaleString()}</td>
                <td className="p-4">{debtor.next_followup_date}</td>
                <td className="p-4">{getDealStageLabel(debtor.deal_stage)}</td>
                <td className="p-4">{debtor.collection_update || "N/A"}</td>
                <td className="p-4">{debtor.assigned_to?.full_name || "Unassigned"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}