"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabase = createClientComponentClient();

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError(authError?.message || "Login failed.");
      return;
    }

    const { data: userRecord, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (roleError || !userRecord) {
      setError("Failed to fetch user role.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-lg bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-lg border border-blue-100 flex flex-col items-center">
      {/* Logo */}
      <img
        src="https://www.sni.co.ke/wp-content/uploads/2022/06/Logo.jpg"
        alt="Sary CRM Logo"
        className="w-38 h-auto mb-4"
      />

      {/* Header */}
      <h2 className="text-3xl font-semibold text-center text-gray-800 mb-6">
        Sign in to <span className="text-blue-600">Sary CRM</span>
      </h2>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm text-center bg-red-100 p-3 rounded-md mb-4">
          {error}
        </p>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="w-full space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 bg-white rounded-lg text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 bg-white rounded-lg text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-all duration-300 hover:shadow-md transform hover:-translate-y-0.5"
        >
          Sign In
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Forgot your password? Contact your System Administrator for assistance.       
      </p>
    </div>
  );
}
