"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LineIcon } from "@/components/icons";
import { signOut } from "@/lib/actions/staff";
import { isLogApprover, isStaff, type AppRole } from "@/lib/types";

const PRIMARY = [
  { href: "/", label: "Barracks", icon: "barracks" },
  { href: "/missions", label: "Missions", icon: "missions" },
  { href: "/work", label: "Work", icon: "work" },
  { href: "/character", label: "Character", icon: "character" },
] as const;

type Item = { href: string; label: string };

function menuGroups(role: AppRole | null): { title: string; items: Item[] }[] {
  const staff: Item[] = [];
  if (isStaff(role)) staff.push({ href: "/muster", label: "Table Muster" });
  if (isLogApprover(role)) staff.push({ href: "/trainer", label: "Trainer" });
  if (isStaff(role)) staff.push({ href: "/notes", label: "Notes" });
  const groups = [
    {
      title: "Play",
      items: [
        { href: "/missions", label: "Missions" },
        { href: "/schedule", label: "Schedule" },
        { href: "/dice", label: "Dice" },
      ],
    },
    {
      title: "Train",
      items: [
        { href: "/work", label: "Work" },
        { href: "/journal", label: "Journal" },
        { href: "/goals", label: "Goals" },
        { href: "/check-in", label: "Check-in" },
      ],
    },
    {
      title: "Company",
      items: [
        { href: "/squad", label: "Squad" },
        { href: "/library", label: "Library" },
        { href: "/about", label: "About" },
      ],
    },
    {
      title: "Me",
      items: [{ href: "/profile", label: "Profile" }],
    },
  ];
  if (staff.length > 0) groups.push({ title: "Staff", items: staff });
  return groups;
}

export function SiteNav({ signedIn, role }: { signedIn: boolean; role: AppRole | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("menu") !== "1") return;
    setOpen(true);
    params.delete("menu");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [pathname]);

  if (pathname === "/sign-in") return null;

  return (
    <>
      {open ? (
        <div id="company-menu" className="menu-overlay" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
            {menuGroups(role).map((group) => (
              <section key={group.title}>
                <h2>{group.title}</h2>
                <div className="mt-2 flex flex-col">
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>
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
      <nav className="tab-bar fixed inset-x-0 bottom-0 z-10 border-t border-steel bg-iron">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {PRIMARY.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 flex-col items-center justify-center px-1 py-2 text-center text-sm ${active ? "text-parchment" : "text-mute"}`}
              >
                <TabBody icon={item.icon} label={item.label} active={active} />
              </Link>
            );
          })}
          <button
            className="menu-tab"
            type="button"
            aria-expanded={open}
            aria-controls="company-menu"
            onClick={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
          >
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

function TabBody({ icon, label, active }: { icon: "barracks" | "missions" | "work" | "character"; label: string; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span className={active ? "text-bronze" : "text-steel"}>
        {pending ? <span className="spinner" aria-hidden="true" /> : <LineIcon name={icon} />}
      </span>
      {label}
      {pending ? <span className="sr-only">Opening the gates...</span> : null}
    </>
  );
}
