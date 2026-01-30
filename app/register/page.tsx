"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
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
          <CardTitle>Đăng ký</CardTitle>
          <CardDescription>Tạo tài khoản mới để theo dõi video & bộ sưu tập.</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr("");
              setDone("");
              if (!email || !password || !confirm) {
                setErr("Vui lòng điền đầy đủ thông tin.");
                return;
              }
              if (password !== confirm) {
                setErr("Mật khẩu xác nhận không khớp.");
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
                  setErr(data?.error || "Không thể tạo tài khoản.");
                  if (res.status === 403) {
                    setErr("Đăng ký tạm thời bị tắt. Vui lòng liên hệ quản trị.");
                  }
                } else {
                  setDone("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
                }
              } catch {
                setErr("Không thể kết nối tới máy chủ.");
              } finally {
                setLoading(false);
              }
            }}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="name">Tên hiển thị</Label>
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
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {err ? <div className="text-sm font-medium text-red-600">{err}</div> : null}
            {done ? <div className="text-sm font-medium text-emerald-600">{done}</div> : null}

            <Button type="submit" disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo tài khoản"}
            </Button>

            <div className="small muted flex items-center justify-between">
              <Link href="/login" className="underline">
                Đã có tài khoản? Đăng nhập
              </Link>
              <Link href="/" className="underline">
                ← Quay lại Home
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
