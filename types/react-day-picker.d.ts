declare module "react-day-picker" {
  import * as React from "react"

  export type ClassNames = Record<string, string>
  export type Modifiers = Record<string, boolean>

  export interface CalendarDay {
    date: Date
  }

  export interface DayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    day: CalendarDay
    modifiers: Modifiers
  }

  export const DayButton: React.ComponentType<DayButtonProps>

  export interface DayPickerProps extends React.HTMLAttributes<HTMLDivElement> {
    captionLayout?: string
    classNames?: Partial<ClassNames>
    components?: Record<string, React.ComponentType<any>>
    formatters?: Record<string, (date: Date) => React.ReactNode>
    mode?: string
    month?: Date
    onMonthChange?: (month: Date) => void
    onSelect?: (...args: any[]) => void
    selected?: unknown
    showOutsideDays?: boolean
  }

  export const DayPicker: React.ComponentType<DayPickerProps>

  export function getDefaultClassNames(): ClassNames
}
