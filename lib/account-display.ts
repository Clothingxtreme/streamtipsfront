import type { AppUser } from "@/lib/user"

export const PUBLIC_STREAMER_ACCOUNT_PREFIX = "Senscrypttech"

function cleanAccountNameSource(value: unknown) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^streamtip\s*\/\s*/i, "")
    .replace(/^senscrypt\s+technologies\s+ltd\s*\/\s*/i, "")
    .replace(/^senscrypttech\s*\/\s*/i, "")
    .trim()
}

function getInitialsFromParts(parts: unknown[]) {
  return parts
    .map(cleanAccountNameSource)
    .flatMap((part) => part.split(/[\s-]+/))
    .map((part) => part.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join("")
}

export function getStreamerPublicAccountName(user: Partial<AppUser> | null | undefined) {
  const identity = user?.identity || {}
  const nameParts = [
    user?.firstName || identity.firstName,
    user?.middleName || identity.middleName,
    user?.lastName || identity.lastName,
  ].filter(Boolean)
  const initials =
    getInitialsFromParts(nameParts) ||
    getInitialsFromParts([user?.name]) ||
    getInitialsFromParts([user?.virtualAccount?.accountName]) ||
    "ST"

  return `${PUBLIC_STREAMER_ACCOUNT_PREFIX}/${initials}`
}
