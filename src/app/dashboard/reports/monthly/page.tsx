"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Fetch user's role
      const { data, error } = await supabase
        .from("users")
        .select("role, id")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Error fetching user data:", error?.message || error);
        router.push("/login");
      } else {
        setUserRole(data.role);
        fetchReports(data.role, data.id);
      }
    }

    async function fetchReports(role: string, userId: string) {
      let query = supabase.from("reports").select("*");

      if (role === "client") {
        query = query.eq("client_id", userId); // Only show client's reports
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching reports:", error.message);
      } else {
        setReports(data);
      }
      setLoading(false);
    }

    fetchUserRole();
  }, [supabase, router]);

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      {reports.length === 0 ? (
        <p>No reports available.</p>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report.id} className="p-4 bg-white shadow-md rounded-md">
              <p><strong>Report Type:</strong> {report.report_type}</p>
              <p><strong>Generated At:</strong> {new Date(report.generated_at).toLocaleString()}</p>
              <a href={report.file_url} className="text-blue-600 hover:underline" target="_blank">
                Download Report
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
