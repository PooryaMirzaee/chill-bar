import { motion } from 'framer-motion'
import type { Mood } from '../types'
import type { MoodDefinition, StoreCopy } from '@chill-bar/shared'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/layout/SectionHeader'

interface Props {
  moods: MoodDefinition[]
  copy: Pick<StoreCopy, 'moodEyebrow' | 'moodTitle' | 'moodDescription'>
  selected: Mood | null
  onSelect: (mood: Mood) => void
}

export function MoodPicker({ moods, copy, selected, onSelect }: Props) {
  return (
    <section>
      <SectionHeader
        eyebrow={copy.moodEyebrow}
        title={copy.moodTitle}
        description={copy.moodDescription}
      />

      <div className="grid grid-cols-3 gap-2.5 px-4 sm:grid-cols-6">
        {moods.map((mood, i) => (
          <motion.button
            key={mood.id}
            type="button"
            data-active={selected === mood.id}
            className={cn('atelier-mood-tile')}
            onClick={() => onSelect(mood.id)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.95 }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
              style={{ backgroundColor: `${mood.color}22` }}
            >
              {mood.emoji}
            </span>
            <span className="text-xs font-semibold">{mood.label}</span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
