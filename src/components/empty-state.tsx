import type { ReactNode } from "react";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <svg className="empty-mark" viewBox="0 0 64 48" aria-hidden="true">
        <path d="M8 40V14l24-8 24 8v26l-24 8-24-8z" />
        <path d="M32 6v34M8 14l24 8 24-8" />
      </svg>
      <p className="empty-title">{title}</p>
      {children ? <div>{children}</div> : null}
      {action}
    </div>
  );
}
