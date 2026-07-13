"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock3,
  Crown,
  Flame,
  Gift,
  Goal,
  HelpCircle,
  LineChart,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { VideoGuideButton } from "@/components/dashboard/video-guide-card"
import { setupTutorialGuide } from "@/lib/video-guides"
import { cn } from "@/lib/utils"

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
} as const

const timelineSteps = [
  { title: "Create your creator account.", icon: Sparkles },
  { title: "Receive your dedicated virtual account.", icon: Wallet },
  { title: "Copy your overlay links into OBS or TikTok Studio.", icon: Play },
  { title: "Go live.", icon: Flame },
  { title: "Viewers send bank transfers.", icon: Gift },
  { title: "Animations, leaderboards and donation goals update automatically.", icon: Trophy },
  { title: "Receive your payout.", icon: BadgeCheck },
]

const earningDrivers = [
  {
    title: "Donation Goals",
    body: "People love helping creators complete goals.",
    icon: Goal,
  },
  {
    title: "Gift Animations",
    body: "Every transfer feels exciting instead of invisible.",
    icon: Sparkles,
  },
  {
    title: "Leaderboards",
    body: "Recognize your biggest supporters and encourage repeat donations.",
    icon: Crown,
  },
  {
    title: "Professional Streams",
    body: "Look more professional than creators displaying only a bank account.",
    icon: Star,
  },
]

const showcaseItems = [
  {
    label: "Donation animation",
    title: "Ada sent NGN 5,000",
    detail: "Premium gift alert",
    icon: Gift,
  },
  {
    label: "Donation goal overlay",
    title: "Gaming Chair",
    detail: "NGN 18,500 / NGN 30,000",
    icon: Target,
  },
  {
    label: "Leaderboard",
    title: "#1 BigBolu",
    detail: "NGN 24,000 raised",
    icon: Crown,
  },
  {
    label: "Account widget",
    title: "6756084610",
    detail: "Moniepoint Microfinance Bank",
    icon: Wallet,
  },
]

const insightCards = [
  "Friday generated 38% more donations.",
  "Your average donation increased this month.",
  "9 PM brought your strongest supporter activity.",
]

const withoutStreamTips = [
  "Plain account number",
  "No animations",
  "No donation goals",
  "No leaderboard",
  "No analytics",
  "No referral tracking",
]

const withStreamTips = [
  "Interactive live gift experience",
  "Beautiful animations",
  "Donation goals",
  "Live leaderboards",
  "Creator insights",
  "Referral tracking",
]

const faqs = [
  {
    question: "How do viewers donate?",
    answer: "They send a normal bank transfer to your dedicated virtual account. StreamTips turns that transfer into a live on-screen moment.",
  },
  {
    question: "Do viewers need StreamTips?",
    answer: "No. Viewers only need their bank app. They do not need to create an account or install anything.",
  },
  {
    question: "How do payouts work?",
    answer: "Donations are tracked in your dashboard and paid out through the supported settlement flow for your account.",
  },
  {
    question: "Can I use OBS?",
    answer: "Yes. Copy your StreamTips overlay links into OBS as browser sources.",
  },
  {
    question: "Can I use TikTok Studio?",
    answer: "Yes. Add your overlay link as a browser or web source, then place it over your live scene.",
  },
  {
    question: "How much is the platform fee?",
    answer: "StreamTips uses a fixed 20% platform fee for creators.",
  },
]

function SectionIntro({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  eyebrow: string
  title: string
  body?: string
  align?: "center" | "left"
}) {
  return (
    <motion.div
      {...reveal}
      className={cn(
        "mx-auto max-w-3xl",
        align === "center" ? "text-center" : "mx-0 text-left",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-200/80">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-5 text-base leading-8 text-white/62 sm:text-lg">
          {body}
        </p>
      ) : null}
    </motion.div>
  )
}

function LiveStreamMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 28, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div className="rounded-[2rem] border border-white/12 bg-white/[0.06] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#11111a]">
          <div className="relative aspect-[9/14] min-h-[580px] bg-[linear-gradient(160deg,#1b1024_0%,#241233_38%,#0b1324_100%)]">
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/25 px-4 py-3 text-xs text-white/70 backdrop-blur">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                LIVE
              </span>
              <span>2,481 watching</span>
            </div>

            <div className="absolute inset-0 opacity-45">
              <div className="absolute left-1/2 top-[15%] h-48 w-24 -translate-x-1/2 rounded-t-full bg-white/10" />
              <div className="absolute bottom-[20%] left-1/2 h-72 w-64 -translate-x-1/2 rounded-t-[7rem] bg-white/8" />
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />
            </div>

            <motion.div
              className="absolute left-6 right-6 top-[17%] rounded-2xl border border-fuchsia-200/20 bg-black/45 p-4 shadow-[0_0_40px_rgba(236,72,153,0.24)] backdrop-blur-xl"
              animate={{ y: [0, -8, 0], scale: [1, 1.025, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-100/70">
                    Gift Drop
                  </p>
                  <p className="text-lg font-black text-white">Mira sent NGN 10,000</p>
                </div>
              </div>
            </motion.div>

            <div className="absolute left-5 right-5 top-[38%] rounded-2xl border border-cyan-100/15 bg-cyan-400/12 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">
                    Donation Goal
                  </p>
                  <p className="mt-1 font-bold text-white">New Camera Setup</p>
                </div>
                <p className="text-sm font-black text-white">72%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/35">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300"
                  initial={{ width: "36%" }}
                  animate={{ width: ["36%", "72%", "64%", "72%"] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="mt-2 text-xs text-white/70">NGN 108,000 / NGN 150,000</p>
            </div>

            <div className="absolute right-5 top-[56%] w-52 rounded-2xl border border-yellow-200/20 bg-black/45 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-300" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  Top Gifters
                </p>
              </div>
              {[
                ["1", "BigBolu", "24K"],
                ["2", "Ada", "18K"],
                ["3", "Jay", "12K"],
              ].map(([rank, name, amount]) => (
                <div key={rank} className="mb-2 flex items-center justify-between rounded-xl bg-white/8 px-3 py-2 text-sm">
                  <span className="font-bold text-white/85">#{rank} {name}</span>
                  <span className="text-white/60">{amount}</span>
                </div>
              ))}
            </div>

            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/12 bg-gradient-to-r from-cyan-500/85 to-fuchsia-500/85 p-4 shadow-[0_0_34px_rgba(34,211,238,0.25)]">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">
                Virtual Account
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-lg font-black">Streamtips / CreatorName</p>
                  <p className="font-mono text-2xl font-black tracking-[0.14em]">6756084610</p>
                </div>
                <Wallet className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ShowcasePreview({ item, index }: { item: (typeof showcaseItems)[number]; index: number }) {
  const Icon = item.icon

  return (
    <motion.div
      {...reveal}
      transition={{ ...reveal.transition, delay: index * 0.08 }}
      whileHover={{ y: -8, scale: 1.015 }}
      className="group rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl transition-colors hover:border-fuchsia-200/35"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/55">
          Live
        </span>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100/65">
        {item.label}
      </p>
      <p className="mt-2 text-xl font-black text-white">{item.title}</p>
      <p className="mt-1 text-sm text-white/55">{item.detail}</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/30">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300"
          animate={{ x: ["-45%", "120%"] }}
          transition={{ duration: 2.4 + index * 0.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "52%" }}
        />
      </div>
    </motion.div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#07070d] text-white">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,#100817_0%,#07070d_34%,#0d0d16_66%,#07070d_100%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(168,85,247,0.16),transparent_34%,rgba(236,72,153,0.12)_68%,transparent)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.35)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-black">StreamTips</p>
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                Earn live
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-white/66 lg:flex">
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#insights" className="transition-colors hover:text-white">Insights</a>
            <a href="#referrals" className="transition-colors hover:text-white">Referrals</a>
            <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-white/70 transition-colors hover:text-white sm:block">
              Login
            </Link>
            <Link href="/register">
              <Button className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-5 text-white shadow-[0_0_28px_rgba(236,72,153,0.22)] hover:opacity-90">
                Start Earning
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:pb-32 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200/18 bg-white/[0.055] px-4 py-2 text-sm text-fuchsia-100/85 backdrop-blur-xl">
              <TrendingUp className="h-4 w-4" />
              Built to make every transfer feel worth chasing
            </div>

            <h1 className="mt-7 text-5xl font-black leading-[0.96] tracking-tight text-white sm:text-7xl lg:text-8xl">
              Earn More From Every Livestream.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
              Turn ordinary bank transfers into an interactive live gift experience with real-time animations, donation goals, leaderboards and creator insights.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/54">
              StreamTips helps creators increase engagement, encourage more donations and manage everything from one dashboard while viewers simply send money to your virtual account.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link href="/register">
                <Button className="h-[52px] rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-7 text-base font-bold text-white shadow-[0_18px_50px_rgba(236,72,153,0.24)] hover:opacity-90">
                  Start Earning
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <VideoGuideButton guide={setupTutorialGuide}>
                Watch Setup Video
              </VideoGuideButton>
            </div>
          </motion.div>

          <LiveStreamMockup />
        </section>

        <section id="how" className="mx-auto max-w-7xl px-5 py-24 sm:px-6">
          <SectionIntro
            eyebrow="How StreamTips Works"
            title="From bank transfer to live-stream moment."
            body="The viewer still sends money the simple way. StreamTips makes the moment visible, exciting and measurable."
          />

          <div className="mt-16 grid gap-4 lg:grid-cols-7">
            {timelineSteps.map((step, index) => {
              const Icon = step.icon

              return (
                <motion.div
                  key={step.title}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: index * 0.06 }}
                  className="relative rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="mt-5 text-sm font-black text-white/45">Step {index + 1}</p>
                  <p className="mt-2 text-base font-bold leading-6 text-white">{step.title}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-6">
          <SectionIntro
            eyebrow="Why Creators Earn More"
            title="It is not just payment. It is psychology."
            body="A plain account number is easy to ignore. StreamTips turns support into recognition, progress, status and momentum."
          />

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {earningDrivers.map((card, index) => {
              const Icon = card.icon

              return (
                <motion.div
                  key={card.title}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: index * 0.08 }}
                  whileHover={{ y: -8 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl transition-colors hover:border-fuchsia-200/35"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/90 to-pink-500/90">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mt-6 text-2xl font-black text-white">{card.title}</h3>
                  <p className="mt-4 text-base leading-7 text-white/62">{card.body}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-6">
          <SectionIntro
            eyebrow="See It Live"
            title="Every donation becomes something viewers can see."
            body="The stream reacts in real time, so supporters feel noticed and other viewers understand what is happening."
          />

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {showcaseItems.map((item, index) => (
              <ShowcasePreview key={item.label} item={item} index={index} />
            ))}
          </div>
        </section>

        <section id="insights" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionIntro
            eyebrow="Creator Insights"
            title="Know What Makes You More Money."
            body="StreamTips helps you understand which days, hours and supporter moments create the most revenue."
            align="left"
          />

          <motion.div {...reveal} className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-black/22 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/55">Best streaming day</p>
                  <BarChart3 className="h-5 w-5 text-fuchsia-200" />
                </div>
                <p className="mt-3 text-3xl font-black">Friday</p>
                <div className="mt-6 flex h-28 items-end gap-2">
                  {[36, 52, 44, 72, 96, 58, 64].map((height, index) => (
                    <motion.div
                      key={index}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-purple-500 to-pink-400"
                      initial={{ height: 10 }}
                      whileInView={{ height }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: index * 0.06 }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-black/22 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/55">Best donation hour</p>
                  <Clock3 className="h-5 w-5 text-cyan-200" />
                </div>
                <p className="mt-3 text-3xl font-black">9 PM</p>
                <div className="mt-7 h-28 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(236,72,153,0.12))] p-4">
                  <svg viewBox="0 0 240 80" className="h-full w-full overflow-visible">
                    <motion.path
                      d="M0 60 C40 58 42 24 78 32 C112 40 118 8 152 18 C186 28 186 50 240 20"
                      fill="none"
                      stroke="url(#landingLine)"
                      strokeWidth="7"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2 }}
                    />
                    <defs>
                      <linearGradient id="landingLine" x1="0" x2="1">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="50%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                ["Average donation", "NGN 4,800"],
                ["Personal records", "7 broken"],
                ["Monthly growth", "+42%"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-black/22 p-5">
                  <p className="text-sm text-white/55">{label}</p>
                  <p className="mt-2 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {insightCards.map((insight) => (
                <div key={insight} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                  <LineChart className="h-5 w-5 text-emerald-200" />
                  <p className="font-semibold text-white/86">{insight}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section id="referrals" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-24 sm:px-6 lg:grid-cols-[1fr_1fr]">
          <motion.div {...reveal} className="rounded-2xl border border-white/10 bg-white/[0.055] p-7 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-200/80">
                  Creator Referrals
                </p>
                <h2 className="mt-4 text-4xl font-black">Track The Creators You Bring In.</h2>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
                <Trophy className="h-7 w-7 text-white" />
              </div>
            </div>

            <p className="mt-5 text-base leading-8 text-white/62">
              Every creator stays on the standard 20% platform fee. Referral links remain available so you can track creator signups and keep the data ready for future programs.
            </p>

            <div className="mt-8 rounded-2xl bg-black/24 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/55">Platform Fee</p>
                  <p className="mt-1 text-5xl font-black">20%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/55">Referral Tracking</p>
                  <p className="mt-1 text-5xl font-black text-fuchsia-200">On</p>
                </div>
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400"
                  initial={{ width: "0%" }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-white/55">
                <span>Referral links</span>
                <span className="font-bold text-white">Available</span>
              </div>
            </div>
          </motion.div>

          <SectionIntro
            eyebrow="Referral Data"
            title="Keep track of who joins through you."
            body="Creators can share their referral link and view referred accounts later without changing payment splits or platform fee logic."
            align="left"
          />
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-6">
          <SectionIntro
            eyebrow="Why StreamTips Instead Of A Normal Bank Account"
            title="A bank account receives money. StreamTips helps create more reasons to send it."
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <motion.div {...reveal} className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
              <h3 className="text-2xl font-black text-white">Without StreamTips</h3>
              <div className="mt-6 space-y-3">
                {withoutStreamTips.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-black/22 p-4 text-white/62">
                    <XCircle className="h-5 w-5 text-red-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...reveal} className="rounded-2xl border border-fuchsia-200/20 bg-gradient-to-br from-purple-500/16 via-white/[0.055] to-pink-500/14 p-6 backdrop-blur-xl">
              <h3 className="text-2xl font-black text-white">With StreamTips</h3>
              <div className="mt-6 space-y-3">
                {withStreamTips.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-black/24 p-4 text-white/86">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-5 py-24 sm:px-6">
          <SectionIntro
            eyebrow="Frequently Asked Questions"
            title="Simple answers before you go live."
          />

          <div className="mt-14 grid gap-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                {...reveal}
                transition={{ ...reveal.transition, delay: index * 0.04 }}
                className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl"
              >
                <div className="flex gap-4">
                  <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-fuchsia-200" />
                  <div>
                    <h3 className="text-lg font-black text-white">{faq.question}</h3>
                    <p className="mt-2 leading-7 text-white/62">{faq.answer}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-6">
          <motion.div
            {...reveal}
            className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(236,72,153,0.2),rgba(255,255,255,0.06))] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-12"
          >
            <ShieldCheck className="mx-auto h-10 w-10 text-fuchsia-100" />
            <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-tight text-white sm:text-6xl">
              Start Your Next Livestream With StreamTips
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70">
              Create your account, connect your overlay and start turning every donation into an unforgettable experience.
            </p>
            <Link href="/register" className="mt-8 inline-flex">
              <Button className="h-[52px] rounded-full bg-white px-8 text-base font-black text-zinc-950 hover:bg-fuchsia-50">
                Create Creator Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </section>
      </main>
    </div>
  )
}
