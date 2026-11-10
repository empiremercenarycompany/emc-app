import { isDmOrAdmin, isLogApprover, isStaff, type AppRole } from "@/lib/types";

export const STAFF_PATHS = ["/muster", "/trainer", "/notes"] as const;
export const DM_PATHS = ["/dm"] as const;

export function isStaffPath(path: string): boolean {
  return STAFF_PATHS.some((route) => path === route || path.startsWith(`${route}/`));
}

export function isDmPath(path: string): boolean {
  return DM_PATHS.some((route) => path === route || path.startsWith(`${route}/`));
}

/** Players never open Table Muster, Trainer, or Notes. The table screen is the DM and admin. Trainer also allows an approver. */
export function roleMayOpen(role: AppRole | null, path: string): boolean {
  if (isDmPath(path)) return isDmOrAdmin(role);
  if (!isStaffPath(path)) return true;
  if (path === "/trainer" || path.startsWith("/trainer/")) return isLogApprover(role);
  return isStaff(role);
}
