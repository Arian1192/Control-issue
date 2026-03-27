import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Database, IssueStatus, IssuePriority } from '@/types'

type Issue = Database['public']['Tables']['issues']['Row']
type IssueInsert = Database['public']['Tables']['issues']['Insert']

interface IssueFilters {
  status?: IssueStatus
  priority?: IssuePriority
  assignedTo?: string
  search?: string
}

export function useIssues(filters?: IssueFilters) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('issues').select('*').order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.priority) query = query.eq('priority', filters.priority)
    if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query
    if (error) setError(error.message)
    else setIssues(data ?? [])
    setLoading(false)
  }, [filters?.status, filters?.priority, filters?.assignedTo, filters?.search])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  async function createIssue(payload: Omit<IssueInsert, 'created_by'>) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await supabase
      .from('issues')
      .insert({ ...payload, created_by: user.id })

    if (!error) fetchIssues()
    return { error }
  }

  async function updateIssue(id: string, updates: Database['public']['Tables']['issues']['Update']) {
    const { error } = await supabase.from('issues').update(updates).eq('id', id)
    if (!error) fetchIssues()
    return { error }
  }

  return { issues, loading, error, createIssue, updateIssue, refetch: fetchIssues }
}
