"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";

export default function ImportDebtorsPage() {
  const supabase = createClientComponentClient();
  const [showModal, setShowModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  // Form fields for CSV upload
  const [client, setClient] = useState("");
  const [branchGroup, setBranchGroup] = useState("Head Office");
  const [dealStage, setDealStage] = useState("Pending");
  const [product, setProduct] = useState("");
  const [leadInterest, setLeadInterest] = useState("");

  // Manual Debtor Creation Form State
  const [debtorName, setDebtorName] = useState("");
  const [debtorPhone, setDebtorPhone] = useState("");
  const [debtorEmail, setDebtorEmail] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [idNumber, setIdNumber] = useState("");

  // Handles CSV file selection
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
    }
  };

  // Processes the CSV file
  const processCsv = async () => {
    if (!csvFile) {
      showMessage("Please upload a CSV file.", "error");
      return;
    }
    if (!client || !product) {
      showMessage("Client and Product fields are required.", "error");
      return;
    }

    setLoading(true);
    setMessage("");

    const reader = new FileReader();
    reader.readAsText(csvFile);
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (!text) return;

      const rows = text.split("\n").slice(1); // Skip header row
      const debtors = rows
        .map((row) => {
          const cols = row.split(",");
          if (cols.length < 3) return null; // Skip invalid rows
          return {
            debtor_name: cols[0].trim(),
            debtor_phone: cols[1].trim(),
            debt_amount: parseFloat(cols[2].trim()) || 0,
            id_number: cols[3]?.trim() || null, // Optional ID number
            client,
            branch_group: branchGroup,
            deal_stage: dealStage,
            product,
            lead_interest: leadInterest || null,
            next_followup_date: new Date().toISOString().split("T")[0], // Today's date
          };
        })
        .filter(Boolean); // Remove null values

      if (debtors.length === 0) {
        showMessage("No valid debtors found in the CSV.", "error");
        setLoading(false);
        return;
      }

      // Insert into Supabase
      const { error } = await supabase.from("debtors").insert(debtors);

      if (error) {
        showMessage(`Error inserting debtors: ${error.message}`, "error");
      } else {
        showMessage("Debtors imported successfully!", "success");
        setShowModal(false);
      }

      setLoading(false);
    };
  };

  // Create New Debtor Function
  const createDebtor = async () => {
    if (!debtorName || !debtorPhone || !debtAmount || !client || !product) {
      showMessage("All required fields must be filled.", "error");
      return;
    }

    const { error } = await supabase.from("debtors").insert([
      {
        debtor_name: debtorName,
        debtor_phone: debtorPhone,
        debtor_email: debtorEmail || null,
        debt_amount: parseFloat(debtAmount),
        id_number: idNumber || null,
        client,
        branch_group: branchGroup,
        deal_stage: dealStage,
        product,
        lead_interest: leadInterest || null,
        next_followup_date: new Date().toISOString().split("T")[0], // Today's date
      },
    ]);

    if (error) {
      showMessage(`Error creating debtor: ${error.message}`, "error");
    } else {
      showMessage("Debtor created successfully!", "success");
      // Reset form fields
      setDebtorName("");
      setDebtorPhone("");
      setDebtorEmail("");
      setDebtAmount("");
      setIdNumber("");
    }
  };

  // Success/Error Messages
  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 5000);
  };

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">New Debtors</h2>

        {/* Success/Error Messages */}
        {message && (
          <div
            className={`p-3 mb-4 rounded-md text-white ${
              messageType === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {message}
          </div>
        )}

        {/* Create New Debtor Form */}
        <section className="mb-8 bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Debtor</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Debtor Name"
              value={debtorName}
              onChange={(e) => setDebtorName(e.target.value)}
              className="p-2 border rounded-md w-full"
              required
            />
            <input
              type="text"
              placeholder="Debtor Phone"
              value={debtorPhone}
              onChange={(e) => setDebtorPhone(e.target.value)}
              className="p-2 border rounded-md w-full"
              required
            />
            <input
              type="email"
              placeholder="Debtor Email (Optional)"
              value={debtorEmail}
              onChange={(e) => setDebtorEmail(e.target.value)}
              className="p-2 border rounded-md w-full"
            />
            <input
              type="number"
              placeholder="Debt Amount"
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              className="p-2 border rounded-md w-full"
              required
            />
            <input
              type="text"
              placeholder="ID Number (Optional)"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="p-2 border rounded-md w-full"
            />
            <input
              type="text"
              placeholder="Client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="p-2 border rounded-md w-full"
              required
            />
            <input
              type="text"
              placeholder="Product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="p-2 border rounded-md w-full"
              required
            />
            <input
              type="text"
              placeholder="Lead Interest (Optional)"
              value={leadInterest}
              onChange={(e) => setLeadInterest(e.target.value)}
              className="p-2 border rounded-md w-full"
            />
          </div>
          <button
            onClick={createDebtor}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Create Debtor
          </button>
        </section>

        {/* Import CSV Button */}
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Import CSV
        </button>

        {/* CSV Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="text-xl font-bold mb-4">Upload CSV</h3>

              {/* Instructions */}
              <div className="mb-4 text-sm text-gray-600">
                <p>1. Ensure your CSV file has the following columns:</p>
                <ul className="list-disc pl-5">
                  <li>Debtor Name</li>
                  <li>Debtor Phone</li>
                  <li>Debt Amount</li>
                  <li>ID Number (Optional)</li>
                </ul>
                <p>2. Fill out the form below to apply to all rows in the CSV.</p>
              </div>

              {/* CSV Upload Input */}
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="border p-2 rounded-md w-full mb-4"
              />

              {/* Form for Global Fields */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="p-2 border rounded-md w-full"
                  required
                />
                <input
                  type="text"
                  placeholder="Branch Group"
                  value={branchGroup}
                  onChange={(e) => setBranchGroup(e.target.value)}
                  className="p-2 border rounded-md w-full"
                />
                <input
                  type="text"
                  placeholder="Deal Stage"
                  value={dealStage}
                  onChange={(e) => setDealStage(e.target.value)}
                  className="p-2 border rounded-md w-full"
                />
                <input
                  type="text"
                  placeholder="Product"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="p-2 border rounded-md w-full"
                  required
                />
                <input
                  type="text"
                  placeholder="Lead Interest (Optional)"
                  value={leadInterest}
                  onChange={(e) => setLeadInterest(e.target.value)}
                  className="p-2 border rounded-md w-full"
                />
              </div>

              {/* Upload Button */}
              <button
                onClick={processCsv}
                disabled={loading}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md w-full"
              >
                {loading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}