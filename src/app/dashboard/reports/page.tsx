"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";

export default function ReportsPage() {
  const supabase = createClientComponentClient();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    client: "",
    assignedTo: "",
    dealStage: "",
    leadInterest: "",
    minAmount: "",
    maxAmount: "",
  });

  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<string[]>([]); // Unique client names from debtors table
  const [selectedDebtor, setSelectedDebtor] = useState<any>(null); // Selected debtor for detailed report
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]); // Payment history for selected debtor
  const [followUpHistory, setFollowUpHistory] = useState<any[]>([]); // Follow-up history for selected debtor

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
      // Fetch Agents
      const { data: agentsData } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "agent");
      setAgents(agentsData?.map((agent) => ({ id: agent.id, name: agent.full_name })) || []);

      // Fetch Unique Clients from Debtors Table
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
        .select("id, debtor_name, client, debt_amount, assigned_to, created_by, deal_stage, lead_interest, debtor_email, debtor_phone");

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

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Apply filters
  const filteredReports = reports.filter((report) => {
    return (
      (!filters.client || report.client === filters.client) &&
      (!filters.assignedTo || report.assigned_to === filters.assignedTo) &&
      (!filters.dealStage || report.deal_stage === filters.dealStage) &&
      (!filters.leadInterest || report.lead_interest === filters.leadInterest) &&
      (!filters.minAmount || report.debt_amount >= parseFloat(filters.minAmount)) &&
      (!filters.maxAmount || report.debt_amount <= parseFloat(filters.maxAmount))
    );
  });

  // Fetch detailed report for a debtor
  const fetchDetailedReport = async (debtorId: string) => {
    // Fetch Debtor Details
    const { data: debtorData } = await supabase
      .from("debtors")
      .select("*")
      .eq("id", debtorId)
      .single();

    if (debtorData) {
      setSelectedDebtor(debtorData);

      // Fetch Payment History
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("debtor_id", debtorId);
      setPaymentHistory(paymentData || []);

      // Fetch Follow-Up History
      const { data: followUpData } = await supabase
        .from("follow_ups")
        .select("*")
        .eq("debtor_id", debtorId);
      setFollowUpHistory(followUpData || []);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Reports</h2>

        {/* Filter Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Search Leads & Generate Reports</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Client Filter */}
            <div>
              <label className="block font-medium">Client:</label>
              <select className="border p-2 rounded-md w-full" name="client" onChange={handleFilterChange}>
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>

            {/* Assigned Agent Filter */}
            <div>
              <label className="block font-medium">Assigned Agent:</label>
              <select className="border p-2 rounded-md w-full" name="assignedTo" onChange={handleFilterChange}>
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>

            {/* Deal Stage */}
            <div>
              <label className="block font-medium">Deal Stage:</label>
              <input type="text" className="border p-2 rounded-md w-full" name="dealStage" onChange={handleFilterChange} />
            </div>

            {/* Lead Interest */}
            <div>
              <label className="block font-medium">Lead Interest:</label>
              <select className="border p-2 rounded-md w-full" name="leadInterest" onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>

            {/* Min and Max Debt Amount */}
            <div>
              <label className="block font-medium">Min Debt Amount:</label>
              <input type="number" className="border p-2 rounded-md w-full" name="minAmount" onChange={handleFilterChange} />
            </div>

            <div>
              <label className="block font-medium">Max Debt Amount:</label>
              <input type="number" className="border p-2 rounded-md w-full" name="maxAmount" onChange={handleFilterChange} />
            </div>
          </div>

          {/* Generate Report Button */}
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md">
            Generate Report
          </button>
        </div>

        {/* Report Table */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          {loading ? (
            <p>Loading reports...</p>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-2 border">Debtor Name</th>
                  <th className="px-4 py-2 border">Client</th>
                  <th className="px-4 py-2 border">Debt Amount</th>
                  <th className="px-4 py-2 border">Assigned Agent</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-b">
                    <td className="px-4 py-2 border">{report.debtor_name}</td>
                    <td className="px-4 py-2 border">{report.client}</td>
                    <td className="px-4 py-2 border">KES {report.debt_amount.toLocaleString()}</td>
                    <td className="px-4 py-2 border">
                      {agents.find((agent) => agent.id === report.assigned_to)?.name || "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detailed Report Modal */}
        {selectedDebtor && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Detailed Report</h3>

              {/* Debtor Details */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-2">Debtor Details</h4>
                <p><strong>Name:</strong> {selectedDebtor.debtor_name}</p>
                <p><strong>Email:</strong> {selectedDebtor.debtor_email}</p>
                <p><strong>Phone:</strong> {selectedDebtor.debtor_phone}</p>
                <p><strong>Debt Amount:</strong> KES {selectedDebtor.debt_amount.toLocaleString()}</p>
              </div>

              {/* Payment History */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-2">Payment History</h4>
                {paymentHistory.length > 0 ? (
                  <ul>
                    {paymentHistory.map((payment) => (
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
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-2">Follow-Up History</h4>
                {followUpHistory.length > 0 ? (
                  <ul>
                    {followUpHistory.map((followUp) => (
                      <li key={followUp.id} className="mb-4">
                        <p><strong>Status:</strong> {followUp.status}</p>
                        <p><strong>Follow-Up Date:</strong> {new Date(followUp.follow_up_date).toLocaleDateString()}</p>
                        <p><strong>Notes:</strong> {followUp.notes}</p>
                        <p><strong>Created At:</strong> {new Date(followUp.created_at).toLocaleString()}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No follow-up history found.</p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedDebtor(null)}
                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}