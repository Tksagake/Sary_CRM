"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";

export default function UploadPoPPage() {
  const supabase = createClientComponentClient();
  const [userRole, setUserRole] = useState<"admin" | "agent" | null>(null);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [selectedDebtor, setSelectedDebtor] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [popFile, setPopFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchUserAndDebtors() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserRole(userData?.role);

      const { data: debtorsData } = await supabase
        .from("debtors")
        .select("id, debtor_name")
        .eq("assigned_to", user.id); // Only fetch debtors assigned to this agent

      setDebtors(debtorsData || []);
    }

    fetchUserAndDebtors();
  }, [supabase]);

  async function uploadPoP() {
    if (!selectedDebtor || !amount || !popFile) {
      setMessage("❌ Please fill in all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    const fileExt = popFile.name.split(".").pop();
    const filePath = `pops/${selectedDebtor}.${fileExt}`;

    // Upload file to Supabase storage
    const { error: uploadError } = await supabase.storage.from("payments").upload(filePath, popFile, {
      upsert: true,
    });

    if (uploadError) {
      setMessage(`❌ Error uploading PoP: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("payments").getPublicUrl(filePath);

    // Insert payment record into the database
    const { error: insertError } = await supabase.from("payments").insert([
      {
        debtor_id: selectedDebtor,
        amount: parseFloat(amount),
        pop_url: urlData.publicUrl,
        pop_file_type: fileExt,
        verified: false,
      },
    ]);

    if (insertError) {
      setMessage(`❌ Error saving payment record: ${insertError.message}`);
    } else {
      setMessage("✅ PoP uploaded successfully! Awaiting admin approval.");
      setAmount("");
      setSelectedDebtor("");
      setPopFile(null);
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen w-full">
      <Navbar />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Upload Proof of Payment</h2>

        {message && (
          <div className={`p-3 mb-4 rounded-md text-white ${message.includes("✅") ? "bg-green-600" : "bg-red-600"}`}>
            {message}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <label className="block text-gray-700 font-medium">Select Debtor:</label>
          <select
            className="border p-2 rounded-md w-full mb-4"
            value={selectedDebtor}
            onChange={(e) => setSelectedDebtor(e.target.value)}
          >
            <option value="">-- Select Debtor --</option>
            {debtors.map((debtor) => (
              <option key={debtor.id} value={debtor.id}>
                {debtor.debtor_name}
              </option>
            ))}
          </select>

          <label className="block text-gray-700 font-medium">Payment Amount (KES):</label>
          <input
            type="number"
            className="border p-2 rounded-md w-full mb-4"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <label className="block text-gray-700 font-medium">Upload PoP:</label>
          <input type="file" onChange={(e) => setPopFile(e.target.files?.[0] || null)} className="border p-2 w-full mb-4" />

          <button
            onClick={uploadPoP}
            className="bg-blue-600 text-white px-4 py-2 rounded-md w-full"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload PoP"}
          </button>
        </div>
      </main>
    </div>
  );
}
