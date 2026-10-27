import type { AppUser } from "@/lib/user"

/**
 * Public creator nickname rules. Mirrors normalizeCreatorNickname / validateCreatorNickname in the
 * backend (server.js) so the client and server accept exactly the same values.
 */
export const CREATOR_NICKNAME_MAX_LENGTH = 32

export function normalizeCreatorNickname(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
}

/** Returns an error message, or an empty string when the nickname is valid. */
export function validateCreatorNickname(value: unknown) {
  const nickname = normalizeCreatorNickname(value)

  if (!nickname) return "Enter a creator nickname."
  if (Array.from(nickname).length > CREATOR_NICKNAME_MAX_LENGTH) {
    return `Creator nickname must be ${CREATOR_NICKNAME_MAX_LENGTH} characters or fewer.`
  }
  // eslint-disable-next-line no-control-regex
  if (/[<>]/.test(nickname) || /[\u0000-\u001F\u007F]/.test(nickname)) {
    return "Creator nickname cannot contain < or > or control characters."
  }
  if (!/[\p{L}\p{N}]/u.test(nickname)) {
    return "Creator nickname must include at least one letter or number."
  }

  return ""
}

export function getCreatorNickname(user: Partial<AppUser> | null | undefined) {
  return normalizeCreatorNickname(user?.nickname)
}
