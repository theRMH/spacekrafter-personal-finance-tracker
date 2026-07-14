"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid md:grid-cols-[1.2fr_0.8fr] bg-[#f6f4f2]">
      <div className="hidden md:flex flex-col justify-between p-14 text-white bg-gradient-to-br from-sidebar to-navy relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-info/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-success/10 blur-3xl" />
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info to-success grid place-items-center font-bold">
            SP
          </div>
          <div>
            <strong className="block">Spacekrafter</strong>
            <span className="text-xs text-white/60">Personal Finance Tracker</span>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight max-w-lg">
            See where every rupee comes from and where it goes.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Track personal and office money across accounts, statements, commitments and
            renewals without turning it into complicated accounting software.
          </p>
        </div>
        <small className="text-white/50 relative">Draft build against approved PRD/IA v1.1</small>
      </div>

      <div className="grid place-items-center p-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-card shadow-lg p-7 border border-[#e3ddd7]"
        >
          <h2 className="text-xl font-bold text-navy mb-1">Welcome back</h2>
          <p className="text-xs text-muted mb-6">Sign in to continue</p>

          <label className="block text-xs text-muted mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#e3ddd7] rounded-xl p-3 mb-4"
            placeholder="owner@example.com"
          />

          <label className="block text-xs text-muted mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#e3ddd7] rounded-xl p-3"
          />

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-navy text-white font-semibold rounded-xl py-3 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
