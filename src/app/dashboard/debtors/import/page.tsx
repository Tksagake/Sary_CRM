"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";

export default function NewDebtorsPage() {
  const supabase = createClientComponentClient();
  const [isUploading, setIsUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    debtor_name: "",
    client: "",
    debtor_email: "",
    debtor_phone: "",
    id_number: "",
    branch_group: "Head Office",
    deal_stage: "Pending",
    debt_amount: "",
    next_followup_date: new Date().toISOString().split("T")[0],
    product: "",
    lead_interest: "",
  });

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // CREATE SINGLE DEBTOR
  const createDebtor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Ensure required fields are not empty
    if (!formData.debtor_name || !formData.client || !formData.debtor_phone || !formData.debt_amount) {
      setError("Please fill in all required fields.");
      return;
    }

    const { error } = await supabase.from("debtors").insert([
      {
        debtor_name: formData.debtor_name,
        client: formData.client,
        debtor_email: formData.debtor_email || null,
        debtor_phone: formData.debtor_phone,
        id_number: formData.id_number || null,
        branch_group: formData.branch_group,
        deal_stage: formData.deal_stage,
        debt_amount: Number(formData.debt_amount) || 0,
        next_followup_date: formData.next_followup_date,
        product: formData.product || null,
        lead_interest: formData.lead_interest || null,
        created_by: null, // Admin creates, but not assigned yet
      },
    ]);

    if (error) {
      setError(`Error creating debtor: ${error.message}`);
    } else {
      setSuccess("Debtor successfully added!");
      setFormData({
        debtor_name: "",
        client: "",
        debtor_email: "",
        debtor_phone: "",
        id_number: "",
        branch_group: "Head Office",
        deal_stage: "Pending",
        debt_amount: "",
        next_followup_date: new Date().toISOString().split("T")[0],
        product: "",
        lead_interest: "",
      });
    }
  };

  // HANDLE CSV UPLOAD
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
  };

  const processCsv = async () => {
    if (!csvFile) {
      setError("Please upload a CSV file.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split("\n").slice(1);
      const debtors = rows.map((row) => {
        const [debtor_name, client, debtor_phone, debt_amount] = row.split(",");
        return {
          debtor_name,
          client,
          debtor_phone,
          debt_amount: Number(debt_amount) || 0,
          branch_group: "Head Office",
          deal_stage: "Pending",
          next_followup_date: new Date().toISOString().split("T")[0],
          product: "Loan",
          lead_interest: "",
          created_by: null,
        };
      });

      const { error } = await supabase.from("debtors").insert(debtors);
      if (error) {
        setError(`Error importing CSV: ${error.message}`);
      } else {
        setSuccess("CSV successfully imported!");
      }
      setIsUploading(false);
    };
    reader.readAsText(csvFile);
  };

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">New Debtors</h2>

        {/* SUCCESS & ERROR MESSAGES */}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">{success}</p>}

        <div className="grid grid-cols-2 gap-6">
          {/* CREATE NEW LEAD FORM */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Create New Debtor</h3>
            <form onSubmit={createDebtor} className="space-y-4">
              <input type="text" name="debtor_name" placeholder="Debtor Name *" value={formData.debtor_name} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
              <input type="text" name="client" placeholder="Client (Company) *" value={formData.client} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
              <input type="email" name="debtor_email" placeholder="Debtor Email" value={formData.debtor_email} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input type="text" name="debtor_phone" placeholder="Phone *" value={formData.debtor_phone} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
              <input type="text" name="id_number" placeholder="ID Number" value={formData.id_number} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input type="number" name="debt_amount" placeholder="Debt Amount *" value={formData.debt_amount} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
              <label className="block">Next Follow-Up Date:</label>
              <input type="date" name="next_followup_date" value={formData.next_followup_date} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input type="text" name="product" placeholder="Product" value={formData.product} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input type="text" name="lead_interest" placeholder="Lead Interest" value={formData.lead_interest} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full">Create Debtor</button>
            </form>
          </div>

          {/* CSV IMPORT SECTION */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Import from CSV</h3>
            <input type="file" accept=".csv" onChange={handleCsvUpload} className="w-full p-2 border rounded-md" />
            <button onClick={processCsv} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 w-full mt-4" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Import CSV"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
