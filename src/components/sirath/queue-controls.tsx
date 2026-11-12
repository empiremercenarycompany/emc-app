"use client";

import { useState } from "react";

export function QueueControls({ showPublic, defaultPublic }: { showPublic?: boolean; defaultPublic?: boolean }) {
  const [status, setStatus] = useState("Pending review");
  const [pub, setPub] = useState(Boolean(defaultPublic));
  return (
    <>
      <p className="status">{status}</p>
      {showPublic ? (
        <label className="sirath-public">
          <input type="checkbox" checked={pub} onChange={(event) => setPub(event.target.checked)} /> Name is common knowledge (show as plain text)
        </label>
      ) : null}
      <div className="sirath-actions">
        <button type="button" className="button secondary" onClick={() => setStatus("Approved")}>
          Approve
        </button>
        <button type="button" className="button secondary" onClick={() => setStatus("Editing")}>
          Edit
        </button>
        <button type="button" className="button secondary" onClick={() => setStatus("Held")}>
          Hold
        </button>
      </div>
    </>
  );
}
