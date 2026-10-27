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

const NICKNAME_INITIALS_MAX_LENGTH = 4

/**
 * Public account-card label ("Senscrypttech/XY"). Mirrors buildPublicStreamerAccountName in the
 * backend: initials from the creator nickname first; accounts without a usable nickname fall back to
 * legal-name initials (dashboard) or the label the server already computed (public overlays, which
 * no longer receive legal names).
 */
export function getStreamerPublicAccountName(user: Partial<AppUser> | null | undefined) {
  const nicknameInitials = getInitialsFromParts([user?.nickname]).slice(0, NICKNAME_INITIALS_MAX_LENGTH)
  if (nicknameInitials) {
    return `${PUBLIC_STREAMER_ACCOUNT_PREFIX}/${nicknameInitials}`
  }

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
