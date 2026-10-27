"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CopyButton,
  Notice,
  PageHeader,
  PageShell,
  Panel,
  primaryButton,
  secondaryButton,
} from "@/components/dashboard/page-kit"
import { useAuth } from "@/app/context/AuthContext"
import { authRequest } from "@/lib/auth-client"

const fallbackAccount = {
  accountName: "No virtual account yet",
  accountNumber: "Register a user first",
  bankName: "Bank",
  accountReference: "Pending registration",
}

function getProvisioningErrorMessage(
  payload: Record<string, unknown> | null,
  status: number,
  providerLabel: string,
) {
  const backendMessage = String(payload?.error || payload?.message || "").trim()
  if (backendMessage && !/^request failed with status code/i.test(backendMessage)) {
    return backendMessage
  }

  if (status === 400 || status === 422) {
    return `${providerLabel} could not create the virtual account because some creator details were rejected. Please confirm your BVN/NIN verification, legal name, phone number, and payout setup, then try again.`
  }

  if (status >= 500) {
    return `${providerLabel} virtual account provisioning is temporarily unavailable. Please try again shortly or contact support if it continues.`
  }

  return `Could not provision your ${providerLabel} virtual account. Please try again or contact support.`
}

export default function VirtualAccountPage() {
  const router = useRouter()
  const [testSender, setTestSender] = useState("Monnify Sandbox Tester")
  const [testAmount, setTestAmount] = useState("1500")
  const [isTestingDonation, setIsTestingDonation] = useState(false)
  const [testFeedback, setTestFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [provisionFeedback, setProvisionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [showVerifyBvnPrompt, setShowVerifyBvnPrompt] = useState(false)
  const { user, refreshUser } = useAuth()
  const isCollectionPaused = Boolean((user as any)?.donationCollectionPaused)
  const collectionProvider = String((user as any)?.collectionProvider || user?.virtualAccount?.provider || "monnify").toLowerCase()
  const providerLabel = collectionProvider === "monnify" ? "Monnify" : "Paystack"
  const providerAccountTypeLabel =
    collectionProvider === "monnify" ? "reserved account" : "dedicated virtual account"
  const providerReferenceLabel =
    collectionProvider === "monnify" ? "Monnify reservation details" : "Paystack assignment details"
  const providerDescriptor =
    collectionProvider === "monnify"
      ? "Monnify Reserved Account"
      : "Paystack Dedicated Virtual Account"
  const isSandboxAccount =
    user?.virtualAccount?.provider === "monnify" &&
    String(user?.virtualAccount?.environment || "").toLowerCase() === "sandbox"
  const needsProvisioning =
    Boolean(user?.id) &&
    (!user?.virtualAccount?.accountNumber ||
      user?.virtualAccount?.status !== "active" ||
      String(user?.virtualAccount?.provider || "").toLowerCase() !== collectionProvider)

  const retryProvisioning = async () => {
    if (!user?.id) {
      return
    }

    setIsProvisioning(true)
    setProvisionFeedback(null)

    try {
      const response = await authRequest(`/users/${user.id}/virtual-account`, {
        method: "POST",
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (String(payload?.code || "") === "BVN_VERIFICATION_REQUIRED") {
          setShowVerifyBvnPrompt(true)
        }
        throw new Error(getProvisioningErrorMessage(payload, response.status, providerLabel))
      }

      await refreshUser()
      setProvisionFeedback({
        type: "success",
        message: `Your ${providerLabel} ${providerAccountTypeLabel} has been refreshed.`,
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("verify your bvn")
      ) {
        setShowVerifyBvnPrompt(true)
      }
      setProvisionFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : `Could not provision your ${providerLabel} virtual account.`,
      })
    } finally {
      setIsProvisioning(false)
    }
  }

  const runSandboxDonationTest = async () => {
    setIsTestingDonation(true)
    setTestFeedback(null)

    try {
      const response = await authRequest("/monnify/test-donation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: testSender.trim() || "Monnify Sandbox Tester",
          amount: Number(testAmount) || 0,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "Could not create a Monnify sandbox donation.")
      }

      setTestFeedback({
        type: "success",
        message: "Test donation sent. Check your donations page and overlay now.",
      })
    } catch (error) {
      setTestFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not create a Monnify sandbox donation.",
      })
    } finally {
      setIsTestingDonation(false)
    }
  }

  const accountData = user?.virtualAccount || fallbackAccount

  if (isCollectionPaused) {
    return (
      <PageShell data-tour="virtual-account-main">
        <PageHeader title="Virtual Account" />
        <Notice tone="warning" title="Virtual account paused">
          Virtual-account donations are temporarily paused during payout migration. Existing balances are safe, and updates will be announced in your notifications.
        </Notice>
      </PageShell>
    )
  }

  const hasAccount = Boolean(user?.virtualAccount?.accountNumber)
  const accountStatus = String(user?.virtualAccount?.status || "").toLowerCase()
  const allDetailsText = `Bank: ${accountData.bankName}\nAccount Number: ${accountData.accountNumber}\nAccount Name: ${accountData.accountName}`

  const downloadAccountDetails = () => {
    if (!hasAccount) return
    const blob = new Blob([`${allDetailsText}\n`], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `streamtip-account-${accountData.accountNumber}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const accountFields = [
    { label: "Bank", value: accountData.bankName, field: "bank" },
    { label: "Account number", value: accountData.accountNumber, field: "number" },
    { label: "Account name", value: accountData.accountName, field: "name" },
  ]

  return (
    <>
      <PageShell data-tour="virtual-account-main">
        <PageHeader
          title="Virtual Account"
          description={`Share these details so supporters can tip you by bank transfer. This is your ${providerLabel} ${providerAccountTypeLabel}.`}
        />

        <Panel
          title="Account details"
          description={hasAccount ? "Supporters send money to this account." : "Your account will appear here once it is provisioned."}
          actions={
            hasAccount ? (
              <>
                <CopyButton value={allDetailsText} label="Copy all details" copiedLabel="Copied all" className="h-9 px-3" />
                <button type="button" onClick={downloadAccountDetails} className={cn(secondaryButton, "h-9 px-3 text-xs")}>
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Download
                </button>
              </>
            ) : null
          }
        >
          <dl className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-zinc-950/40">
            {accountFields.map(({ label, value, field }) => (
              <div key={field} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <dt className="text-xs text-zinc-500">{label}</dt>
                  <dd
                    className={cn(
                      "mt-0.5 truncate font-semibold text-white",
                      field === "number" ? "font-mono text-2xl tracking-wider" : "text-base",
                    )}
                  >
                    {value}
                  </dd>
                </div>
                <CopyButton value={hasAccount ? value : ""} ariaLabel={`Copy ${label.toLowerCase()}`} />
              </div>
            ))}
          </dl>

          {needsProvisioning ? (
            <div className="mt-4">
              <Notice
                tone={accountStatus === "failed" ? "error" : "warning"}
                title={hasAccount ? "Your account needs to be refreshed" : "No virtual account yet"}
                action={
                  <button type="button" onClick={retryProvisioning} disabled={isProvisioning} className={cn(primaryButton, "h-9 px-3 text-xs")}>
                    <RefreshCw className={cn("h-3.5 w-3.5", isProvisioning && "animate-spin")} aria-hidden />
                    {isProvisioning ? "Provisioning..." : `Provision ${providerLabel} account`}
                  </button>
                }
              >
                Generate your {providerLabel} {providerAccountTypeLabel} so supporters can send tips.
              </Notice>
            </div>
          ) : null}

          {provisionFeedback ? (
            <div className="mt-3">
              <Notice tone={provisionFeedback.type === "success" ? "success" : "error"}>{provisionFeedback.message}</Notice>
            </div>
          ) : null}
        </Panel>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Panel title="How supporters tip you">
            <ol className="space-y-3 text-sm">
              {[
                "Open a banking app (or USSD) and choose transfer to bank.",
                `Enter the account number above and select ${accountData.bankName} as the bank.`,
                `Complete the transfer. ${providerLabel} confirms it and the tip appears on your dashboard and overlay.`,
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-xs font-semibold text-purple-200">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-zinc-300">{step}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Technical details" description={providerReferenceLabel}>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <dt className="text-xs text-zinc-500">Reference</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs text-zinc-200">{accountData.accountReference || "Not available"}</dd>
                </div>
                {accountData.accountReference && hasAccount ? (
                  <CopyButton value={accountData.accountReference} label="Copy" ariaLabel="Copy account reference" />
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-zinc-500">Provider</dt>
                  <dd className="mt-0.5 text-zinc-200">{providerDescriptor}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Environment</dt>
                  <dd className="mt-0.5 capitalize text-zinc-200">{user?.virtualAccount?.environment || "live"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Status</dt>
                  <dd
                    className={cn(
                      "mt-0.5 capitalize",
                      accountStatus === "active" ? "text-emerald-300" : accountStatus === "failed" ? "text-red-300" : "text-amber-300",
                    )}
                  >
                    {user?.virtualAccount?.status || "Awaiting registration"}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-zinc-500">One account per creator, reused across all your streams.</p>
            </dl>
          </Panel>
        </div>

        {isSandboxAccount ? (
          <Panel title="Monnify sandbox donation test" description="Create a safe test donation for this creator account.">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="sandbox-sender" className="text-sm font-medium text-zinc-300">Test sender name</label>
                  <input
                    id="sandbox-sender"
                    value={testSender}
                    onChange={(event) => setTestSender(event.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-white outline-none transition-colors focus:border-purple-500"
                    placeholder="Monnify Sandbox Tester"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="sandbox-amount" className="text-sm font-medium text-zinc-300">Test amount (NGN)</label>
                  <input
                    id="sandbox-amount"
                    value={testAmount}
                    onChange={(event) => setTestAmount(event.target.value)}
                    type="number"
                    min="1"
                    className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-white outline-none transition-colors focus:border-purple-500"
                    placeholder="1500"
                  />
                </div>
              </div>
              <p className="text-sm text-zinc-500">
                Uses StreamTip&apos;s sandbox donation endpoint so you can check totals, alerts and the OBS overlay while your Monnify account is in test mode.
              </p>
              {testFeedback ? (
                <Notice tone={testFeedback.type === "success" ? "success" : "error"}>{testFeedback.message}</Notice>
              ) : null}
              <button type="button" onClick={runSandboxDonationTest} disabled={isTestingDonation} className={primaryButton}>
                {isTestingDonation ? "Sending test donation..." : "Run Monnify test donation"}
              </button>
            </div>
          </Panel>
        ) : null}
      </PageShell>

      {showVerifyBvnPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">BVN verification required</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Please verify your BVN before generating a virtual account.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowVerifyBvnPrompt(false)}
                className="h-10 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVerifyBvnPrompt(false)
                  router.push("/dashboard/settings#bvn-verification")
                }}
                className="h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 text-sm font-medium text-white hover:opacity-90"
              >
                Verify BVN
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
