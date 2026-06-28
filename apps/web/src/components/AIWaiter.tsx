import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { MenuItem, ContextData } from '../types'
import type { Mood } from '../types'
import type { AiChatMessage } from '@chill-bar/shared'
import { formatPrice } from '../lib/comboBuilder'
import { apiClient } from '../lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
  items?: MenuItem[]
}

import type { AddToCartHandler } from '../lib/cartFeedback'

interface Props {
  items: MenuItem[]
  ctx: ContextData
  onAdd: AddToCartHandler
  isOpen: boolean
  onClose: () => void
  moodTrigger?: Mood | null
  storeName?: string
  storeSubtitle?: string
}

const QUICK_PROMPTS_FALLBACK = ['چی پیشنهاد می‌دی؟']

function mapItemIds(ids: string[], items: MenuItem[]): MenuItem[] {
  const map = new Map(items.map((i) => [i.id, i]))
  return ids.map((id) => map.get(id)).filter((i): i is MenuItem => !!i)
}

export function AIWaiter({
  items,
  ctx,
  onAdd,
  isOpen,
  onClose,
  moodTrigger,
  storeName,
  storeSubtitle,
}: Props) {
  const { data: aiConfig } = useQuery({
    queryKey: ['ai-config'],
    queryFn: apiClient.getAiConfig,
    staleTime: 60_000,
  })

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const moodHandled = useRef<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      moodHandled.current = null
      return
    }
    if (aiConfig) {
      const welcome = aiConfig.welcomeMessage ?? 'سلام! چطور می‌تونم کمکتون کنم؟'
      setMessages([{ role: 'assistant', text: welcome }])
      setError(null)
    }
  }, [isOpen, aiConfig])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const buildHistory = (msgs: ChatMsg[]): AiChatMessage[] =>
    msgs
      .filter((m) => m.text.trim())
      .map((m) => ({ role: m.role, content: m.text }))

  const askAi = useCallback(
    async (text: string, currentMessages: ChatMsg[]) => {
      setTyping(true)
      setError(null)
      try {
        const res = await apiClient.chatWithAi({
          message: text,
          history: buildHistory(currentMessages),
          context: {
            hour: ctx.hour,
            timeOfDay: ctx.timeOfDay,
            weather: ctx.weather
              ? {
                  temperature: ctx.weather.temperature,
                  description: ctx.weather.description,
                  icon: ctx.weather.icon,
                  location: ctx.weather.location,
                }
              : null,
            mood: ctx.mood,
            storeName,
            storeSubtitle,
          },
        })

        const suggested = mapItemIds(res.itemIds, items)
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: res.reply, items: suggested.length ? suggested : undefined },
        ])
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در ارتباط با گارسون هوشمند'
        setError(msg)
        toast.error(msg)
      } finally {
        setTyping(false)
      }
    },
    [ctx, items, storeName, storeSubtitle],
  )

  const send = (text: string) => {
    if (!text.trim() || typing) return
    const userMsg: ChatMsg = { role: 'user', text: text.trim() }
    setMessages((m) => {
      const next = [...m, userMsg]
      void askAi(text.trim(), m)
      return next
    })
    setInput('')
  }

  useEffect(() => {
    if (!moodTrigger || !isOpen || !aiConfig?.enabled) return
    if (moodHandled.current === moodTrigger) return
    moodHandled.current = moodTrigger
    const prompt = aiConfig?.moodPrompts?.[moodTrigger]
    if (prompt) send(prompt)
  }, [moodTrigger, isOpen, aiConfig?.enabled, aiConfig?.moodPrompts])

  useEffect(() => {
    if (!isOpen) moodHandled.current = null
  }, [isOpen])

  const assistantLabel = aiConfig?.assistantName ?? 'گارسون هوشمند'
  const assistantEmoji = aiConfig?.assistantEmoji ?? '🤖'

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="flex h-[85dvh] flex-col rounded-t-2xl px-0">
        <SheetHeader className="border-b px-6 py-4 text-start">
          <SheetTitle className="flex items-center gap-2">
            <span>{assistantEmoji}</span>
            {assistantLabel}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {aiConfig?.enabled ? `آنلاین · ${aiConfig.onlineStatusLabel}` : 'غیرفعال'}
          </SheetDescription>
        </SheetHeader>

        {!aiConfig?.enabled ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm">{aiConfig?.disabledMessage ?? 'گارسون هوشمند غیرفعال است'}</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                      msg.role === 'user'
                        ? 'ms-auto bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    {msg.items && msg.items.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-start text-xs transition-colors hover:bg-accent"
                            onClick={(e) => onAdd(item, e)}
                          >
                            <span>{item.emoji}</span>
                            <span className="min-w-0 flex-1 font-medium">{item.name}</span>
                            <span className="shrink-0 text-primary">{formatPrice(item.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className="flex w-fit gap-1 rounded-2xl bg-muted px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                )}
                {error && (
                  <p className="text-center text-xs text-destructive">{error}</p>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="flex gap-2 overflow-x-auto px-4 pb-2">
              {(aiConfig?.quickPrompts?.length ? aiConfig.quickPrompts : QUICK_PROMPTS_FALLBACK).map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="shrink-0 cursor-pointer px-3 py-1.5 hover:bg-accent"
                  onClick={() => send(p)}
                >
                  {p}
                </Badge>
              ))}
            </div>

            <form
              className="flex gap-2 border-t p-4"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={aiConfig?.inputPlaceholder ?? 'از منو بپرس...'}
                className="flex-1"
                disabled={typing}
              />
              <Button type="submit" size="icon" disabled={typing || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
