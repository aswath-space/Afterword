import { useRef, useState } from 'react'
import { useGameStore } from '../store/appStore'
import { buildTimeline, type Beat } from './timeline'

// UI-side orchestrator: replays the last committed action's events as a beat
// sequence, gating input/curtain (via `presenting`) until every beat reports done
// (ANIM_DONE) or the user skips. Never uses a guessed timeout to advance.
//
// `presenting` is computed SYNCHRONOUSLY with the store commit (the queue is built
// during render when moveSeq changes, via the "adjust state during render" pattern)
// so there is no one-render lag between the move committing and presenting turning
// true — that lag would otherwise flash the hand-off curtain and let a move's new
// stamps be snapshotted as "pre-move".
export function useTurnAnimation(): { presenting: boolean; beat: Beat | null; onBeatDone: () => void; skip: () => void } {
  const moveSeq = useGameStore((s) => s.moveSeq)
  const lastEvents = useGameStore((s) => s.lastEvents)
  const seen = useRef(0)
  const queueRef = useRef<Beat[]>([])
  const [index, setIndex] = useState(0)

  if (moveSeq !== seen.current) {
    seen.current = moveSeq
    queueRef.current = moveSeq === 0 ? [] : buildTimeline(lastEvents)
    setIndex(0) // adjust-state-during-render: React re-renders with index 0 before committing
  }

  const queue = queueRef.current
  const presenting = index < queue.length
  const beat = presenting ? queue[index] : null
  const onBeatDone = () => setIndex((i) => Math.min(i + 1, queueRef.current.length))
  const skip = () => setIndex(queueRef.current.length)

  return { presenting, beat, onBeatDone, skip }
}
