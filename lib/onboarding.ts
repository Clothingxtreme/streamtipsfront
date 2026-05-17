import type { AppUser } from "@/lib/user"

function hasCompletedSignupFallback(user?: AppUser | null) {
  return Boolean(user?.payoutProfile?.locked || user?.identity?.signupCompletedAt)
}

export function needsIdentitySetup(user?: AppUser | null) {
  if (!user) return false
  if (user.identity?.isComplete) return false
  return !hasCompletedSignupFallback(user)
}

export function needsPayoutSetup(user?: AppUser | null) {
  return Boolean(user && !user.payoutProfile?.locked)
}

export function getPostAuthRedirect(user?: AppUser | null) {
  if (needsIdentitySetup(user)) {
    return "/register?continue=identity"
  }

  return needsPayoutSetup(user) ? "/dashboard/settings?complete=payout" : "/dashboard"
}
