"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card className="text-center">
      <CardContent className="pt-6">
        {status === "loading" && (
          <div>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Verifying your email...</p>
          </div>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-chart-4/15">
              <svg className="h-6 w-6 text-chart-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground">Email Verified</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your account is active. You can now log in.</p>
            <Link href="/login?verified=1">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground">Verification Failed</h1>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Link href="/signup">
              <Button variant="outline" className="mt-4">Try signing up again</Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<p className="text-center text-muted-foreground">Loading...</p>}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
