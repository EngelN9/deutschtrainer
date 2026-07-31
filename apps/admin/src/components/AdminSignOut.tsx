"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAdminRepository } from "../lib/adminRepository";

export function AdminSignOut() {
  const router = useRouter();
  const repository = useMemo(() => createAdminRepository(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (!repository) return;
    setBusy(true);
    setError("");
    try {
      await repository.signOut();
      router.replace("/admin/login");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登出失敗。");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="button button-secondary"
        disabled={!repository || busy}
        onClick={() => void signOut()}
        type="button"
      >
        {busy ? <LoaderCircle className="spin" size={16} /> : <LogOut size={16} />}
        登出
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
