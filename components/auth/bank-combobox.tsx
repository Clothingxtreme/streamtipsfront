"use client"

import { useMemo, useState } from "react"
import { Building2, Check, ChevronsUpDown, LoaderCircle, RotateCw } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type BankOption = {
  name: string
  code: string
}

type BankComboboxProps = {
  id?: string
  banks: BankOption[]
  status: "loading" | "ready" | "error"
  /** Selected bank code. */
  value: string
  onChange: (bank: BankOption) => void
  onRetry?: () => void
  invalid?: boolean
  disabled?: boolean
  describedBy?: string
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Filters by bank name (exact or partial, any word order). Results whose name starts with the
 * query come first, then names with a word starting with the query, then other matches, while
 * keeping the order supplied by the API inside each group.
 */
export function filterBanks(banks: BankOption[], query: string) {
  const needle = normalize(query)
  if (!needle) return banks

  const tokens = needle.split(" ")
  const ranked: Array<{ bank: BankOption; rank: number; index: number }> = []

  banks.forEach((bank, index) => {
    const name = normalize(bank.name)
    const matchesName = tokens.every((token) => name.includes(token))
    const matchesCode = bank.code.toLowerCase() === needle
    if (!matchesName && !matchesCode) return

    let rank = 3
    if (name.startsWith(needle)) rank = 0
    else if (` ${name}`.includes(` ${needle}`)) rank = 1
    else if (matchesName) rank = 2
    ranked.push({ bank, rank, index })
  })

  return ranked
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.bank)
}

export function BankCombobox({
  id,
  banks,
  status,
  value,
  onChange,
  onRetry,
  invalid,
  disabled,
  describedBy,
}: BankComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedBank = useMemo(() => banks.find((bank) => bank.code === value), [banks, value])
  const results = useMemo(() => filterBanks(banks, query), [banks, query])

  if (status === "error") {
    return (
      <div
        id={id}
        className="flex h-11 items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/[0.06] px-3.5 text-sm text-red-200"
        aria-describedby={describedBy}
      >
        <span>We couldn&apos;t load the bank list.</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-purple-400/60"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  const isLoading = status === "loading"

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled || isLoading}
          className={cn(
            "flex h-11 w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-left text-base outline-none transition-[border-color,box-shadow,background-color] md:text-sm",
            "hover:border-white/20 focus-visible:border-purple-400/60 focus-visible:ring-[3px] focus-visible:ring-purple-500/20",
            "disabled:cursor-not-allowed disabled:opacity-60",
            open && "border-purple-400/60 ring-[3px] ring-purple-500/20",
            invalid && "border-red-400/60 ring-[3px] ring-red-500/15",
          )}
        >
          {isLoading ? (
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-zinc-500" aria-hidden />
          ) : (
            <Building2 className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          )}
          <span className={cn("min-w-0 flex-1 truncate", selectedBank ? "text-white" : "text-zinc-500")}>
            {isLoading ? "Loading banks…" : selectedBank ? selectedBank.name : "Search or select your bank"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border-white/10 bg-zinc-950 p-0 text-white shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
      >
        <Command
          shouldFilter={false}
          className="bg-transparent text-white [&_[data-slot=command-input-wrapper]]:h-11 [&_[data-slot=command-input-wrapper]]:border-white/10 [&_[data-slot=command-input-wrapper]]:px-3.5"
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Type a bank name…"
            aria-label="Search banks"
            className="text-base text-white placeholder:text-zinc-500 md:text-sm"
          />
          <CommandList className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height,18rem)-3.5rem))] overscroll-contain">
            <CommandEmpty className="px-4 py-6 text-center text-sm text-zinc-400">
              No bank matches &ldquo;{query.trim()}&rdquo;.
            </CommandEmpty>
            {results.length ? (
              <CommandGroup className="p-1.5 text-white">
                {results.map((bank) => {
                  const isSelected = bank.code === value
                  return (
                    <CommandItem
                      key={`${bank.code}-${bank.name}`}
                      value={`${bank.code}::${bank.name}`}
                      onSelect={() => {
                        onChange(bank)
                        setOpen(false)
                        setQuery("")
                      }}
                      className="min-h-10 cursor-pointer rounded-lg px-2.5 py-2 text-white data-[selected=true]:bg-white/[0.07] data-[selected=true]:text-white"
                    >
                      <span className="min-w-0 flex-1 truncate">{bank.name}</span>
                      {isSelected ? <Check className="h-4 w-4 text-purple-300" aria-hidden /> : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : null}
          </CommandList>
          <div className="border-t border-white/10 px-3.5 py-2 text-xs text-zinc-500">
            {query.trim()
              ? `${results.length} of ${banks.length} banks`
              : `${banks.length} supported banks`}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
