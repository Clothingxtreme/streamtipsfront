"use client"

import { useParams } from "next/navigation"
import Overlay from "@/components/overlay"

export default function PublicCreatorOverlayPage() {
  const params = useParams<{ creatorId?: string }>()
  const creatorId = typeof params.creatorId === "string" ? params.creatorId : ""

  return <Overlay publicCreatorId={creatorId} />
}
