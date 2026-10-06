export type LedgerEntryStatus = "pending" | "settled" | "revoked";

export interface LedgerEntry {
  op_id: number;
  session_id: number;
  symbol_id: number;
  user_answer: string;
  status: LedgerEntryStatus;
  client_id: string;
  lease_id: string | null;
  created_at: string;
  settled_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
}
