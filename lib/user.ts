export interface VirtualAccount {
  accountReference?: string
  accountName: string
  accountNumber: string
  bankName: string
  bankCode?: string
  reservationReference?: string
  status?: string
  provider?: string
  environment?: "sandbox" | "live" | "unconfigured"
  paystackCustomerCode?: string
  dedicatedAccountId?: string
  assignmentStatus?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserIdentity {
  hasBvn?: boolean
  hasNin?: boolean
  bvnLast4?: string
  ninLast4?: string
  hasDateOfBirth?: boolean
  dateOfBirth?: string
  firstName?: string
  middleName?: string
  lastName?: string
  policyAcceptedAt?: string
  signupCompletedAt?: string
  isComplete?: boolean
}

export interface IdentityVerificationSnapshot {
  status: "unverified" | "verified" | "failed" | "skipped"
  matchStatus?: string
  matchPercentage?: number
  responseCode?: string
  responseMessage?: string
  checkedAt?: string
  verifiedAt?: string
}

export interface IdentityVerification {
  provider?: string
  bvn?: IdentityVerificationSnapshot
  nin?: IdentityVerificationSnapshot
  updatedAt?: string
}

export interface PayoutProfile {
  bankName?: string
  bankCode?: string
  accountNumber?: string
  accountName?: string
  firstName?: string
  middleName?: string
  lastName?: string
  status?: "missing" | "verified"
  locked?: boolean
  verifiedAt?: string
  lockedAt?: string
  changeRequiresSupport?: boolean
  verificationProvider?: string
}

export interface AppUser {
  id: string
  name: string
  firstName?: string
  middleName?: string
  lastName?: string
  email: string
  overlaySlug?: string
  role?: "creator" | "admin"
  status?: "active" | "suspended" | "banned"
  profileImage?: string
  phoneNumber?: string
  phoneVerified?: boolean
  kycTier?: 1 | 2 | 3 | 4
  kycStatus?: "incomplete" | "pending" | "verified" | "rejected"
  kyc?: {
    tier: number
    status: string
    dailyReceivingLimit: number
    limits?: {
      singleGift: number
      dailyGift: number
      monthlyGift: number
      singleWithdrawal: number
      dailyWithdrawal: number
      monthlyWithdrawal: number
    }
    nextTier?: number | null
    requirements?: string[]
    nextTierRequirements?: string[]
    phoneVerified: boolean
    bvnVerified: boolean
    ninVerified: boolean
    selfieVerified: boolean
    bankAccountMatched: boolean
    proofOfAddressSubmitted: boolean
    bankStatementSubmitted: boolean
    socialMediaVerified: boolean
    upgradeStatus?: "none" | "awaiting_review" | "approved" | "rejected"
    upgradeTargetTier?: number
    upgradeSubmittedAt?: string
    manualReviewStatus: string
  }
  wallet?: {
    availableBalance: number
    pendingBalance: number
    totalReceived: number
    updatedAt?: string
  }
  identity?: UserIdentity
  identityVerification?: IdentityVerification
  payoutProfile?: PayoutProfile
  virtualAccount: VirtualAccount | null
  notificationUnreadCount?: number
  createdAt?: string
}
