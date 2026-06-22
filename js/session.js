import { PORTAL_STORAGE_KEY } from "./config.js";
import { cleanName, readJson } from "./utils.js";

function normalizeEmployeeId(value) {
  return String(value || "").trim();
}

export function loadPortalIdentity() {
  const employee = readJson(PORTAL_STORAGE_KEY);
  if (!employee || typeof employee !== "object") return null;
  if (employee.isAdmin) return null;

  const playerKey = normalizeEmployeeId(employee.employeeId || employee.accountId || employee.userId || employee.id || "");
  const displayName = cleanName(employee.name || employee.displayName || employee.nickname || "");

  if (!playerKey || !displayName) return null;
  return { playerKey, displayName };
}
