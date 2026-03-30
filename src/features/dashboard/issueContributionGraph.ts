export type ContributionLevel = 0 | 1 | 2 | 3 | 4

export interface ContributionDay {
  date: string
  count: number
  level: ContributionLevel
  isToday: boolean
}

export interface ContributionWeek {
  monthLabel?: string
  days: Array<ContributionDay | null>
}

export interface IssueContributionGraphData {
  weeks: ContributionWeek[]
  totalCount: number
  maxCount: number
}

interface IssueContributionRecord {
  created_at: string
}

const DAYS_PER_WEEK = 7
const GRAPH_WEEKS = 52
const GRAPH_DAYS = GRAPH_WEEKS * DAYS_PER_WEEK

export const ISSUE_CONTRIBUTION_DAY_LABELS = ['', 'L', '', 'X', '', 'V', '']

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function getContributionLevel(count: number, maxCount: number): ContributionLevel {
  if (count <= 0 || maxCount <= 0) return 0
  return Math.max(1, Math.ceil((count / maxCount) * 4)) as ContributionLevel
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', { month: 'short' })
    .format(date)
    .replace('.', '')
}

function createContributionDay(date: Date, count: number, todayKey: string, maxCount: number): ContributionDay {
  const dateKey = formatDateKey(date)

  return {
    date: dateKey,
    count,
    level: getContributionLevel(count, maxCount),
    isToday: dateKey === todayKey,
  }
}

function getMonthLabel(week: ContributionWeek, previousWeek?: ContributionWeek): string | undefined {
  const firstRealDay = week.days.find((day) => day !== null)
  if (!firstRealDay) return undefined

  const currentDate = new Date(`${firstRealDay.date}T00:00:00`)

  if (!previousWeek) {
    return formatMonthLabel(currentDate)
  }

  const previousRealDay = previousWeek.days.find((day) => day !== null)
  if (!previousRealDay) return formatMonthLabel(currentDate)

  const previousDate = new Date(`${previousRealDay.date}T00:00:00`)
  if (
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getFullYear() !== previousDate.getFullYear()
  ) {
    return formatMonthLabel(currentDate)
  }

  return undefined
}

export function getIssueContributionRange(today = new Date()): { startDate: Date; endDate: Date } {
  const endDate = startOfLocalDay(today)
  const startDate = addDays(endDate, -(GRAPH_DAYS - 1))

  return { startDate, endDate }
}

export function isDateWithinContributionRange(date: Date, today = new Date()): boolean {
  const { startDate, endDate } = getIssueContributionRange(today)
  const normalizedDate = startOfLocalDay(date)

  return normalizedDate >= startDate && normalizedDate <= endDate
}

export function buildIssueContributionGraph(
  records: IssueContributionRecord[],
  today = new Date()
): IssueContributionGraphData {
  const { startDate, endDate } = getIssueContributionRange(today)
  const todayKey = formatDateKey(startOfLocalDay(today))
  const countsByDate = new Map<string, number>()

  for (const record of records) {
    const createdAt = new Date(record.created_at)
    if (!isDateWithinContributionRange(createdAt, today)) continue

    const dateKey = formatDateKey(startOfLocalDay(createdAt))
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1)
  }

  const totalCount = Array.from(countsByDate.values()).reduce((sum, count) => sum + count, 0)
  const maxCount = Math.max(0, ...countsByDate.values())

  const days: Array<ContributionDay | null> = []
  const leadingPadding = getWeekdayIndex(startDate)
  const trailingPadding = DAYS_PER_WEEK - getWeekdayIndex(endDate) - 1

  for (let i = 0; i < leadingPadding; i += 1) {
    days.push(null)
  }

  for (let offset = 0; offset < GRAPH_DAYS; offset += 1) {
    const currentDate = addDays(startDate, offset)
    const dateKey = formatDateKey(currentDate)
    const count = countsByDate.get(dateKey) ?? 0
    days.push(createContributionDay(currentDate, count, todayKey, maxCount))
  }

  for (let i = 0; i < trailingPadding; i += 1) {
    days.push(null)
  }

  const weeks: ContributionWeek[] = []

  for (let index = 0; index < days.length; index += DAYS_PER_WEEK) {
    weeks.push({ days: days.slice(index, index + DAYS_PER_WEEK) })
  }

  const weeksWithLabels = weeks.map((week, index) => ({
    ...week,
    monthLabel: getMonthLabel(week, weeks[index - 1]),
  }))

  return {
    weeks: weeksWithLabels,
    totalCount,
    maxCount,
  }
}
