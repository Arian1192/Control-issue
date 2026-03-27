import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  body: string
  sender_id: string
  sender_name: string
  created_at: string
}

interface SessionChatProps {
  sessionId: string
  userId: string
  userName: string
}

export function SessionChat({ sessionId, userId, userName }: SessionChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`session_chat:${sessionId}`)
      .on('broadcast', { event: 'chat' }, ({ payload }: { payload: Message }) => {
        setMessages((prev) => [...prev, payload])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage() {
    if (!input.trim()) return
    const msg: Message = {
      id: crypto.randomUUID(),
      body: input.trim(),
      sender_id: userId,
      sender_name: userName,
      created_at: new Date().toISOString(),
    }
    supabase.channel(`session_chat:${sessionId}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    })
    setMessages((prev) => [...prev, msg])
    setInput('')
  }

  return (
    <div className="flex h-64 flex-col rounded-lg border bg-card">
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Chat de sesión</div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col', m.sender_id === userId ? 'items-end' : 'items-start')}>
            <span className="text-xs text-muted-foreground">{m.sender_name}</span>
            <span
              className={cn(
                'max-w-[80%] rounded-lg px-3 py-1.5 text-sm',
                m.sender_id === userId ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              {m.body}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
