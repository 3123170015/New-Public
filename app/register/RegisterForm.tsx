"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t, type Language } from "@/lib/i18nShared";

export default function RegisterForm({ lang }: { lang: Language }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "auth.register.title")}</CardTitle>
          <CardDescription>{t(lang, "auth.register.subtitle")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr("");
              setDone("");
              if (!email || !password || !confirm) {
                setErr(t(lang, "auth.register.errorMissing"));
                return;
              }
              if (password !== confirm) {
                setErr(t(lang, "auth.register.errorMismatch"));
                return;
              }
              setLoading(true);
              try {
                const res = await fetch("/api/auth/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, name, password }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  if (res.status === 403) {
                    setErr(t(lang, "auth.register.errorDisabled"));
                  } else {
                    setErr(data?.error || t(lang, "auth.register.errorGeneric"));
                  }
                } else {
                  setDone(t(lang, "auth.register.success"));
                }
              } catch {
                setErr(t(lang, "auth.register.errorNetwork"));
              } finally {
                setLoading(false);
              }
            }}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="name">{t(lang, "auth.name")}</Label>
              <Input
                id="name"
                placeholder="Collector Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t(lang, "auth.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">{t(lang, "auth.passwordConfirm")}</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            {err ? <div className="text-sm font-medium text-red-600">{err}</div> : null}
            {done ? <div className="text-sm font-medium text-emerald-600">{done}</div> : null}

            <Button type="submit" disabled={loading}>
              {loading ? t(lang, "auth.register.loading") : t(lang, "auth.register.submit")}
            </Button>

            <div className="small muted flex items-center justify-between">
              <Link href="/login" className="underline">
                {t(lang, "auth.register.login")}
              </Link>
              <Link href="/" className="underline">
                ← {t(lang, "auth.backHome")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
