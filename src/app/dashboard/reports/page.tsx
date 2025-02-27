"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

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
  const [clients, setClients] = useState<string[]>([]); // Unique client names from debtors table
  const [showReportModal, setShowReportModal] = useState(false); // Toggle report modal
  const [filteredReports, setFilteredReports] = useState<any[]>([]); // Reports filtered by filters
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]); // Payment history for all filtered debtors
  const [followUpHistory, setFollowUpHistory] = useState<any[]>([]); // Follow-up history for all filtered debtors

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

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Apply filters
  useEffect(() => {
    const filtered = reports.filter((report) => {
      return (
        (!filters.client || report.client === filters.client) &&
        (!filters.assignedTo || report.assigned_to === filters.assignedTo)
      );
    });
    setFilteredReports(filtered);
  }, [filters, reports]);

  // Fetch payment and follow-up history for all filtered debtors
  useEffect(() => {
    async function fetchHistory() {
      if (filteredReports.length > 0) {
        const debtorIds = filteredReports.map((report) => report.id);

        // Fetch Payment History
        const { data: paymentData } = await supabase
          .from("payments")
          .select("*")
          .in("debtor_id", debtorIds);
        setPaymentHistory(paymentData || []);

        // Fetch Follow-Up History
        const { data: followUpData } = await supabase
          .from("follow_ups")
          .select("*")
          .in("debtor_id", debtorIds);
        setFollowUpHistory(followUpData || []);
      }
    }

    fetchHistory();
  }, [filteredReports]);

  // Handle Generate Report Button Click
  const handleGenerateReport = () => {
    if (filteredReports.length > 0) {
      setShowReportModal(true);
    } else {
      alert("No data to generate a report.");
    }
  };

  // Download Report as PDF
  const downloadPDF = async () => {
    const doc = new jsPDF();

    // Add Basic Information
    doc.setFontSize(16);
    doc.text("Basic Information", 10, 10);
    doc.setFontSize(12);
    filteredReports.forEach((report, index) => {
      const y = 20 + index * 30;
      doc.text(`Name: ${report.debtor_name}`, 10, y);
      doc.text(`Client: ${report.client}`, 10, y + 5);
      doc.text(`Phone: ${report.debtor_phone}`, 10, y + 10);
      doc.text(`Email: ${report.debtor_email}`, 10, y + 15);
      doc.text(`Debt Amount: KES ${report.debt_amount.toLocaleString()}`, 10, y + 20);
    });

    // Add Follow-Up History
    doc.setFontSize(16);
    doc.text("Follow-Up History", 10, doc.previousAutoTable?.finalY || 50);
    doc.setFontSize(12);
    followUpHistory.forEach((followUp, index) => {
      const y = (doc.previousAutoTable?.finalY || 60) + index * 30;
      doc.text(`Status: ${followUp.status}`, 10, y);
      doc.text(`Follow-Up Date: ${new Date(followUp.follow_up_date).toLocaleDateString()}`, 10, y + 5);
      doc.text(`Notes: ${followUp.notes}`, 10, y + 10);
      doc.text(`Created At: ${new Date(followUp.created_at).toLocaleString()}`, 10, y + 15);
    });

    // Add Payment History
    doc.setFontSize(16);
    doc.text("Payment History", 10, doc.previousAutoTable?.finalY || 100);
    doc.setFontSize(12);
    paymentHistory.forEach((payment, index) => {
      const y = (doc.previousAutoTable?.finalY || 110) + index * 30;
      doc.text(`Amount: KES ${payment.amount.toLocaleString()}`, 10, y);
      doc.text(`Proof of Payment: View`, 10, y + 5);
      doc.text(`Verified: ${payment.verified ? "Yes" : "No"}`, 10, y + 10);
      doc.text(`Uploaded At: ${new Date(payment.uploaded_at).toLocaleString()}`, 10, y + 15);
    });

    doc.save("report.pdf");
  };

  // Download Report as Excel
  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Basic Information Sheet
    const basicInfo = filteredReports.map((report) => ({
      "Name": report.debtor_name,
      "Client": report.client,
      "Phone": report.debtor_phone,
      "Email": report.debtor_email,
      "Debt Amount": `KES ${report.debt_amount.toLocaleString()}`,
    }));
    const basicInfoSheet = XLSX.utils.json_to_sheet(basicInfo);
    XLSX.utils.book_append_sheet(workbook, basicInfoSheet, "Basic Information");

    // Follow-Up History Sheet
    const followUpInfo = followUpHistory.map((followUp) => ({
      "Status": followUp.status,
      "Follow-Up Date": new Date(followUp.follow_up_date).toLocaleDateString(),
      "Notes": followUp.notes,
      "Created At": new Date(followUp.created_at).toLocaleString(),
    }));
    const followUpSheet = XLSX.utils.json_to_sheet(followUpInfo);
    XLSX.utils.book_append_sheet(workbook, followUpSheet, "Follow-Up History");

    // Payment History Sheet
    const paymentInfo = paymentHistory.map((payment) => ({
      "Amount": `KES ${payment.amount.toLocaleString()}`,
      "Proof of Payment": "View",
      "Verified": payment.verified ? "Yes" : "No",
      "Uploaded At": new Date(payment.uploaded_at).toLocaleString(),
    }));
    const paymentSheet = XLSX.utils.json_to_sheet(paymentInfo);
    XLSX.utils.book_append_sheet(workbook, paymentSheet, "Payment History");

    XLSX.writeFile(workbook, "report.xlsx");
  };

  // Download Report as CSV
  const downloadCSV = () => {
    const csvData = [
      ...filteredReports.map((report) => ({
        "Name": report.debtor_name,
        "Client": report.client,
        "Phone": report.debtor_phone,
        "Email": report.debtor_email,
        "Debt Amount": `KES ${report.debt_amount.toLocaleString()}`,
      })),
      ...followUpHistory.map((followUp) => ({
        "Status": followUp.status,
        "Follow-Up Date": new Date(followUp.follow_up_date).toLocaleDateString(),
        "Notes": followUp.notes,
        "Created At": new Date(followUp.created_at).toLocaleString(),
      })),
      ...paymentHistory.map((payment) => ({
        "Amount": `KES ${payment.amount.toLocaleString()}`,
        "Proof of Payment": "View",
        "Verified": payment.verified ? "Yes" : "No",
        "Uploaded At": new Date(payment.uploaded_at).toLocaleString(),
      })),
    ];

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "report.csv");
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
          </div>

          {/* Generate Report Button */}
          <button
            onClick={handleGenerateReport}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md"
          >
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

        {/* Report Preview Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Report Preview</h3>

              {/* Basic Information */}
              <h4 className="text-lg font-semibold mb-2">Basic Information</h4>
              {filteredReports.map((report) => (
                <div key={report.id} className="mb-6">
                  <p><strong>Name:</strong> {report.debtor_name}</p>
                  <p><strong>Client:</strong> {report.client}</p>
                  <p><strong>Phone:</strong> {report.debtor_phone}</p>
                  <p><strong>Email:</strong> {report.debtor_email}</p>
                  <p><strong>Debt Amount:</strong> KES {report.debt_amount.toLocaleString()}</p>
                </div>
              ))}

              {/* Follow-Up History */}
              <h4 className="text-lg font-semibold mb-2">Follow-Up History</h4>
              {followUpHistory.map((followUp) => (
                <div key={followUp.id} className="mb-6">
                  <p><strong>Status:</strong> {followUp.status}</p>
                  <p><strong>Follow-Up Date:</strong> {new Date(followUp.follow_up_date).toLocaleDateString()}</p>
                  <p><strong>Notes:</strong> {followUp.notes}</p>
                  <p><strong>Created At:</strong> {new Date(followUp.created_at).toLocaleString()}</p>
                </div>
              ))}

              {/* Payment History */}
              <h4 className="text-lg font-semibold mb-2">Payment History</h4>
              {paymentHistory.map((payment, index) => (
                <div key={payment.id} className="mb-6">
                  <p><strong>{index + 1}</strong></p>
                  <p><strong>Amount:</strong> KES {payment.amount.toLocaleString()}</p>
                  <p><strong>Proof of Payment:</strong> <a href={payment.pop_url} target="_blank" rel="noopener noreferrer">View</a></p>
                  <p><strong>Verified:</strong> {payment.verified ? "Yes" : "No"}</p>
                  <p><strong>Uploaded At:</strong> {new Date(payment.uploaded_at).toLocaleString()}</p>
                </div>
              ))}

              {/* Download Buttons */}
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={downloadPDF}
                  className="bg-red-600 text-white px-4 py-2 rounded-md"
                >
                  Download PDF
                </button>
                <button
                  onClick={downloadExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-md"
                >
                  Download Excel
                </button>
                <button
                  onClick={downloadCSV}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}