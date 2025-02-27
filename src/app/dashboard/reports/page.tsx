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
  const [groupedData, setGroupedData] = useState<any[]>([]); // Grouped data by debtor

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

        // Group data by debtor
        const grouped = groupDataByDebtor(filteredReports, followUpData, paymentData);
        setGroupedData(grouped);
      }
    }

    fetchHistory();
  }, [filteredReports]);

  // Group Data by Debtor
  const groupDataByDebtor = (reports, followUpHistory, paymentHistory) => {
    return reports.map((report) => {
      return {
        ...report,
        followUpHistory: followUpHistory.filter((followUp) => followUp.debtor_id === report.id),
        paymentHistory: paymentHistory.filter((payment) => payment.debtor_id === report.id),
      };
    });
  };

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

    groupedData.forEach((debtor, debtorIndex) => {
      const yOffset = 10 + debtorIndex * 150;

      // Add Basic Information
      doc.setFontSize(16);
      doc.text(`Basic Information - ${debtor.debtor_name}`, 10, yOffset);
      doc.setFontSize(12);
      doc.text(`Name: ${debtor.debtor_name}`, 10, yOffset + 10);
      doc.text(`Client: ${debtor.client}`, 10, yOffset + 15);
      doc.text(`Phone: ${debtor.debtor_phone}`, 10, yOffset + 20);
      doc.text(`Email: ${debtor.debtor_email}`, 10, yOffset + 25);
      doc.text(`Debt Amount: KES ${debtor.debt_amount.toLocaleString()}`, 10, yOffset + 30);

      // Add Follow-Up History
      doc.setFontSize(16);
      doc.text("Follow-Up History", 10, yOffset + 40);
      doc.setFontSize(12);
      debtor.followUpHistory.forEach((followUp, followUpIndex) => {
        const followUpYOffset = yOffset + 50 + followUpIndex * 20;
        doc.text(`Status: ${followUp.status}`, 10, followUpYOffset);
        doc.text(`Follow-Up Date: ${new Date(followUp.follow_up_date).toLocaleDateString()}`, 10, followUpYOffset + 5);
        doc.text(`Notes: ${followUp.notes}`, 10, followUpYOffset + 10);
        doc.text(`Created At: ${new Date(followUp.created_at).toLocaleString()}`, 10, followUpYOffset + 15);
      });

      // Add Payment History
      doc.setFontSize(16);
      doc.text("Payment History", 10, yOffset + 100);
      doc.setFontSize(12);
      debtor.paymentHistory.forEach((payment, paymentIndex) => {
        const paymentYOffset = yOffset + 110 + paymentIndex * 20;
        doc.text(`Amount: KES ${payment.amount.toLocaleString()}`, 10, paymentYOffset);
        doc.text(`Proof of Payment: View`, 10, paymentYOffset + 5);
        doc.text(`Verified: ${payment.verified ? "Yes" : "No"}`, 10, paymentYOffset + 10);
        doc.text(`Uploaded At: ${new Date(payment.uploaded_at).toLocaleString()}`, 10, paymentYOffset + 15);
      });
    });

    doc.save("report.pdf");
  };

  // Download Report as Excel
  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    groupedData.forEach((debtor) => {
      // Basic Information Sheet
      const basicInfo = [
        {
          "Name": debtor.debtor_name,
          "Client": debtor.client,
          "Phone": debtor.debtor_phone,
          "Email": debtor.debtor_email,
          "Debt Amount": `KES ${debtor.debt_amount.toLocaleString()}`,
        },
      ];
      const basicInfoSheet = XLSX.utils.json_to_sheet(basicInfo);
      XLSX.utils.book_append_sheet(workbook, basicInfoSheet, `Basic Info - ${debtor.debtor_name}`);

      // Follow-Up History Sheet
      const followUpInfo = debtor.followUpHistory.map((followUp) => ({
        "Status": followUp.status,
        "Follow-Up Date": new Date(followUp.follow_up_date).toLocaleDateString(),
        "Notes": followUp.notes,
        "Created At": new Date(followUp.created_at).toLocaleString(),
      }));
      const followUpSheet = XLSX.utils.json_to_sheet(followUpInfo);
      XLSX.utils.book_append_sheet(workbook, followUpSheet, `Follow-Up History - ${debtor.debtor_name}`);

      // Payment History Sheet
      const paymentInfo = debtor.paymentHistory.map((payment) => ({
        "Amount": `KES ${payment.amount.toLocaleString()}`,
        "Proof of Payment": "View",
        "Verified": payment.verified ? "Yes" : "No",
        "Uploaded At": new Date(payment.uploaded_at).toLocaleString(),
      }));
      const paymentSheet = XLSX.utils.json_to_sheet(paymentInfo);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, `Payment History - ${debtor.debtor_name}`);
    });

    XLSX.writeFile(workbook, "report.xlsx");
  };

  // Download Report as CSV
  const downloadCSV = () => {
    const csvData = groupedData.flatMap((debtor) => [
      {
        "Type": "Basic Info",
        "Name": debtor.debtor_name,
        "Client": debtor.client,
        "Phone": debtor.debtor_phone,
        "Email": debtor.debtor_email,
        "Debt Amount": `KES ${debtor.debt_amount.toLocaleString()}`,
      },
      ...debtor.followUpHistory.map((followUp) => ({
        "Type": "Follow-Up History",
        "Name": debtor.debtor_name,
        "Status": followUp.status,
        "Follow-Up Date": new Date(followUp.follow_up_date).toLocaleDateString(),
        "Notes": followUp.notes,
        "Created At": new Date(followUp.created_at).toLocaleString(),
      })),
      ...debtor.paymentHistory.map((payment) => ({
        "Type": "Payment History",
        "Name": debtor.debtor_name,
        "Amount": `KES ${payment.amount.toLocaleString()}`,
        "Proof of Payment": "View",
        "Verified": payment.verified ? "Yes" : "No",
        "Uploaded At": new Date(payment.uploaded_at).toLocaleString(),
      })),
    ]);

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
            <div>
              {groupedData.map((debtor) => (
                <div key={debtor.id} className="mb-8">
                  <h4 className="text-lg font-semibold mb-2">{debtor.debtor_name}</h4>
                  <p><strong>Client:</strong> {debtor.client}</p>
                  <p><strong>Phone:</strong> {debtor.debtor_phone}</p>
                  <p><strong>Email:</strong> {debtor.debtor_email}</p>
                  <p><strong>Debt Amount:</strong> KES {debtor.debt_amount.toLocaleString()}</p>

                  <h5 className="text-md font-semibold mt-4 mb-2">Follow-Up History</h5>
                  {debtor.followUpHistory.map((followUp) => (
                    <div key={followUp.id} className="mb-4">
                      <p><strong>Status:</strong> {followUp.status}</p>
                      <p><strong>Follow-Up Date:</strong> {new Date(followUp.follow_up_date).toLocaleDateString()}</p>
                      <p><strong>Notes:</strong> {followUp.notes}</p>
                      <p><strong>Created At:</strong> {new Date(followUp.created_at).toLocaleString()}</p>
                    </div>
                  ))}

                  <h5 className="text-md font-semibold mt-4 mb-2">Payment History</h5>
                  {debtor.paymentHistory.map((payment, index) => (
                    <div key={payment.id} className="mb-4">
                      <p><strong>{index + 1}</strong></p>
                      <p><strong>Amount:</strong> KES {payment.amount.toLocaleString()}</p>
                      <p><strong>Proof of Payment:</strong> <a href={payment.pop_url} target="_blank" rel="noopener noreferrer">View</a></p>
                      <p><strong>Verified:</strong> {payment.verified ? "Yes" : "No"}</p>
                      <p><strong>Uploaded At:</strong> {new Date(payment.uploaded_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Preview Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Report Preview</h3>
              {groupedData.map((debtor) => (
                <div key={debtor.id} className="mb-8">
                  <h4 className="text-lg font-semibold mb-2">{debtor.debtor_name}</h4>
                  <p><strong>Client:</strong> {debtor.client}</p>
                  <p><strong>Phone:</strong> {debtor.debtor_phone}</p>
                  <p><strong>Email:</strong> {debtor.debtor_email}</p>
                  <p><strong>Debt Amount:</strong> KES {debtor.debt_amount.toLocaleString()}</p>

                  <h5 className="text-md font-semibold mt-4 mb-2">Follow-Up History</h5>
                  {debtor.followUpHistory.map((followUp) => (
                    <div key={followUp.id} className="mb-4">
                      <p><strong>Status:</strong> {followUp.status}</p>
                      <p><strong>Follow-Up Date:</strong> {new Date(followUp.follow_up_date).toLocaleDateString()}</p>
                      <p><strong>Notes:</strong> {followUp.notes}</p>
                      <p><strong>Created At:</strong> {new Date(followUp.created_at).toLocaleString()}</p>
                    </div>
                  ))}

                  <h5 className="text-md font-semibold mt-4 mb-2">Payment History</h5>
                  {debtor.paymentHistory.map((payment, index) => (
                    <div key={payment.id} className="mb-4">
                      <p><strong>{index + 1}</strong></p>
                      <p><strong>Amount:</strong> KES {payment.amount.toLocaleString()}</p>
                      <p><strong>Proof of Payment:</strong> <a href={payment.pop_url} target="_blank" rel="noopener noreferrer">View</a></p>
                      <p><strong>Verified:</strong> {payment.verified ? "Yes" : "No"}</p>
                      <p><strong>Uploaded At:</strong> {new Date(payment.uploaded_at).toLocaleString()}</p>
                    </div>
                  ))}
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
