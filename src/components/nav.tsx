"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LineIcon } from "@/components/icons";
import { signOut } from "@/lib/actions/staff";

const PRIMARY = [
  { href: "/", label: "Barracks", icon: "barracks" },
  { href: "/missions", label: "Missions", icon: "missions" },
  { href: "/work", label: "Work", icon: "work" },
  { href: "/character", label: "Character", icon: "character" },
] as const;

const MORE = [
  { href: "/squad", label: "Squad" },
  { href: "/goals", label: "Goals" },
  { href: "/library", label: "Library" },
  { href: "/journal", label: "Journal" },
  { href: "/calendar", label: "Calendar" },
  { href: "/check-in", label: "Check-in" },
  { href: "/muster", label: "Table Muster" },
  { href: "/notes", label: "Notes" },
  { href: "/schedule", label: "Schedule" },
  { href: "/dice", label: "Dice" },
  { href: "/about", label: "About" },
];

export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/sign-in") return null;

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-20 bg-iron/95 px-6 pt-10">
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            {MORE.map((item) => (
              <Link key={item.href} href={item.href} className="text-xl text-parchment" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            {signedIn ? (
              <form action={signOut}>
                <button className="secondary" type="submit">
                  Sign out
                </button>
              </form>
            ) : (
              <Link href="/sign-in" className="button" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            )}
            <button className="secondary" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-steel bg-iron">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {PRIMARY.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center px-1 py-2 text-center text-sm ${active ? "text-parchment" : "text-mute"}`}
              >
                <span className={active ? "text-bronze" : "text-steel"}>
                  <LineIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            );
          })}
          <button className="secondary flex-col border-0 bg-transparent py-2 text-sm text-mute" type="button" onClick={() => setOpen(true)}>
            <span className="text-steel">
              <LineIcon name="menu" />
            </span>
            Menu
          </button>
        </div>
      </nav>
    </>
  );
}
