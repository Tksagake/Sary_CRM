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
  const [agents, setAgents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);

  // Follow-Up Fields
  const [dealStage, setDealStage] = useState("0");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  // Admin Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedDebtor, setEditedDebtor] = useState<any>({});

  // Add state variables for PtP and Collection Updates
  const [ptpDate, setPtpDate] = useState("");
  const [ptpAmount, setPtpAmount] = useState("");
  const [collectionUpdateDate, setCollectionUpdateDate] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");

  // Add state variables for PtP and Collection Update logs
  const [ptpLogs, setPtpLogs] = useState<any[]>([]);
  const [collectionUpdateLogs, setCollectionUpdateLogs] = useState<any[]>([]);

  const dealStages = [
    { value: "0", label: "Select" },
    { value: "1", label: "Outsource Email" },
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
        .select("role, id")
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

      if (data?.assigned_to) {
        const { data: agentData, error: agentError } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", data.assigned_to)
          .single();

        if (!agentError && agentData) {
          data.assigned_to = agentData.full_name;
        }
      }

      setDebtor(data);
      setEditedDebtor(data);
      setDealStage(data.deal_stage || "0");
      setFollowUpDate(data.next_followup_date || "");
      setLoading(false);

      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("debtor_id", id);

      setPayments(paymentData || []);

      const { data: followUpData } = await supabase
        .from("follow_ups")
        .select("*")
        .eq("debtor_id", id);

      setFollowUps(followUpData || []);

      // Fetch PtP and Collection Update logs
      fetchPtpLogs();
      fetchCollectionUpdateLogs();
    }

    fetchData();
  }, [supabase, id, router]);

  useEffect(() => {
    async function fetchAgents() {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "agent");

      if (!error) {
        setAgents(data);
      }
    }

    fetchAgents();
  }, [supabase]);

  async function updateDebtor() {
    const { error: followUpError } = await supabase.from("follow_ups").insert({
      debtor_id: id,
      status: dealStage,
      notes: notes,
      follow_up_date: new Date().toISOString(),
      agent_id: userRole === "agent" ? (await supabase.auth.getUser()).data.user?.id : null,
    });

    if (!followUpError) {
      const { error: updateError } = await supabase
        .from("debtors")
        .update({
          deal_stage: dealStage,
          next_followup_date: followUpDate,
          collection_update: notes,
        })
        .eq("id", id);

      if (!updateError) {
        alert("Debtor updated successfully!");
      } else {
        alert("Error updating debtor: " + updateError.message);
      }
      window.location.reload();
    } else {
      alert("Error logging follow-up: " + followUpError.message);
      window.location.reload();
    }
  }

  async function updateDebtorDetails() {
    const updatedDebtor = { ...editedDebtor };
    for (const key in updatedDebtor) {
      if (updatedDebtor[key] === "") {
        updatedDebtor[key] = null;
      }
    }

    const { error } = await supabase
      .from("debtors")
      .update(updatedDebtor)
      .eq("id", id);

    if (!error) {
      alert("Debtor details updated successfully!");
      router.reload();
    } else {
      alert("Error updating debtor details: " + error.message);
    }
  }

  // Add functions to log PtP and Collection Updates
  async function logPtp() {
    const { error } = await supabase.from("ptp").insert({
      debtor_id: id,
      ptp_date: ptpDate,
      ptp_amount: parseFloat(ptpAmount),
      total_debt: debtor.debt_amount,
      agent_id: userRole === "agent" ? (await supabase.auth.getUser()).data.user?.id : null,
    });

    if (!error) {
      alert("PtP logged successfully!");
      fetchPtpLogs();
    } else {
      alert("Error logging PtP: " + error.message);
    }
  }

  async function logCollectionUpdate() {
    const { error } = await supabase.from("collection_updates").insert({
      debtor_id: id,
      update_date: collectionUpdateDate,
      collection_notes: collectionNotes,
      agent_id: userRole === "agent" ? (await supabase.auth.getUser()).data.user?.id : null,
    });

    if (!error) {
      alert("Collection update logged successfully!");
      fetchCollectionUpdateLogs();
    } else {
      alert("Error logging collection update: " + error.message);
    }
  }

  // Fetch PtP and Collection Update logs
  async function fetchPtpLogs() {
    const { data } = await supabase.from("ptp").select("*").eq("debtor_id", id);
    setPtpLogs(data || []);
  }

  async function fetchCollectionUpdateLogs() {
    const { data } = await supabase.from("collection_updates").select("*").eq("debtor_id", id);
    setCollectionUpdateLogs(data || []);
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
          <p><strong>Secondary Phone:</strong> {debtor.debtor_secondary_phone || "N/A"}</p>
          <p><strong>Email:</strong> {debtor.debtor_email || "N/A"}</p>
          <p><strong>Address:</strong> {debtor.address || "N/A"}</p>
          <p><strong>Debt Amount:</strong> KES {debtor.debt_amount.toLocaleString()}</p>
          <p><strong>Job Title:</strong> {debtor.job_title || "N/A"}</p>
          <p><strong>Tags:</strong> {debtor.tags || "N/A"}</p>
          <p><strong>ID Number:</strong> {debtor.id_number || "N/A"}</p>
          <p><strong>Assigned To:</strong> {debtor.assigned_to || "N/A"}</p>
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
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />

          <label className="block">Notes:</label>
          <textarea
            className="border p-2 rounded-md w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button onClick={updateDebtor} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4">
            Save Changes
          </button>
        </div>

         {/* PtP Form and Logs */}
         <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Promise to Pay (PtP)</h3>
          <label className="block">PtP Date:</label>
          <input
            className="border p-2 rounded-md w-full"
            type="date"
            value={ptpDate}
            onChange={(e) => setPtpDate(e.target.value)}
          />
          <label className="block">PtP Amount:</label>
          <input
            className="border p-2 rounded-md w-full"
            type="number"
            value={ptpAmount}
            onChange={(e) => setPtpAmount(e.target.value)}
          />
          <button onClick={logPtp} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4">
            Log PtP
          </button>

          <h3 className="text-xl font-semibold mt-6">PtP History</h3>
          {ptpLogs.length > 0 ? (
            <ul>
              {ptpLogs.map((ptp) => (
                <li key={ptp.id} className="mb-4">
                  <p><strong>PtP Date:</strong> {new Date(ptp.ptp_date).toLocaleDateString()}</p>
                  <p><strong>PtP Amount:</strong> KES {ptp.ptp_amount.toLocaleString()}</p>
                  <p><strong>Total Debt:</strong> KES {ptp.total_debt.toLocaleString()}</p>
                  <p><strong>Logged At:</strong> {new Date(ptp.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No PtP history found.</p>
          )}
        </div>

        {/* Collection Update Form and Logs */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Collection Update</h3>
          <label className="block">Update Date:</label>
          <input
            className="border p-2 rounded-md w-full"
            type="date"
            value={collectionUpdateDate}
            onChange={(e) => setCollectionUpdateDate(e.target.value)}
          />
          <label className="block">Collection Notes:</label>
          <textarea
            className="border p-2 rounded-md w-full"
            value={collectionNotes}
            onChange={(e) => setCollectionNotes(e.target.value)}
          />
          <button onClick={logCollectionUpdate} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4">
            Log Collection Update
          </button>

          <h3 className="text-xl font-semibold mt-6">Collection Update History</h3>
          {collectionUpdateLogs.length > 0 ? (
            <ul>
              {collectionUpdateLogs.map((update) => (
                <li key={update.id} className="mb-4">
                  <p><strong>Update Date:</strong> {new Date(update.update_date).toLocaleDateString()}</p>
                  <p><strong>Collection Notes:</strong> {update.collection_notes}</p>
                  <p><strong>Logged At:</strong> {new Date(update.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No collection update history found.</p>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Payment History</h3>
          {payments.length > 0 ? (
            <ul>
              {payments.map((payment) => (
                <li key={payment.id} className="mb-4">
                  <p><strong>Amount:</strong> KES {payment.amount.toLocaleString()}</p>
                  <p><strong>Proof of Payment:</strong> <a href={payment.pop_url} target="_blank" rel="noopener noreferrer">View</a></p>
                  <p><strong>Verified:</strong> {payment.verified ? "Yes" : "No"}</p>
                  <p><strong>Uploaded At:</strong> {new Date(payment.uploaded_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No payment history found.</p>
          )}
        </div>

        {/* Follow-Up History */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Follow-Up History</h3>
          {followUps.length > 0 ? (
            <ul>
              {followUps.map((followUp) => {
                const statusLabel = dealStages.find(stage => stage.value === followUp.status)?.label || followUp.status;
                return (
                  <li key={followUp.id} className="mb-4">
                    <p><strong>Status:</strong> {statusLabel}</p>
                    <p><strong>Follow-Up Date:</strong> {new Date(followUp.follow_up_date).toLocaleDateString()}</p>
                    <p><strong>Notes:</strong> {followUp.notes}</p>
                    <p><strong>Created At:</strong> {new Date(followUp.created_at).toLocaleString()}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No follow-up history found.</p>
          )}
        </div>

        {/* Admin Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Edit Debtor</h3>

              <div className="grid grid-cols-2 gap-4">
                {Object.keys(debtor)
                  .filter((field) => field !== "client_id")
                  .map((field) => (
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
                <div>
                  <label className="block font-medium text-gray-700">Assigned To:</label>
                  <select
                    className="border p-2 rounded-md w-full"
                    value={editedDebtor.assigned_to || ""}
                    onChange={(e) => setEditedDebtor({ ...editedDebtor, assigned_to: e.target.value })}
                  >
                    <option value="">Select an agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={updateDebtorDetails}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
