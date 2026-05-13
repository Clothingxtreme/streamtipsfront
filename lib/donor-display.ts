export function sanitizeDonorDisplayName(value: unknown) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function limitDonorDisplayName(value: string) {
  return value.length > 32 ? `${value.slice(0, 32).trim()}...` : value
}

function getFirstNameOnly(value: string) {
  const withoutPrefix = sanitizeDonorDisplayName(value)
    .replace(/^streamtip\s*\/\s*/i, "")
    .replace(/^from\s+/i, "")
    .trim()
  const firstName = withoutPrefix.split(/\s+/)[0]

  return firstName || "Anonymous"
}

function getBankTransferNarrationDisplay(value: string) {
  const narration = sanitizeDonorDisplayName(value)

  if (!narration || !/\b(?:nip|nibss|transfer|trf)\b/i.test(narration)) {
    return ""
  }

  const firstDelimiter = /\s+-\s+/.exec(narration)
  const senderSearchArea = firstDelimiter ? narration.slice(0, firstDelimiter.index) : narration
  const fromPattern = /\bfrom\b/gi
  let fromMatch: RegExpExecArray | null
  let fromIndex = -1
  let fromLength = 0

  while ((fromMatch = fromPattern.exec(senderSearchArea)) !== null) {
    fromIndex = fromMatch.index
    fromLength = fromMatch[0].length
  }

  if (fromIndex < 0) {
    return ""
  }

  const fromText = narration.slice(fromIndex + fromLength).trim()
  const delimiterPattern = /\s+-\s+/g
  let delimiterMatch: RegExpExecArray | null
  let delimiterIndex = -1
  let delimiterLength = 0

  while ((delimiterMatch = delimiterPattern.exec(fromText)) !== null) {
    delimiterIndex = delimiterMatch.index
    delimiterLength = delimiterMatch[0].length
  }

  let senderName = fromText
  let typedNarration = ""

  if (delimiterIndex >= 0) {
    senderName = fromText.slice(0, delimiterIndex).trim()
    typedNarration = fromText.slice(delimiterIndex + delimiterLength).trim()
  }

  senderName = sanitizeDonorDisplayName(
    senderName.replace(/\b(?:session|session id|reference|ref|rrn)\b.*$/i, ""),
  )
  typedNarration = sanitizeDonorDisplayName(typedNarration)

  if (
    typedNarration &&
    typedNarration.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() !==
      senderName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  ) {
    return limitDonorDisplayName(typedNarration)
  }

  return getFirstNameOnly(senderName)
}

export function getPublicDonorDisplayName(value: unknown, source?: string) {
  const sanitized = sanitizeDonorDisplayName(value)

  if (!sanitized) {
    return "Anonymous"
  }

  const bankTransferDisplay = getBankTransferNarrationDisplay(sanitized)

  if (bankTransferDisplay) {
    return bankTransferDisplay
  }

  if (source === "narration" || source === "manual_test") {
    return limitDonorDisplayName(sanitized)
  }

  return getFirstNameOnly(sanitized)
}
