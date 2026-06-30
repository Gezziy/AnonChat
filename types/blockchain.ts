// Type definitions for blockchain operations

export interface GroupMetadata {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_private: boolean;
  owner_wallet?: string | null;
}

export interface StellarTransactionResult {
  success: boolean;
  transactionHash?: string;
  feeCharged?: string;
  /** The group memo embedded in the Stellar transaction. */
  memoGroupId?: string;
  /** The audit memo embedded in the Stellar transaction. */
  auditMemo?: string;
  error?: string;
}

export type AuditEventType =
  | "group_created"
  | "member_joined"
  | "member_left"
  | "member_removed";

export interface StellarTransaction {
  hash: string;
  memo: string;
  memoType?: string;
  ledger: number;
  created_at: string;
}

export interface VerificationResponse {
  groupId: string;
  currentMetadataHash: string;
  blockchainMetadataHash: string | null;
  transactionHash: string | null;
  verified: boolean;
  explorerUrl: string | null;
  /** The memo embedded in the transaction (should equal the derived group memo). */
  memoGroupId?: string | null;
  /** Whether the on-chain memo matches the expected group memo. */
  memoVerified?: boolean;
  /** Whether the creator wallet is bound to the anchored metadata hash. */
  walletOwnershipVerified?: boolean;
  /** Owner wallet address at verification time. */
  ownerWallet?: string | null;
  /** Human-readable error when verification failed. */
  error?: string | null;
}

export interface GroupVerificationRecord {
  id?: string;
  group_id: string;
  wallet_address: string;
  tx_hash: string | null;
  verified: boolean;
  memo_verified: boolean;
  wallet_ownership_verified: boolean;
  metadata_hash: string | null;
  verification_error: string | null;
  verified_at: string | null;
  last_checked_at: string;
  created_at?: string;
}

export interface GroupCreationResponse {
  room: {
    id: string;
    name: string;
    description: string | null;
    is_private: boolean;
    created_by: string;
    created_at: string;
    owner_wallet?: string | null;
    stellar_tx_hash: string | null;
    metadata_hash?: string | null;
    blockchain_submitted_at?: string | null;
    /** Compact group identifier embedded in the Stellar memo. */
    memo_group_id?: string | null;
  };
  success: boolean;
  blockchain: {
    submitted: boolean;
    transactionHash?: string;
    feeCharged?: string;
    explorerUrl?: string;
    /** The memo value that was embedded in the on-chain transaction. */
    memoGroupId?: string;
  };
}
