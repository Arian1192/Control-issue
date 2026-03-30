import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueContributionGraph } from './useIssueContributionGraph'
import {
  ISSUE_CONTRIBUTION_DAY_LABELS,
  type ContributionDay,
  type ContributionLevel,
} from './issueContributionGraph'

const LEVEL_STYLES: Record<ContributionLevel, string> = {
  0: 'border-border/70 bg-muted/40',
  1: 'border-emerald-200/80 bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/30',
  2: 'border-emerald-300/80 bg-emerald-200 dark:border-emerald-800/80 dark:bg-emerald-900/50',
  3: 'border-emerald-400/80 bg-emerald-400 dark:border-emerald-700/90 dark:bg-emerald-700/80',
  4: 'border-emerald-500/90 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500',
}

function formatTooltip(day: ContributionDay): string {
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(`${day.date}T00:00:00`))
    .replace('.', '')

  const label = day.count === 1 ? 'incidencia' : 'incidencias'
  return `${day.count} ${label} · ${formattedDate}`
}

function renderSkeleton(): ReactNode {
  return (
    <div className="space-y-4">
      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      <div className="contribution-scroll overflow-x-auto pb-1">
        <div className="inline-flex min-w-max gap-2 md:min-w-0 md:w-full md:justify-center">
          <div className="grid grid-rows-7 gap-1 pt-5">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-3 w-3 rounded bg-transparent" />
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex gap-1 md:gap-0.5">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="h-3 w-6 animate-pulse rounded bg-muted" />
              ))}
            </div>
            <div className="flex gap-1 md:gap-0.5">
              {Array.from({ length: 53 }).map((_, columnIndex) => (
                <div key={columnIndex} className="grid grid-rows-7 gap-1">
                  {Array.from({ length: 7 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="h-3 w-3 animate-pulse rounded-sm bg-muted" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function IssueContributionGraph() {
  const { weeks, totalCount, loading, error, refetch } = useIssueContributionGraph()
  const hasIncidents = totalCount > 0

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Incidencias creadas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} incidencias en las últimas 52 semanas
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          Tendencia anual
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {loading && renderSkeleton()}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">No se pudo cargar el gráfico.</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="contribution-scroll overflow-x-auto pb-1">
              <div className="inline-flex min-w-max gap-2 rounded-lg border border-dashed border-border/80 bg-muted/10 p-3 md:min-w-0 md:w-full md:justify-center">
                <div className="grid grid-rows-7 gap-1 pt-5 text-[10px] font-medium text-muted-foreground">
                  {ISSUE_CONTRIBUTION_DAY_LABELS.map((label, index) => (
                    <div key={`${label}-${index}`} className="flex h-3 w-3 items-center justify-center">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex h-3 gap-1 pl-px pr-1 md:h-2.5 md:gap-0.5">
                    {weeks.map((week, index) => (
                      <div key={`month-${index}`} className="w-3 md:w-2.5">
                        {week.monthLabel && (
                          <span className="block whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                            {week.monthLabel}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1 md:gap-0.5">
                    {weeks.map((week, weekIndex) => (
                      <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                        {week.days.map((day, dayIndex) => {
                          if (!day) {
                            return <div key={`empty-${dayIndex}`} className="h-3 w-3 rounded-sm opacity-0 md:h-2.5 md:w-2.5" />
                          }

                          const tooltip = formatTooltip(day)

                          return (
                            <div
                              key={day.date}
                              title={tooltip}
                              aria-label={tooltip}
                              className={cn(
                                'h-3 w-3 rounded-[3px] border transition-transform hover:scale-110 md:h-2.5 md:w-2.5',
                                LEVEL_STYLES[day.level],
                                day.isToday && 'ring-1 ring-primary/50 ring-offset-1 ring-offset-background'
                              )}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {!hasIncidents && (
              <p className="text-sm text-muted-foreground">
                Sin incidencias creadas en el período.
              </p>
            )}

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Cada celda representa la cantidad de incidencias creadas en un día.
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={cn('h-3 w-3 rounded-[3px] border', LEVEL_STYLES[level as ContributionLevel])}
                    />
                  ))}
                </div>
                <span>Más</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
