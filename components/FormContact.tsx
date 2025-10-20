"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FormContact({ 
  formType = "embedded" 
}: {
  formType?: "embedded" | "popup" | "standalone";
}) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData) as any;
      
      const { error: insertError } = await supabase
        .from("contact_requests")
        .insert({
          ...data,
          source_site: typeof window !== "undefined" ? window.location.hostname : "SOTSVC.com",
          form_type: formType
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        setError("Failed to submit form. Please try again.");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (err) {
      console.error("Submission error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="p-6 text-center">
        <p className="text-green-600 font-semibold text-lg">
          Thank you! We'll be in touch.
        </p>
        <p className="text-gray-600 mt-2 text-sm">
          Check your email for confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 w-full max-w-md mx-auto">
      <div>
        <input
          name="full_name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Full name"
          required
          disabled={loading}
        />
      </div>
      
      <div>
        <input
          name="email"
          type="email"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Email"
          required
          disabled={loading}
        />
      </div>
      
      <div>
        <input
          name="phone"
          type="tel"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Phone"
          disabled={loading}
        />
      </div>
      
      <div>
        <textarea
          name="message"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
          placeholder="Tell us more…"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? "Sending..." : "Send"}
      </button>
    </form>
  );
}

