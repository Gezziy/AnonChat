/**
 * Reusable wallet authorization for sensitive API actions.
 *
 * Combines one-time nonce consumption with Ed25519 signature verification
 * to prove wallet ownership before destructive or privileged operations.
 *
 * Usage:
 *   const auth = await verifyWalletAuthorization({ walletAddress, signature }, "delete_group");
 *   if (!auth.ok) return auth.response;
 *   // auth.walletAddress and auth.nonce are available
 */

import { NextResponse } from "next/server";
import { consumeNonce, verifyWalletSignature } from "@/lib/auth/stellar-verify";
import { validateWalletAddressWithMessage } from "@/lib/auth/validation";

export type WalletAuthorizationResult =
  | { ok: true; walletAddress: string; nonce: string }
  | { ok: false; response: NextResponse };

export interface WalletAuthPayload {
  walletAddress?: string;
  signature?: string;
}

/**
 * Verifies wallet authorization via nonce + signature.
 * Returns standardized error responses for invalid or missing signatures.
 */
export async function verifyWalletAuthorization(
  payload: WalletAuthPayload,
  action?: string,
): Promise<WalletAuthorizationResult> {
  const { walletAddress, signature } = payload;
  const logPrefix = action ? `[${action}]` : "[wallet-auth]";

  const walletError = validateWalletAddressWithMessage(walletAddress as string);
  if (walletError) {
    console.warn(`${logPrefix} validation failed: ${walletError}`);
    return {
      ok: false,
      response: NextResponse.json({ error: walletError }, { status: 400 }),
    };
  }

  if (!signature || typeof signature !== "string" || signature.trim() === "") {
    console.warn(`${logPrefix} validation failed: signature is required`);
    return {
      ok: false,
      response: NextResponse.json({ error: "signature is required" }, { status: 400 }),
    };
  }

  const nonce = await consumeNonce(walletAddress as string);
  if (!nonce) {
    console.warn(
      `${logPrefix} nonce missing or expired for wallet: ${(walletAddress as string).substring(0, 8)}...`,
    );
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Nonce not found or expired. Request a new nonce first." },
        { status: 401 },
      ),
    };
  }

  const isValid = verifyWalletSignature(
    walletAddress as string,
    nonce,
    signature,
  );
  if (!isValid) {
    console.warn(
      `${logPrefix} signature verification failed for wallet: ${(walletAddress as string).substring(0, 8)}...`,
    );
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Signature verification failed. Wallet ownership could not be proved.",
        },
        { status: 401 },
      ),
    };
  }

  console.log(
    `${logPrefix} wallet authorized: ${(walletAddress as string).substring(0, 8)}...`,
  );

  return { ok: true, walletAddress: walletAddress as string, nonce };
}

/**
 * Resolves a wallet address from a Supabase user and optional profile row.
 */
export function resolveWalletFromUser(
  user: { email?: string | null },
  profile?: { wallet_address?: string | null } | null,
): string | null {
  if (profile?.wallet_address) {
    return profile.wallet_address;
  }

  if (user.email?.endsWith("@wallet.anonchat.local")) {
    return user.email.replace("@wallet.anonchat.local", "");
  }

  return null;
}

/**
 * Ensures the authenticated wallet matches the session user's wallet.
 */
export function ensureWalletMatchesUser(
  walletAddress: string,
  userWallet: string | null,
): NextResponse | null {
  if (!userWallet) {
    return NextResponse.json(
      { error: "Could not determine caller wallet address" },
      { status: 400 },
    );
  }

  if (walletAddress !== userWallet) {
    return NextResponse.json(
      { error: "Wallet address does not match authenticated user" },
      { status: 403 },
    );
  }

  return null;
}
