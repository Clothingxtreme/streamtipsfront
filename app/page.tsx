"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Crown,
  Gift,
  Link2,
  Play,
  Sparkles,
  Target,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { VideoGuideModal } from "@/components/dashboard/video-guide-card"
import { setupTutorialGuide } from "@/lib/video-guides"
import { cn } from "@/lib/utils"

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070d]"
const primaryCta = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 text-sm font-semibold text-white transition-[filter] hover:brightness-110",
  focusRing,
)
const secondaryCta = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-sm font-medium text-white/85 transition-colors hover:border-white/30 hover:text-white",
  focusRing,
)

const steps = [
  {
    title: "Create your account",
    body: "Sign up as a creator and get your own virtual bank account for tips.",
  },
  {
    title: "Add your overlay",
    body: "Copy your overlay links into OBS or TikTok Studio as browser sources.",
  },
  {
    title: "Viewers send a transfer",
    body: "Supporters tip you with a normal bank transfer. No app or sign-up for them.",
  },
  {
    title: "It shows up live",
    body: "Alerts, goals and the leaderboard update on stream, and earnings settle to your bank.",
  },
]

const features: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Gift animations", body: "Every tip plays an on-stream alert with the supporter's name and amount.", icon: Gift },
  { title: "Donation goals", body: "A compact progress bar that fills as supporters help you reach a goal.", icon: Target },
  { title: "Live leaderboard", body: "Show your top 5 gifters, or just your #1, and reset it whenever you like.", icon: Crown },
  { title: "Account-number overlay", body: "Your account details on screen with your creator nickname, so viewers know where to send.", icon: Wallet },
  { title: "Creator analytics", body: "See your best days and hours, average tip and most active supporters.", icon: BarChart3 },
  { title: "Referral tracking", body: "Share your referral link and see which creators joined through you.", icon: Link2 },
]

const comparison = [
  ["Supporters see the tip on stream", false, true],
  ["Donation goals and leaderboard", false, true],
  ["Your nickname on the account overlay", false, true],
  ["Earnings, settlement and analytics in one place", false, true],
  ["Viewers pay with their normal bank app", true, true],
] as const

const faqs = [
  {
    question: "How do viewers tip me?",
    answer: "They send a normal bank transfer to your virtual account. StreamTips detects it and turns it into a live on-stream moment.",
  },
  {
    question: "Do viewers need a StreamTips account?",
    answer: "No. Viewers only need their bank app. They don't create an account or install anything.",
  },
  {
    question: "How much does StreamTips cost?",
    answer: "StreamTips uses a fixed 10% platform fee for creators. Monnify VAT (1.61–2.02%) is deducted from your share at settlement.",
  },
  {
    question: "How do payouts work?",
    answer: "Tips are tracked in your dashboard and settled to your verified bank account through the supported settlement flow for your account.",
  },
  {
    question: "Can I use OBS or TikTok Studio?",
    answer: "Yes. Add your StreamTips overlay link as a browser (web) source and place it over your live scene.",
  },
]

