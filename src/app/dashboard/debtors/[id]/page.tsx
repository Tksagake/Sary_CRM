"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { FaEdit } from "react-icons/fa";

export default function DebtorDetailsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { id } = useParams();
  const [debtor, setDebtor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);

  // Follow-Up Fields
  const [dealStage, setDealStage] = useState("0");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [notes, setNotes] = useState("");

  // Admin Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedDebtor, setEditedDebtor] = useState<any>({});

  // ✅ Deal Stage Dropdown List (Restored)
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
        .from("debtors")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        router.push("/dashboard/debtors");
        return;
      }

      setDebtor(data);
      setEditedDebtor(data);
      setDealStage(data.deal_stage || "0");
      setNextFollowUp(data.next_followup_date || "");
      setLoading(false);
    }

    fetchData();
  }, [supabase, id, router]);

  async function updateDebtor() {
    const { error } = await supabase
      .from("debtors")
      .update({
        deal_stage: dealStage,
        next_followup_date: nextFollowUp,
        collection_update: notes,
        collection_update_date: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      alert("Debtor updated successfully!");
      setDebtor({ ...debtor, deal_stage: dealStage, next_followup_date: nextFollowUp });
    }
  }

  async function updateDebtorDetails() {
    const { error } = await supabase
      .from("debtors")
      .update(editedDebtor)
      .eq("id", id);

    if (!error) {
      alert("Debtor details updated successfully!");
      setDebtor(editedDebtor);
      setShowEditModal(false);
    }
  }

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Debtor Details</h2>
          {userRole === "admin" && (
            <button 
              onClick={() => setShowEditModal(true)} 
              className="bg-gray-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FaEdit className="mr-2" /> Edit Debtor
            </button>
          )}
        </div>

        {/* Debtor Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Basic Information</h3>
          <p><strong>Name:</strong> {debtor.debtor_name}</p>
          <p><strong>Client:</strong> {debtor.client}</p>
          <p><strong>Phone:</strong> {debtor.debtor_phone}</p>
          <p><strong>Email:</strong> {debtor.debtor_email || "N/A"}</p>
          <p><strong>Debt Amount:</strong> KES {debtor.debt_amount.toLocaleString()}</p>
        </div>

        {/* Follow-Up Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Follow-Up Details</h3>
          <label className="block">Update Follow-Up Stage:</label>
          <select 
            className="border p-2 rounded-md w-full"
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
            className="border p-2 rounded-md w-full"
            type="date"
            value={nextFollowUp}
            onChange={(e) => setNextFollowUp(e.target.value)}
          />

          <button onClick={updateDebtor} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4">
            Save Changes
          </button>
        </div>

        {/* Admin Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Edit Debtor</h3>

              <div className="grid grid-cols-2 gap-4">
                {["debtor_name", "client", "debtor_phone", "debtor_email", "debt_amount", "next_followup_date", "product", "lead_interest", "branch_group", "deal_stage", "assigned_to"].map((field) => (
                  <div key={field}>
                    <label className="block font-medium text-gray-700">{field.replace("_", " ")}:</label>
                    <input 
                      className="border p-2 rounded-md w-full"
                      type="text"
                      value={editedDebtor[field] || ""}
                      onChange={(e) => setEditedDebtor({ ...editedDebtor, [field]: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              <button onClick={updateDebtorDetails} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-6 w-full">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
