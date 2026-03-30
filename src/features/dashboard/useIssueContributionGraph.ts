import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types'
import {
  buildIssueContributionGraph,
  getIssueContributionRange,
  isDateWithinContributionRange,
  type ContributionWeek,
} from './issueContributionGraph'

type IssueContributionRecord = Pick<Database['public']['Tables']['issues']['Row'], 'id' | 'created_at'>

export interface IssueContributionGraphState {
  weeks: ContributionWeek[]
  totalCount: number
  maxCount: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useIssueContributionGraph(): IssueContributionGraphState {
  const [records, setRecords] = useState<IssueContributionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIssueContributions = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)

    const { startDate, endDate } = getIssueContributionRange()
    const rangeEnd = new Date(endDate)
    rangeEnd.setDate(rangeEnd.getDate() + 1)

    const { data, error: queryError } = await supabase
      .from('issues')
      .select('id, created_at')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', rangeEnd.toISOString())
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setRecords([])
      setLoading(false)
      return
    }

    setRecords((data ?? []) as IssueContributionRecord[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchIssueContributions()

    const channel = supabase
      .channel('issue_contribution_graph')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'issues' }, (payload) => {
        const issue = payload.new as IssueContributionRecord
        if (!isDateWithinContributionRange(new Date(issue.created_at))) return

        setRecords((current) => {
          if (current.some((record) => record.id === issue.id)) return current
          return [...current, issue]
        })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchIssueContributions])

  const graph = useMemo(() => buildIssueContributionGraph(records), [records])

  return {
    ...graph,
    loading,
    error,
    refetch: fetchIssueContributions,
  }
}