function StreamPreview() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-none" aria-label="Example of the StreamTips overlay on a live stream" role="img">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
        <div className="relative aspect-[9/14] max-h-[560px] w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(160deg,#1b1024_0%,#241233_40%,#0b1324_100%)]">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/30 px-4 py-2.5 text-[11px] text-white/70">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden />
              LIVE
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5">Example</span>
          </div>

          <motion.div
            className="absolute left-4 right-4 top-[14%] flex items-center gap-3 rounded-2xl border border-fuchsia-200/20 bg-black/50 p-3.5 backdrop-blur"
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Gift className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-100/70">New tip</p>
              <p className="truncate font-semibold text-white">Mira sent NGN 10,000</p>
            </div>
          </motion.div>

          <div className="absolute left-4 right-4 top-[36%] rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-white">New Camera Setup</p>
              <p className="font-semibold text-white">72%</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
            </div>
            <p className="mt-1.5 text-xs text-white/60">NGN 108,000 / NGN 150,000</p>
          </div>

          <div className="absolute right-4 top-[56%] w-44 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
              <Crown className="h-3.5 w-3.5 text-yellow-300" aria-hidden />
              Top gifters
            </p>
            {[
              ["1", "BigBolu", "24K"],
              ["2", "Ada", "18K"],
              ["3", "Jay", "12K"],
            ].map(([rank, name, amount]) => (
              <div key={rank} className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-white/85">#{rank} {name}</span>
                <span className="text-white/55">{amount}</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-gradient-to-r from-purple-600/85 to-pink-600/85 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Virtual account</p>
            <p className="mt-1 text-lg font-bold text-white">YourNickname</p>
            <p className="font-mono text-xl font-bold tracking-[0.12em] text-white">0123 456 789</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07070d] text-white">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[560px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(168,85,247,0.16),transparent_70%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className={cn("flex items-center gap-2.5 rounded-lg", focusRing)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-[18px] w-[18px] text-white" aria-hidden />
            </span>
            <span className="text-base font-bold tracking-tight">StreamTips</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-white/65 md:flex">
            <a href="#how" className={cn("rounded hover:text-white", focusRing)}>How it works</a>
            <a href="#insights" className={cn("rounded hover:text-white", focusRing)}>Features</a>
            <a href="#referrals" className={cn("rounded hover:text-white", focusRing)}>Pricing</a>
            <a href="#faq" className={cn("rounded hover:text-white", focusRing)}>FAQ</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className={cn("rounded px-2 text-sm font-medium text-white/75 hover:text-white", focusRing)}>
              Log in
            </Link>
            <Link href="/register" className={cn(primaryCta, "h-9 px-4")}>
              Start earning
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-20">
          <div>
            <p className="text-sm font-medium text-fuchsia-200/90">For live streamers in Nigeria</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Turn bank-transfer tips into live stream moments.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              Viewers send a normal bank transfer. StreamTips shows it on your stream with gift alerts, donation goals and a
              live leaderboard, and tracks your earnings in one dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={primaryCta}>
                Create creator account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <VideoGuideModal guide={setupTutorialGuide}>
                <button type="button" className={secondaryCta}>
                  <Play className="h-4 w-4 fill-current" aria-hidden />
                  Watch setup video
                </button>
              </VideoGuideModal>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-white/65 sm:grid-cols-3">
              {["No app needed for viewers", "Works with OBS & TikTok Studio", "10% platform fee"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <StreamPreview />
        </section>

        <section id="how" className="scroll-mt-20 border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-2 max-w-2xl text-white/60">From a bank transfer to a moment your whole audience sees.</p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="insights" className="scroll-mt-20 border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything you need on stream</h2>
            <p className="mt-2 max-w-2xl text-white/60">
              A plain account number is easy to ignore. StreamTips makes every tip visible and gives supporters a reason to join in.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ title, body, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <Icon className="h-5 w-5 text-fuchsia-300" aria-hidden />
                  <h3 className="mt-3 font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="referrals" className="scroll-mt-20 border-t border-white/[0.06]">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Simple pricing</h2>
              <p className="mt-2 text-white/60">One fixed platform fee for every creator. Referral links are free to share.</p>
              <div className="mt-6 rounded-2xl border border-purple-400/20 bg-purple-500/[0.06] p-6">
                <p className="text-sm text-white/60">Platform fee</p>
                <p className="mt-1 text-5xl font-bold tracking-tight">10%</p>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  of each tip you receive. Monnify VAT (1.61–2.02%) is deducted from your share at settlement.
                </p>
              </div>
              <p className="mt-4 text-sm text-white/60">
                Bring other creators with your referral link and see who joined through you in your dashboard.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">StreamTips vs. a plain account number</h2>
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs text-white/55">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Feature</th>
                      <th scope="col" className="px-3 py-3 text-center font-medium">Account number</th>
                      <th scope="col" className="px-3 py-3 text-center font-medium text-white">StreamTips</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {comparison.map(([label, plain, streamtips]) => (
                      <tr key={label}>
                        <td className="px-4 py-3 text-white/80">{label}</td>
                        {[plain, streamtips].map((value, index) => (
                          <td key={index} className="px-3 py-3 text-center">
                            {value ? (
                              <Check className="mx-auto h-4 w-4 text-emerald-300" aria-label="Yes" />
                            ) : (
                              <X className="mx-auto h-4 w-4 text-white/30" aria-label="No" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-white/[0.06]">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Questions</h2>
            <div className="mt-6 divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              {faqs.map((faq) => (
                <details key={faq.question} className="group px-5 py-4">
                  <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-4 rounded font-medium text-white [&::-webkit-details-marker]:hidden", focusRing)}>
                    {faq.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(168,85,247,0.2),rgba(236,72,153,0.14))] px-6 py-10 text-center sm:px-10">
              <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Ready for your next stream?</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/70">
                Create your account, add your overlay, and let supporters see every tip.
              </p>
              <Link href="/register" className={cn(primaryCta, "mt-6 bg-white bg-none text-zinc-950 hover:brightness-95")}>
                Create creator account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} StreamTips</p>
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/terms" className={cn("rounded hover:text-white", focusRing)}>Terms</Link>
            <Link href="/privacy" className={cn("rounded hover:text-white", focusRing)}>Privacy</Link>
            <Link href="/login" className={cn("rounded hover:text-white", focusRing)}>Log in</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
