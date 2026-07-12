"use client"

import { useEffect, useState } from "react"
import { Plus, Save, Trash2, Trophy } from "lucide-react"
import { adminRequest } from "@/lib/admin-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type MilestoneConfig = {
  id: string
  title: string
  metric: "total_amount" | "total_donations" | "donation_days" | "unique_supporters"
  target: number
  reductionPercent: number
  expirationDays: number
  enabled: boolean
  sortOrder: number
}

type RewardsConfig = {
  defaultPlatformFeePercent: number
  minimumPlatformFeePercent: number
  rewardExpirationDays: number
  referralQualifyingDonationAmount: number
  referralReductionPercent: number
  referralReductionCapPercent: number
  milestones: MilestoneConfig[]
}

const defaultConfig: RewardsConfig = {
  defaultPlatformFeePercent: 20,
  minimumPlatformFeePercent: 15,
  rewardExpirationDays: 30,
  referralQualifyingDonationAmount: 10000,
  referralReductionPercent: 1,
  referralReductionCapPercent: 3,
  milestones: [],
}

const metricLabels: Record<MilestoneConfig["metric"], string> = {
  total_amount: "Total amount received",
  total_donations: "Total donations",
  donation_days: "Donation days",
  unique_supporters: "Unique supporters",
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function newMilestone(index: number): MilestoneConfig {
  return {
    id: `custom-${Date.now()}-${index}`,
    title: "New creator milestone",
    metric: "total_amount",
    target: 50000,
    reductionPercent: 1,
    expirationDays: 30,
    enabled: true,
    sortOrder: index * 10,
  }
}

export default function AdminRewardsPage() {
  const [config, setConfig] = useState<RewardsConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const loadConfig = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await adminRequest("/admin/rewards-config")
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not load rewards configuration.")
      }

      setConfig({
        ...defaultConfig,
        ...(payload?.config || {}),
        milestones: Array.isArray(payload?.config?.milestones) ? payload.config.milestones : [],
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load rewards configuration.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConfig()
  }, [])

  const updateField = <K extends keyof RewardsConfig>(key: K, value: RewardsConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  const updateMilestone = <K extends keyof MilestoneConfig>(
    index: number,
    key: K,
    value: MilestoneConfig[K],
  ) => {
    setConfig((current) => ({
      ...current,
      milestones: current.milestones.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }))
  }

  const saveConfig = async () => {
    setSaving(true)
    setError("")
    setMessage("")

    try {
      const response = await adminRequest("/admin/rewards-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not save rewards configuration.")
      }

      setConfig({
        ...defaultConfig,
        ...(payload?.config || {}),
        milestones: Array.isArray(payload?.config?.milestones) ? payload.config.milestones : [],
      })
      setMessage("Creator rewards configuration saved.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save rewards configuration.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-white">Loading rewards configuration...</div>
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">Admin controls</p>
        <h1 className="mt-2 text-3xl font-black text-white">Creator Rewards</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Configure fee reductions, referral rules, milestone requirements, and expiration periods without code changes.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <Label className="text-zinc-300">Default platform fee (%)</Label>
          <Input
            type="number"
            value={config.defaultPlatformFeePercent}
            onChange={(event) => updateField("defaultPlatformFeePercent", numberValue(event.target.value, 20))}
            className="mt-2 border-zinc-700 bg-zinc-950 text-white"
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <Label className="text-zinc-300">Minimum platform fee (%)</Label>
          <Input
            type="number"
            value={config.minimumPlatformFeePercent}
            onChange={(event) => updateField("minimumPlatformFeePercent", numberValue(event.target.value, 15))}
            className="mt-2 border-zinc-700 bg-zinc-950 text-white"
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <Label className="text-zinc-300">Default expiration (days)</Label>
          <Input
            type="number"
            value={config.rewardExpirationDays}
            onChange={(event) => updateField("rewardExpirationDays", numberValue(event.target.value, 30))}
            className="mt-2 border-zinc-700 bg-zinc-950 text-white"
          />
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-300" />
          <h2 className="text-xl font-bold text-white">Referral rewards</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div>
            <Label className="text-zinc-300">Qualifying donations (NGN)</Label>
            <Input
              type="number"
              value={config.referralQualifyingDonationAmount}
              onChange={(event) => updateField("referralQualifyingDonationAmount", numberValue(event.target.value, 10000))}
              className="mt-2 border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Reduction per referral (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={config.referralReductionPercent}
              onChange={(event) => updateField("referralReductionPercent", numberValue(event.target.value, 1))}
              className="mt-2 border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Referral cap (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={config.referralReductionCapPercent}
              onChange={(event) => updateField("referralReductionCapPercent", numberValue(event.target.value, 3))}
              className="mt-2 border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Milestone challenges</h2>
            <p className="mt-1 text-sm text-zinc-500">Requirements and reductions update immediately after saving.</p>
          </div>
          <Button
            type="button"
            className="bg-cyan-500 text-black hover:bg-cyan-400"
            onClick={() => updateField("milestones", [...config.milestones, newMilestone(config.milestones.length + 1)])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add milestone
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          {config.milestones.map((milestone, index) => (
            <div key={`${milestone.id}-${index}`} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.6fr_0.5fr_0.5fr_auto]">
                <div>
                  <Label className="text-zinc-300">Title</Label>
                  <Input
                    value={milestone.title}
                    onChange={(event) => updateMilestone(index, "title", event.target.value)}
                    className="mt-2 border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Metric</Label>
                  <Select value={milestone.metric} onValueChange={(value) => updateMilestone(index, "metric", value as MilestoneConfig["metric"])}>
                    <SelectTrigger className="mt-2 border-zinc-700 bg-zinc-900 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-900">
                      {Object.entries(metricLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-white focus:bg-zinc-800 focus:text-white">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-300">Target</Label>
                  <Input
                    type="number"
                    value={milestone.target}
                    onChange={(event) => updateMilestone(index, "target", numberValue(event.target.value, 1))}
                    className="mt-2 border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Reduction %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={milestone.reductionPercent}
                    onChange={(event) => updateMilestone(index, "reductionPercent", numberValue(event.target.value, 1))}
                    className="mt-2 border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Expires days</Label>
                  <Input
                    type="number"
                    value={milestone.expirationDays}
                    onChange={(event) => updateMilestone(index, "expirationDays", numberValue(event.target.value, config.rewardExpirationDays))}
                    className="mt-2 border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-zinc-800 px-3">
                    <Switch
                      checked={milestone.enabled}
                      onCheckedChange={(checked) => updateMilestone(index, "enabled", checked)}
                      className="data-[state=checked]:bg-cyan-500"
                    />
                    <span className="text-sm text-zinc-300">On</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                    onClick={() => updateField("milestones", config.milestones.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void saveConfig()}
          disabled={saving}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save rewards config"}
        </Button>
      </div>
    </div>
  )
}
