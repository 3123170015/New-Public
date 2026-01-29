"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { t, type Language } from "@/lib/i18nShared";

export default function UserMenu({
  name,
  userId,
  lang,
}: {
  name: string;
  userId?: string;
  lang: Language;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn" onClick={() => setOpen((v) => !v)}>
        {name}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
          {userId ? (
            <Link
              className="btn btn-ghost w-full justify-start"
              href={`/u/${userId}`}
              onClick={() => setOpen(false)}
            >
              {t(lang, "menu.profile")}
            </Link>
          ) : null}

          <Link
            className="btn btn-ghost w-full justify-start"
            href="/my-channel"
            onClick={() => setOpen(false)}
          >
            {t(lang, "menu.myChannel")}
          </Link>

          <Link
            className="btn btn-ghost w-full justify-start"
            href="/notifications"
            onClick={() => setOpen(false)}
          >
            {t(lang, "menu.notifications")}
          </Link>

          <Link
            className="btn btn-ghost w-full justify-start"
            href="/settings/notifications"
            onClick={() => setOpen(false)}
          >
            {t(lang, "menu.notificationSettings")}
          </Link>

          <button
            type="button"
            className="btn btn-ghost w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            {t(lang, "menu.logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
