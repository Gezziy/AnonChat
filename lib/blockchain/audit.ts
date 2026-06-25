import { createHash, randomUUID } from "crypto";
import type { AuditEventType } from "@/types/blockchain";
import { submitAuditEvent } from "@/lib/blockchain/stellar-service";
import { getExplorerUrl, loadStellarConfig } from "@/lib/blockchain/stellar-config";
import { logBlockchainOperation, generateCorrelationId } from "@/lib/blockchain/logger";
import { verifyStellarTransaction } from "@/lib/blockchain/transaction-verification";

type SupabaseErrorLike = { message: string };
type SupabaseMutationResult = PromiseLike<{ error: SupabaseErrorLike | null }>;
type SupabaseUpdateBuilder = {
  eq: (column: string, value: string) => SupabaseMutationResult;
};
type SupabaseTableLike = {
  insert: (values: Record<string, unknown>) => SupabaseMutationResult;
  update: (values: Record<string, unknown>) => SupabaseUpdateBuilder;
};
type SupabaseClientLike = {
  from: (table: string) => SupabaseTableLike;
};

type AuditStatus = "pending" | "submitted" | "failed";

export type RecordAuditEventInput = {
  supabase: SupabaseClientLike;
  groupId: string;
  eventType: AuditEventType;
  actorUserId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
  maxFee?: string | number;
};

export type RecordedAuditEvent = {
  eventId: string;
  eventType: AuditEventType;
  transactionHash: string | null;
  status: AuditStatus;
  explorerUrl: string | null;
  error: string | null;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function computeAuditMetadataHash(metadata: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(metadata)))
    .digest("hex");
}

function getAuditExplorerUrl(transactionHash: string | null): string | null {
  if (!transactionHash) return null;

  const config = loadStellarConfig();
  if (!config) return null;

  return getExplorerUrl(transactionHash, config.network);
}

export async function recordGroupAuditEvent({
  supabase,
  groupId,
  eventType,
  actorUserId,
  targetUserId,
  metadata = {},
  maxFee,
}: RecordAuditEventInput): Promise<RecordedAuditEvent | null> {
  const correlationId = generateCorrelationId();
  const eventId = randomUUID();
  const occurredAt = new Date().toISOString();
  const eventMetadata = {
    ...metadata,
    group_id: groupId,
    event_id: eventId,
    event_type: eventType,
    actor_user_id: actorUserId ?? null,
    target_user_id: targetUserId ?? null,
    occurred_at: occurredAt,
  };
  const metadataHash = computeAuditMetadataHash(eventMetadata);

  const result = await submitAuditEvent(groupId, eventId, eventType, metadataHash, maxFee);

  if (result.success && result.transactionHash) {
    const verification = await verifyStellarTransaction({
      supabase: supabase as any,
      transactionHash: result.transactionHash,
      groupActionEventId: eventId,
      groupId,
      expectedMemo: result.auditMemo ?? null,
    });

    if (!verification.verified) {
      logBlockchainOperation("warn", "Rejecting group audit event after failed transaction verification", {
        groupId,
        eventId,
        eventType,
        transactionHash: result.transactionHash,
        status: verification.status,
        error: verification.error ? { type: "VerificationError", message: verification.error } : undefined,
      }, correlationId);

      return {
        eventId,
        eventType,
        transactionHash: result.transactionHash,
        status: "failed",
        explorerUrl: getAuditExplorerUrl(result.transactionHash),
        error: verification.error ?? "Stellar transaction verification failed",
      };
    }

    const { error: insertError } = await supabase
      .from("group_audit_events")
      .insert({
        event_id: eventId,
        group_id: groupId,
        event_type: eventType,
        actor_user_id: actorUserId ?? null,
        target_user_id: targetUserId ?? null,
        status: "submitted",
        transaction_hash: result.transactionHash,
        stellar_memo: result.auditMemo ?? null,
        metadata: eventMetadata,
        metadata_hash: metadataHash,
        created_at: occurredAt,
        submitted_at: new Date().toISOString(),
        error_message: null,
      });

    if (insertError) {
      logBlockchainOperation("error", "Audit transaction verified but database insert failed", {
        groupId,
        eventId,
        eventType,
        transactionHash: result.transactionHash,
        error: {
          type: "DatabaseError",
          message: insertError.message,
        },
      }, correlationId);
      return null;
    }

    return {
      eventId,
      eventType,
      transactionHash: result.transactionHash,
      status: "submitted",
      explorerUrl: getAuditExplorerUrl(result.transactionHash),
      error: null,
    };
  }

  const errorMessage = result.error ?? "Audit transaction failed";
  await supabase.from("stellar_transaction_verifications").insert({
    transaction_hash: result.transactionHash ?? null,
    group_action_event_id: eventId,
    group_id: groupId,
    status: "failed",
    verified: false,
    ledger: null,
    memo: result.auditMemo ?? null,
    error_message: errorMessage,
    verified_at: new Date().toISOString(),
  });

  return {
    eventId,
    eventType,
    transactionHash: null,
    status: "failed",
    explorerUrl: null,
    error: errorMessage,
  };
}
