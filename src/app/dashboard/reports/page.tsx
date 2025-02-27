"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const dealStages = {
  "0": "Select",
  "1": "Outsource Email",
  "13": "No Contact Provided",
  "27": "On Hold",
  "16": "Requesting more Information",
  "22": "Invalid Email",
  "21": "Invalid Number",
  "15": "Wrong Number",
  "2": "Introduction Call",
  "19": "Out of Service",
  "18": "Not in Service",
  "24": "Phone Switched Off",
  "17": "Calls Dropped",
  "25": "Follow Up-Email",
  "3": "Ringing No Response",
  "20": "Requested Call Back",
  "4": "Field Visit Meeting",
  "5": "Negotiation in progress",
  "23": "PTP",
  "7": "Scheduled Payment",
  "8": "One-Off Payment",
  "9": "Payment Confirmed by Client",
  "10": "Debt Settled",
  "14": "Non-Committal",
  "11": "Disputing",
  "12": "Legal",
  "26": "Not Interested - BD",
};

export default function ReportsPage() {
  const supabase = createClientComponentClient();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    client: "",
    assignedTo: "",
  });
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [followUpHistory, setFollowUpHistory] = useState<any[]>([]);
  const [groupedData, setGroupedData] = useState<any[]>([]);
  const [reportType, setReportType] = useState("followUpHistory");
  const [selectedDebtors, setSelectedDebtors] = useState<string[]>([]);
  const [specialCasesOptions, setSpecialCasesOptions] = useState({
    followUpHistory: false,
    paymentHistory: false,
    ptpLogs: false,
    collectionUpdates: false,
  });

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("role, id")
        .eq("id", user.id)
        .single();

      if (userData) {
        setUserRole(userData.role);
        setUserId(userData.id);
        fetchReports(userData.role, userData.id);
        fetchDropdownData();
      }
    }

    async function fetchDropdownData() {
      const { data: agentsData } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "agent");
      setAgents(agentsData?.map((agent) => ({ id: agent.id, name: agent.full_name })) || []);

      const { data: clientsData } = await supabase
        .from("debtors")
        .select("client")
        .neq("client", null);
      const uniqueClients = [...new Set(clientsData?.map((row) => row.client))];
      setClients(uniqueClients || []);
    }

    async function fetchReports(role: string, id: string) {
      let query = supabase
        .from("debtors")
        .select("id, debtor_name, client, debt_amount, assigned_to, debtor_email, debtor_phone");

      if (role === "agent") {
        query = query.eq("assigned_to", id);
      } else if (role === "client") {
        query = query.eq("created_by", id);
      }

      const { data, error } = await query;
      if (!error) setReports(data || []);
      setLoading(false);
    }

    fetchUserData();
  }, [supabase]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const filtered = reports.filter((report) => {
      return (
        (!filters.client || report.client === filters.client) &&
        (!filters.assignedTo || report.assigned_to === filters.assignedTo)
      );
    });
    setFilteredReports(filtered);
  }, [filters, reports]);

  useEffect(() => {
    async function fetchHistory() {
      if (filteredReports.length > 0) {
        const debtorIds = filteredReports.map((report) => report.id);

        const { data: paymentData } = await supabase
          .from("payments")
          .select("*")
          .in("debtor_id", debtorIds);
        setPaymentHistory(paymentData || []);

        const { data: followUpData } = await supabase
          .from("follow_ups")
          .select("*")
          .in("debtor_id", debtorIds);
        setFollowUpHistory(followUpData || []);

        const grouped = groupDataByDebtor(filteredReports, followUpData, paymentData);
        setGroupedData(grouped);
      }
    }

    fetchHistory();
  }, [filteredReports]);

  const groupDataByDebtor = (reports, followUpHistory, paymentHistory) => {
    return reports.map((report) => {
      return {
        ...report,
        followUpHistory: followUpHistory.filter((followUp) => followUp.debtor_id === report.id),
        paymentHistory: paymentHistory.filter((payment) => payment.debtor_id === report.id),
      };
    });
  };

  const handleGenerateReport = () => {
    if (selectedDebtors.length > 0) {
      setShowReportModal(true);
    } else {
      alert("Please select at least one debtor to generate a report.");
    }
  };

  

  const toggleDebtorSelection = (debtorId: string) => {
    setSelectedDebtors((prevSelected) =>
      prevSelected.includes(debtorId)
        ? prevSelected.filter((id) => id !== debtorId)
        : [...prevSelected, debtorId]
    );
  };

  const selectAllDebtors = () => {
    setSelectedDebtors(groupedData.map((debtor) => debtor.id));
  };

  const handleSpecialCasesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpecialCasesOptions({
      ...specialCasesOptions,
      [e.target.name]: e.target.checked,
    });
  };

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Reports</h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Search Leads & Generate Reports</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Client:</label>
              <select className="border p-2 rounded-md w-full" name="client" onChange={handleFilterChange}>
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium">Assigned Agent:</label>
              <select className="border p-2 rounded-md w-full" name="assignedTo" onChange={handleFilterChange}>
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium">Report Type:</label>
              <select
                className="border p-2 rounded-md w-full"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="followUpHistory">Follow-Up History</option>
                <option value="paymentHistory">Payment History</option>
                <option value="ptpLogs">PtP Logs</option>
                <option value="collectionUpdates">Collection Updates</option>
                <option value="specialCases">Special Cases</option>
              </select>
            </div>
          </div>
          {reportType === "specialCases" && (
            <div className="mt-4">
              <label className="block font-medium">Include Data:</label>
              <div className="flex space-x-4">
                <label>
                  <input
                    type="checkbox"
                    name="followUpHistory"
                    checked={specialCasesOptions.followUpHistory}
                    onChange={handleSpecialCasesChange}
                  />
                  Follow-Up History
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="paymentHistory"
                    checked={specialCasesOptions.paymentHistory}
                    onChange={handleSpecialCasesChange}
                  />
                  Payment History
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="ptpLogs"
                    checked={specialCasesOptions.ptpLogs}
                    onChange={handleSpecialCasesChange}
                  />
                  PtP Logs
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="collectionUpdates"
                    checked={specialCasesOptions.collectionUpdates}
                    onChange={handleSpecialCasesChange}
                  />
                  Collection Updates
                </label>
              </div>
            </div>
          )}
          <button
            onClick={handleGenerateReport}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Generate Report
          </button>
          <button
            onClick={selectAllDebtors}
            className="mt-4 ml-2 bg-gray-600 text-white px-4 py-2 rounded-md"
          >
            Select All
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          {loading ? (
            <p>Loading reports...</p>
          ) : (
            <div>
              {groupedData.map((debtor) => (
                <div key={debtor.id} className="mb-8">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={selectedDebtors.includes(debtor.id)}
                      onChange={() => toggleDebtorSelection(debtor.id)}
                      className="mr-2"
                    />
                    <h4 className="text-lg font-semibold">{debtor.debtor_name}</h4>
                  </div>
                  <p><strong>Client:</strong> {debtor.client}</p>
                  <p><strong>Phone:</strong> {debtor.debtor_phone}</p>
                  <p><strong>Email:</strong> {debtor.debtor_email}</p>
                  <p><strong>Debt Amount:</strong> KES {debtor.debt_amount.toLocaleString()}</p>

                  <h5 className="text-md font-semibold mt-4 mb-2">Follow-Up History</h5>
                  {debtor.followUpHistory.length > 0 ? (
                    debtor.followUpHistory.map((followUp) => (
                      <div key={followUp.id} className="mb-4">
                        <p><strong>Status:</strong> {followUp.status}</p>
                        <p><strong>Follow-Up Date:</strong> {new Date(followUp.follow_up_date).toLocaleDateString()}</p>
                        <p><strong>Notes:</strong> {followUp.notes}</p>
                        <p><strong>Created At:</strong> {new Date(followUp.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p>No follow-up records available.</p>
                  )}

                  <h5 className="text-md font-semibold mt-4 mb-2">Payment History</h5>
                  {debtor.paymentHistory.length > 0 ? (
                    debtor.paymentHistory.map((payment, index) => (
                      <div key={payment.id} className="mb-4">
                        <p><strong>{index + 1}</strong></p>
                        <p><strong>Amount:</strong> KES {payment.amount.toLocaleString()}</p>
                        <p><strong>Proof of Payment:</strong> <a href={payment.pop_url} target="_blank" rel="noopener noreferrer">View</a></p>
                        <p><strong>Verified:</strong> {payment.verified ? "Yes" : "No"}</p>
                        <p><strong>Uploaded At:</strong> {new Date(payment.uploaded_at).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p>No payment records available.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showReportModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Report Generated Successfully</h3>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={downloadPDF}
                  className="bg-red-600 text-white px-4 py-2 rounded-md"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
