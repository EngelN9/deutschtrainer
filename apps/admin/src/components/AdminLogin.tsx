"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, LoaderCircle, LogIn } from "lucide-react";
import type { AdminRepository } from "../lib/adminRepository";

export function AdminLogin({ repository }: { repository: AdminRepository }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await repository.signIn(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登入失敗。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand" aria-label="DeutschTrainer Admin">
        <div className="brand-mark" aria-hidden="true">
          DT
        </div>
        <p className="auth-product">DeutschTrainer</p>
        <h1>內容管理後台</h1>
        <p className="auth-meta">B1-C2 · 繁體中文內容團隊</p>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-heading">
          <KeyRound size={22} aria-hidden="true" />
          <div>
            <h2>管理者登入</h2>
            <p>使用已授權的內容團隊帳號</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            電子郵件
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            密碼
            <input
              autoComplete="current-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button button-primary auth-submit" disabled={submitting} type="submit">
            {submitting ? (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            ) : (
              <LogIn size={17} aria-hidden="true" />
            )}
            登入
          </button>
        </form>
      </section>
    </main>
  );
}
