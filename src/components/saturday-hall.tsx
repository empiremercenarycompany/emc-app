"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SATURDAY_TABLE_COPY } from "@/content/saturday-tables";
import {
  TABLE_SLOTS,
  TABLE_STARTS,
  askStaffMailto,
  askedForLine,
  nextPairTable,
  nextTogetherLine,
  seatLine,
  tableRequest,
  type SaturdayTable,
} from "@/lib/rules/saturday-tables";

function chairs(table: SaturdayTable, markPair: boolean) {
  const filled = Math.min(6, 6 - table.seatsLeft);
  let pairLeft = markPair ? 2 : 0;
  return Array.from({ length: 6 }, (_item, index) => {
    const open = index >= filled;
    const yours = open && pairLeft > 0;
    if (yours) pairLeft -= 1;
    const state = yours ? "is-yours" : open ? "is-open" : "is-filled";
    return <span key={index} className={`seat ${state}`} />;
  });
}

export function SaturdayHall({
  tables,
  mode,
  showIntro = true,
  withFriend = false,
  selectedKey = "",
  yourKey = "",
  onSelect,
}: {
  tables: SaturdayTable[];
  mode: "pick" | "view";
  showIntro?: boolean;
  withFriend?: boolean;
  selectedKey?: string;
  yourKey?: string;
  onSelect?: (key: string) => void;
}) {
  const labelId = "saturday-hall-title";
  const groupRef = useRef<HTMLDivElement>(null);
  const [confirmedWaitlist, setConfirmedWaitlist] = useState(false);
  const selected = tables.find((table) => table.key === selectedKey) ?? null;
  const request = selected ? tableRequest(selected.seatsLeft, withFriend) : null;
  const next = selected && withFriend && request === "waitlist" ? nextPairTable(tables, selected.key) : null;

  useEffect(() => {
    setConfirmedWaitlist(false);
  }, [selectedKey, withFriend]);

  function move(nextIndex: number) {
    const table = tables[nextIndex];
    if (!table) return;
    onSelect?.(table.key);
    const node = groupRef.current?.querySelector<HTMLElement>(`[data-key="${table.key}"]`);
    node?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (mode !== "pick") return;
    const current = Math.max(0, tables.findIndex((table) => table.key === selectedKey));
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move((current + 1) % tables.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move((current - 1 + tables.length) % tables.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(tables.length - 1);
    }
  }

  const marked = yourKey || selectedKey;

  return (
    <div className="saturday-hall">
      {showIntro ? (
        <>
          <h2 id={labelId}>{SATURDAY_TABLE_COPY.heading}</h2>
          <p>{SATURDAY_TABLE_COPY.subhead}</p>
        </>
      ) : null}
      <div
        ref={groupRef}
        className="saturday-hall-grid"
        role={mode === "pick" ? "radiogroup" : "list"}
        aria-labelledby={showIntro ? labelId : undefined}
        aria-label={showIntro ? undefined : SATURDAY_TABLE_COPY.heading}
        onKeyDown={onKeyDown}
      >
        <span className="hall-corner" aria-hidden="true" />
        {TABLE_SLOTS.map((slot) => (
          <span key={slot} className={`hall-col hall-col-${slot}`} aria-hidden="true">
            {SATURDAY_TABLE_COPY.timeHead[slot]}
          </span>
        ))}
        {TABLE_STARTS.map((start) => (
          <span key={start} className={`hall-row hall-row-${start}`} aria-hidden="true">
            {SATURDAY_TABLE_COPY.dateHead[start]}
          </span>
        ))}
        {tables.map((table, index) => {
          const chosen = table.key === marked;
          const text = (
            <>
              <span className="saturday-label">{table.label}</span>
              <span className="saturday-date">First game {SATURDAY_TABLE_COPY.dateHead[table.startsOn]}</span>
              {table.squadLine ? <span className="saturday-squad">{table.squadLine}</span> : null}
              <span className="saturday-seats">{seatLine(table.seatsLeft)}</span>
              <span className="seat-row" aria-hidden="true">
                {chairs(table, withFriend && chosen && tableRequest(table.seatsLeft, true) === "seat")}
              </span>
              {chosen ? <span className="saturday-yours">{SATURDAY_TABLE_COPY.yourTable}</span> : null}
            </>
          );
          if (mode === "view") {
            const href = `/intake?table=${table.timeslotId}&start=${table.startsOn}`;
            return (
              <a
                key={table.key}
                href={href}
                data-key={table.key}
                data-slot={table.timeslotId}
                data-start={table.startsOn}
                className="saturday-table"
                aria-current={table.key === yourKey ? "true" : undefined}
              >
                {text}
              </a>
            );
          }
          const tabIndex = (selectedKey ? table.key === selectedKey : index === 0) ? 0 : -1;
          return (
            <button
              key={table.key}
              type="button"
              data-key={table.key}
              data-slot={table.timeslotId}
              data-start={table.startsOn}
              className="saturday-table"
              role="radio"
              aria-checked={table.key === selectedKey}
              tabIndex={tabIndex}
              onClick={() => onSelect?.(table.key)}
            >
              {text}
            </button>
          );
        })}
      </div>
      {mode === "pick" ? (
        <div className="saturday-follow">
          <p>{SATURDAY_TABLE_COPY.staffConfirm}</p>
          {selected && request === "seat" && withFriend ? <p>{SATURDAY_TABLE_COPY.sitTogether}</p> : null}
          {selected && request === "waitlist" && next ? (
            <div className="saturday-panel" role="region" aria-label={SATURDAY_TABLE_COPY.full}>
              <p>{nextTogetherLine(next.label)}</p>
              <button type="button" className="secondary" onClick={() => onSelect?.(next.key)}>
                {next.label}
              </button>
              <button type="button" className="secondary" aria-pressed={confirmedWaitlist} onClick={() => setConfirmedWaitlist(true)}>
                {SATURDAY_TABLE_COPY.joinWaitlist}
              </button>
              <button type="button" className="secondary" onClick={() => onSelect?.("")}>
                {SATURDAY_TABLE_COPY.pickDifferent}
              </button>
            </div>
          ) : null}
          {selected && request === "waitlist" && !next ? (
            <div className="saturday-panel" role="region" aria-label={SATURDAY_TABLE_COPY.full}>
              <p>{SATURDAY_TABLE_COPY.waitlistBody}</p>
              <button type="button" className="secondary" aria-pressed={confirmedWaitlist} onClick={() => setConfirmedWaitlist(true)}>
                {SATURDAY_TABLE_COPY.joinWaitlist}
              </button>
              <button type="button" className="secondary" onClick={() => onSelect?.("")}>
                {SATURDAY_TABLE_COPY.pickDifferent}
              </button>
            </div>
          ) : null}
          {selected && request === "ask_staff" ? (
            <div className="saturday-panel" role="region" aria-label={SATURDAY_TABLE_COPY.askStaff}>
              <p>{SATURDAY_TABLE_COPY.askStaffBody}</p>
              <a className="button secondary" href={askStaffMailto(selected.label)}>
                {SATURDAY_TABLE_COPY.askStaff}
              </a>
              <button type="button" className="secondary" onClick={() => onSelect?.("")}>
                {SATURDAY_TABLE_COPY.pickTwoSeats}
              </button>
            </div>
          ) : null}
          {selected ? <p aria-live="polite">{askedForLine(selected.label)}</p> : <p className="text-mute">{SATURDAY_TABLE_COPY.notSure}</p>}
        </div>
      ) : null}
    </div>
  );
}
