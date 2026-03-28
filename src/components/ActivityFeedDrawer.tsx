import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import ActivityFeed from '@/features/admin/ActivityFeed'

interface ActivityFeedDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ActivityFeedDrawer({ open, onOpenChange }: ActivityFeedDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay
          forceMount
          className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
        />
        <Dialog.Content
          forceMount
          className="fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-[100vw] flex-col border-l bg-background shadow-xl transition-transform duration-300 ease-in-out data-[state=closed]:translate-x-full data-[state=open]:translate-x-0"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <Dialog.Title className="text-sm font-semibold">Actividad en vivo</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Cerrar feed"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <ActivityFeed variant="drawer" channelName="activity_feed_drawer" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
