"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t, type Language } from "@/lib/i18nShared";

export default function LoginForm({
  lang,
  allowSignup,
}: {
  lang: Language;
  allowSignup: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "auth.login.title")}</CardTitle>
          <CardDescription>{t(lang, "auth.login.subtitle")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr("");
              const res = await signIn("credentials", {
                email,
                password,
                callbackUrl: "/admin",
                redirect: false,
              });
              if ((res as any)?.error) setErr(t(lang, "auth.login.error"));
              else window.location.href = "/admin";
            }}
            className="grid gap-4"
          >
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
                autoComplete="current-password"
                required
              />
            </div>

            {err ? <div className="text-sm font-medium text-red-600">{err}</div> : null}

            <Button type="submit">{t(lang, "auth.login.submit")}</Button>

            <div className="small muted flex items-center justify-between">
              {allowSignup ? (
                <Link href="/register" className="underline">
                  {t(lang, "auth.login.register")}
                </Link>
              ) : null}
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
