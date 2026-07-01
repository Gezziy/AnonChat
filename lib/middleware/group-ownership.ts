import { NextResponse } from "next/server"
import { resolveRoomOwnerWallet } from "../auth/wallet-owner"

type RequireGroupOwnerParams = {
  supabase: any
  groupId: string
  callerWallet?: string | null
  userId?: string | null
}

/**
 * Verifies that the caller (by wallet or user id) is the owner of the group.
 * Returns an object with `authorized: true` when check passes, otherwise
 * returns a `NextResponse` with a properly shaped 403 Unauthorized JSON body.
 */
export async function requireGroupOwner({
  supabase,
  groupId,
  callerWallet,
  userId,
}: RequireGroupOwnerParams): Promise<any> {
  try {
    const { data: room, error } = await supabase
      .from("rooms")
      .select("id, owner_wallet, created_by")
      .eq("id", groupId)
      .maybeSingle()

    if (error) {
      console.error("[requireGroupOwner] group lookup error:", error)
      return NextResponse.json({ error: "Failed to retrieve group" }, { status: 500 })
    }

    if (!room) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const ownerWallet = await resolveRoomOwnerWallet(supabase, room)

    if (callerWallet) {
      if (!ownerWallet || ownerWallet !== callerWallet) {
        console.warn(
          `[requireGroupOwner] wallet ${
            callerWallet?.substring(0, 8) ?? callerWallet
          }... is not owner of group ${groupId}`
        )
        return NextResponse.json(
          { error: "Unauthorized", message: "You are not the owner of this group." },
          { status: 403 }
        )
      }

      return { authorized: true, ownerWallet, ownerUserId: room.created_by }
    }

    if (userId) {
      if (room.created_by !== userId) {
        console.warn(`[requireGroupOwner] user ${userId} is not owner of group ${groupId}`)
        return NextResponse.json(
          { error: "Unauthorized", message: "You are not the owner of this group." },
          { status: 403 }
        )
      }

      return { authorized: true, ownerWallet, ownerUserId: room.created_by }
    }

    console.warn(`[requireGroupOwner] missing callerWallet and userId for group ${groupId}`)
    return NextResponse.json(
      { error: "Unauthorized", message: "You are not the owner of this group." },
      { status: 403 }
    )
  } catch (err) {
    console.error("[requireGroupOwner] unexpected error:", err)
    return NextResponse.json({ error: "Failed to verify ownership" }, { status: 500 })
  }
}

export default requireGroupOwner
