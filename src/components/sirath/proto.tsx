"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import "./sirath.css";

export function SirathProto({
  as,
  path,
  people,
}: {
  as?: string | null;
  path: string;
  people: { id: string; label: string }[];
}) {
  const router = useRouter();
  const current = people.some((person) => person.id === as) ? (as as string) : people[0]?.id;
  function go(id: string) {
    const params = new URLSearchParams();
    params.set("as", id);
    router.push(`${path}?${params.toString()}`);
  }
  if (!current) return null;
  return (
    <div className="sirath-proto" role="region" aria-label="Prototype controls">
      <span className="tag">Prototype control</span>
      <label>
        Viewing as{" "}
        <select aria-label="Viewing as" value={current} onChange={(event) => go(event.target.value)}>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.label}
            </option>
          ))}
        </select>
      </label>
      <Link href={`/sirath?as=${current}`}>Book</Link>
      <Link href={`/?as=${current}`}>Barracks</Link>
      <Link href={`/dm/sirath?as=${current}`}>DM queue</Link>
    </div>
  );
}
