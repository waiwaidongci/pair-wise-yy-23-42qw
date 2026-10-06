import type { LedgerEntry } from "../types/LedgerEntry";

export const createDefaultLedgerEntry = (overrides: Partial<LedgerEntry> = {}): LedgerEntry => ({
  op_id: 0,
  session_id: 0,
  symbol_id: 0,
  user_answer: "",
  status: "pending",
  client_id: "",
  lease_id: null,
  created_at: new Date(0).toISOString(),
  settled_at: null,
  revoked_at: null,
  revoke_reason: null,
  ...overrides
});

export const createLedgerEntryForm = createDefaultLedgerEntry;
export const createLedgerEntryResponse = createDefaultLedgerEntry;
