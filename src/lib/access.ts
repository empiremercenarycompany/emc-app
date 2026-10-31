import { isLogApprover, isStaff, type AppRole } from "@/lib/types";

export const STAFF_PATHS = ["/muster", "/trainer", "/notes"] as const;

export function isStaffPath(path: string): boolean {
  return STAFF_PATHS.some((route) => path === route || path.startsWith(`${route}/`));
}

/** Players never open Table Muster, Trainer, or Notes. Trainer also allows an approver. */
export function roleMayOpen(role: AppRole | null, path: string): boolean {
  if (!isStaffPath(path)) return true;
  if (path === "/trainer" || path.startsWith("/trainer/")) return isLogApprover(role);
  return isStaff(role);
}
