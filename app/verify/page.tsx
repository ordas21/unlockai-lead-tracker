"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No verification token provided");
      return;
    }

    fetch(`/api/auth/verify?token=${token}`, { redirect: "manual" })
      .then((res) => {
        if (res.status === 307 || res.status === 308 || res.ok) {
          setStatus("success");
        } else {
          return res.json().then((data) => {
            setStatus("error");
            setError(data.error || "Verification failed");
          });
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong");
      });
  }, [token]);

  return (
    <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm text-center">
      {status === "loading" && (
        <p className="text-gray-500">Verifying your email...</p>
      )}
      {status === "success" && (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Email Verified!</h1>
          <p className="mt-2 text-sm text-gray-500">Your account is active. You can now log in.</p>
          <Link
            href="/login?verified=1"
            className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Go to Login
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Verification Failed</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Link
            href="/signup"
            className="mt-4 inline-block text-sm font-medium text-gray-900 underline hover:text-gray-700"
          >
            Try signing up again
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
