/**
 * POST /api/groups/[id]/invite
 *
 * Regenerates an invite code for a group. Requires:
 *   1. Supabase session authentication
 *   2. Wallet signature over a one-time nonce
 *   3. Caller must be the group owner
 *
 * Request body:
 *   {
 *     walletAddress: string,
 *     signature: string,
 *     expires_in?: number,
 *     max_uses?: number
 *   }
 */

import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import {
  generateInviteCode,
  buildExpiresAt,
} from "@/lib/groups/invite"
import {
  ensureWalletMatchesUser,
  resolveWalletFromUser,
  verifyWalletAuthorization,
} from "@/lib/auth/wallet-authorization"
import { auditLog } from "@/lib/auth/signed-message-middleware"

type InviteBody = {
  walletAddress?: string
  signature?: string
  expires_in?: number
  max_uses?: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("[groups/invite] auth error:", authError)
      return NextResponse.json(
        { error: "Unable to verify authentication" },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: InviteBody = await request.json().catch(() => ({}))

    const auth = await verifyWalletAuthorization(body, "regenerate_invite")
    if (!auth.ok) {
      return auth.response
    }

    const { data: callerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, wallet_address")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("[groups/invite] profile lookup error:", profileError)
      return NextResponse.json(
        { error: "Failed to retrieve caller profile" },
        { status: 500 }
      )
    }

    const callerWallet = resolveWalletFromUser(user, callerProfile)
    const walletMismatch = ensureWalletMatchesUser(auth.walletAddress, callerWallet)
    if (walletMismatch) {
      return walletMismatch
    }

    const { data: group, error: groupError } = await supabase
      .from("rooms")
      .select("id, name, created_by, is_private")
      .eq("id", groupId)
      .maybeSingle()

    if (groupError) throw groupError
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (group.created_by !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. Only the group owner can regenerate invite codes." },
        { status: 403 }
      )
    }

    const { expires_in, max_uses } = body

    if (max_uses !== undefined && (!Number.isInteger(max_uses) || max_uses < 1)) {
      return NextResponse.json(
        { error: "max_uses must be a positive integer" },
        { status: 400 }
      )
    }

    if (expires_in !== undefined && (!Number.isInteger(expires_in) || expires_in < 1)) {
      return NextResponse.json(
        { error: "expires_in must be a positive integer (seconds)" },
        { status: 400 }
      )
    }

    // Invalidate existing invite codes before generating a new one
    const { error: deleteError } = await supabase
      .from("invites")
      .delete()
      .eq("room_id", groupId)

    if (deleteError) {
      console.error("[groups/invite] failed to invalidate old invites:", deleteError)
      return NextResponse.json(
        { error: "Failed to regenerate invite code" },
        { status: 500 }
      )
    }

    const code = generateInviteCode()
    const expiresAt = buildExpiresAt(expires_in)

    const { data: invite, error: insertError } = await supabase
      .from("invites")
      .insert({
        code,
        room_id: groupId,
        created_by: user.id,
        expires_at: expiresAt,
        max_uses: max_uses ?? null,
        use_count: 0,
      })
      .select("code, room_id, created_at, expires_at, max_uses")
      .single()

    if (insertError) throw insertError

    auditLog("regenerate_invite", auth.walletAddress, {
      groupId,
      inviteCode: invite.code,
    })

    console.info(`[groups/invite] Invite code regenerated for group ${groupId} by user ${user.id}`)

    return NextResponse.json(
      {
        success: true,
        invite: {
          code: invite.code,
          group_id: invite.room_id,
          created_at: invite.created_at,
          expires_at: invite.expires_at,
          max_uses: invite.max_uses,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(`[groups/invite] POST /api/groups/${groupId}/invite error:`, error)
    return NextResponse.json({ error: "Failed to generate invite code" }, { status: 500 })
  }
}
