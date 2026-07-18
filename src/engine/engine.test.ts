import { describe, it, expect } from 'vitest'
import { createGame } from './engine'
import { createSetDictionary } from '../dictionary/dictionary'
import type { GameConfig, PendingEscape } from './types'

const dict = createSetDictionary(
  ['CARD', 'DREAM', 'MORE', 'ENTRY', 'DOG', 'RAT', 'TAR', 'ARC', 'CAT'],
  'test-v1',
)

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    players: [
      { id: 'p1', name: 'Ana', color: 'red', emblem: 'star' },
      { id: 'p2', name: 'Ben', color: 'blue', emblem: 'moon' },
    ],
    boardLength: 50,
    timer: 'off',
    seed: 'test-seed',
    ...overrides,
  }
}

describe('createGame', () => {
  it('starts all players on square 0', () => {
    const state = createGame(config(), dict)
    expect(state.players.every((p) => p.square === 0)).toBe(true)
  })

  it('starts on player 0 with no required letter and awaiting a word', () => {
    const state = createGame(config(), dict)
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.requiredLetter).toBeNull()
    expect(state.phase).toBe('awaiting-word')
    expect(state.usedWords).toEqual([])
    expect(state.winnerId).toBeNull()
  })

  it('records the dictionary version and a valid board', () => {
    const state = createGame(config(), dict)
    expect(state.dictVersion).toBe('test-v1')
    expect(state.board.length).toBe(50)
  })
})

import { submitWord } from './submitWord'

// A game on a board with NO snakes or ladders, for tests that assert
// clean square-by-square movement (the generated board's topology is random).
function cleanGame(overrides: Partial<GameConfig> = {}) {
  const g = createGame(config(overrides), dict)
  return { ...g, board: { ...g.board, snakes: [], ladders: [] } }
}

describe('submitWord — validation', () => {
  it('rejects words shorter than 3 letters', () => {
    const s = createGame(config(), dict)
    const r = submitWord(s, 'DO', dict)
    expect(r).toEqual({ ok: false, reason: 'too-short' })
  })

  it('rejects a non-dictionary word', () => {
    const s = createGame(config(), dict)
    const r = submitWord(s, 'ZZZZ', dict)
    expect(r).toEqual({ ok: false, reason: 'not-a-word' })
  })

  it('allows any starting letter on the first move (no required letter)', () => {
    const s = createGame(config(), dict)
    const r = submitWord(s, 'CARD', dict)
    expect(r.ok).toBe(true)
  })

  it('enforces the chain letter after the first move', () => {
    const s = cleanGame()
    const r1 = submitWord(s, 'CARD', dict)
    if (!r1.ok) throw new Error('setup failed')
    // CARD ends in D; DOG is valid, RAT is wrong start letter
    expect(submitWord(r1.next, 'RAT', dict)).toEqual({ ok: false, reason: 'wrong-start-letter' })
    expect(submitWord(r1.next, 'DOG', dict).ok).toBe(true)
  })

  it('rejects a repeated word', () => {
    const s = cleanGame()
    const r1 = submitWord(s, 'CARD', dict)
    if (!r1.ok) throw new Error('setup failed')
    const r2 = submitWord(r1.next, 'DREAM', dict)
    if (!r2.ok) throw new Error('setup failed')
    const r3 = submitWord(r2.next, 'MORE', dict)
    if (!r3.ok) throw new Error('setup failed')
    const r4 = submitWord(r3.next, 'ENTRY', dict)
    if (!r4.ok) throw new Error('setup failed')
    expect(r4.next.usedWords).toContain('ENTRY')
    // Attempt to reuse an already-used word (CARD) — craft the required letter directly:
    const reused = submitWord({ ...r4.next, requiredLetter: 'C' }, 'CARD', dict)
    expect(reused).toEqual({ ok: false, reason: 'already-used' })
  })

  it('rejects submitting during the wrong phase', () => {
    const s = createGame(config(), dict)
    const r = submitWord({ ...s, phase: 'won' }, 'CARD', dict)
    expect(r).toEqual({ ok: false, reason: 'wrong-phase' })
  })
})

describe('submitWord — movement & events', () => {
  it('advances one square per letter and passes the turn', () => {
    const s = cleanGame()
    const r = submitWord(s, 'CARD', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[0].square).toBe(4)
    expect(r.next.currentPlayerIndex).toBe(1)
    expect(r.next.requiredLetter).toBe('D')
    expect(r.next.usedWords).toEqual(['CARD'])
    expect(r.events.some((e) => e.type === 'MOVE' && e.to === 4)).toBe(true)
    expect(r.events.some((e) => e.type === 'TURN')).toBe(true)
  })

  it('climbs a ladder landed on exactly', () => {
    const base = createGame(config(), dict)
    const s = { ...base, board: { ...base.board, ladders: [{ foot: 4, top: 20 }], snakes: [] } }
    const r = submitWord(s, 'CARD', dict) // length 4 -> lands on 4 -> ladder to 20
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[0].square).toBe(20)
    expect(r.events.some((e) => e.type === 'LADDER' && e.top === 20)).toBe(true)
  })

  it('enters the escape phase when landing on a snake head (no turn pass yet)', () => {
    const base = createGame(config(), dict)
    const s = { ...base, board: { ...base.board, ladders: [], snakes: [{ head: 4, tail: 1 }] } }
    const r = submitWord(s, 'CARD', dict) // lands on 4 -> snake head
    if (!r.ok) throw new Error('rejected')
    expect(r.next.phase).toBe('awaiting-escape')
    expect(r.next.currentPlayerIndex).toBe(0) // turn did NOT advance
    expect(r.next.pendingEscape).toEqual({ playerId: 'p1', fromSquare: 4, drop: 3, toSquare: 1, need: 3 })
    expect(r.next.players[0].square).toBe(4)
    expect(r.events.some((e) => e.type === 'ESCAPE_START' && e.drop === 3)).toBe(true)
  })

  it('wins by reaching or passing the final square', () => {
    const base = createGame(config({ boardLength: 30 }), dict)
    const s = {
      ...base,
      board: { ...base.board, ladders: [], snakes: [] },
      players: [{ ...base.players[0], square: 27 }, base.players[1]],
    }
    const r = submitWord(s, 'CARD', dict) // 27 + 4 = 31 >= 30
    if (!r.ok) throw new Error('rejected')
    expect(r.next.phase).toBe('won')
    expect(r.next.winnerId).toBe('p1')
    expect(r.next.players[0].square).toBe(30)
    expect(r.events.some((e) => e.type === 'WIN' && e.playerId === 'p1')).toBe(true)
  })
})

import { resolveSnakeEscape } from './resolveSnakeEscape'

function snakeState() {
  const base = createGame(config(), dict)
  const s = { ...base, board: { ...base.board, ladders: [], snakes: [{ head: 4, tail: 1 }] } }
  const r = submitWord(s, 'CARD', dict) // land on snake head 4, drop 3
  if (!r.ok) throw new Error('setup failed')
  return r.next // phase awaiting-escape, pendingEscape {drop:3, fromSquare:4, toSquare:1}
}

describe('resolveSnakeEscape', () => {
  it('escapes with a word whose length >= the drop, staying on the head', () => {
    const s = snakeState() // drop 3
    const r = resolveSnakeEscape(s, 'DOG', dict) // length 3 >= 3, any start letter
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[0].square).toBe(4) // stayed on head
    expect(r.next.phase).toBe('awaiting-word')
    expect(r.next.currentPlayerIndex).toBe(1) // turn passed
    expect(r.next.usedWords).toContain('DOG')
    expect(r.next.requiredLetter).toBe('D') // unchanged from CARD's last letter
    expect(r.events.some((e) => e.type === 'ESCAPE_SUCCESS')).toBe(true)
  })

  it('rejects a rescue word shorter than the drop', () => {
    const s = snakeState() // awaiting-escape, drop 3
    const bigDrop = { ...s, pendingEscape: { ...s.pendingEscape!, drop: 5, need: 5 } }
    const r = resolveSnakeEscape(bigDrop, 'DOG', dict) // length 3 >= min 3, but 3 < need 5
    expect(r).toEqual({ ok: false, reason: 'rescue-too-short' })
  })

  it('slides to the tail on timeout / give up (null)', () => {
    const s = snakeState()
    const r = resolveSnakeEscape(s, null, dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[0].square).toBe(1) // slid to tail
    expect(r.next.phase).toBe('awaiting-word')
    expect(r.next.currentPlayerIndex).toBe(1)
    expect(r.events.some((e) => e.type === 'ESCAPE_FAIL' && e.tail === 1)).toBe(true)
  })

  it('rejects an already-used rescue word without consuming a turn', () => {
    const s = snakeState()
    const r = resolveSnakeEscape({ ...s, usedWords: [...s.usedWords] }, 'CARD', dict)
    expect(r).toEqual({ ok: false, reason: 'already-used' })
  })

  it('rejects calling escape in the wrong phase', () => {
    const s = createGame(config(), dict)
    expect(resolveSnakeEscape(s, 'DOG', dict)).toEqual({ ok: false, reason: 'wrong-phase' })
  })
})

import { useStuck, forfeitTurn } from './useStuck'
import { createEngine } from './engine'

describe('useStuck', () => {
  it('advances 0, resets the chain letter, and ignores the required letter', () => {
    const base = cleanGame()
    const r1 = submitWord(base, 'CARD', dict) // required letter now 'D'
    if (!r1.ok) throw new Error('setup failed')
    // p2 is stuck on 'D' but plays RAT (starts with R) as a stuck word
    const r = useStuck(r1.next, 'RAT', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[1].square).toBe(0) // advanced 0
    expect(r.next.requiredLetter).toBe('T') // reset to RAT's last letter
    expect(r.next.currentPlayerIndex).toBe(0) // turn passed
    expect(r.next.usedWords).toContain('RAT')
    expect(r.events.some((e) => e.type === 'STUCK')).toBe(true)
  })

  it('still rejects an invalid stuck word', () => {
    const s = createGame(config(), dict)
    expect(useStuck(s, 'ZZ', dict)).toEqual({ ok: false, reason: 'too-short' })
    expect(useStuck(s, 'ZZZZ', dict)).toEqual({ ok: false, reason: 'not-a-word' })
  })
})

describe('forfeitTurn', () => {
  it('advances 0 and leaves the required letter unchanged', () => {
    const base = cleanGame()
    const r1 = submitWord(base, 'CARD', dict) // required letter 'D'
    if (!r1.ok) throw new Error('setup failed')
    const r = forfeitTurn(r1.next)
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[1].square).toBe(0)
    expect(r.next.requiredLetter).toBe('D') // unchanged
    expect(r.next.currentPlayerIndex).toBe(0)
    expect(r.events.some((e) => e.type === 'STUCK')).toBe(true)
  })
})

describe('createEngine integration', () => {
  it('plays a full chain turn through the bound engine', () => {
    const engine = createEngine(dict)
    const state = engine.createGame(config())
    const r = engine.submitWord(state, 'CARD')
    expect(r.ok).toBe(true)
  })
})

describe('event ordering (engine → UI contract)', () => {
  it('normal move → [MOVE, TURN]', () => {
    const r = submitWord(cleanGame(), 'CARD', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.events.map((e) => e.type)).toEqual(['MOVE', 'TURN'])
  })

  it('ladder → [MOVE, LADDER, TURN]', () => {
    const base = createGame(config(), dict)
    const s = { ...base, board: { ...base.board, ladders: [{ foot: 4, top: 20 }], snakes: [] } }
    const r = submitWord(s, 'CARD', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.events.map((e) => e.type)).toEqual(['MOVE', 'LADDER', 'TURN'])
  })

  it('snake landing → [MOVE, ESCAPE_START] (no TURN yet)', () => {
    const base = createGame(config(), dict)
    const s = { ...base, board: { ...base.board, ladders: [], snakes: [{ head: 4, tail: 1 }] } }
    const r = submitWord(s, 'CARD', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.events.map((e) => e.type)).toEqual(['MOVE', 'ESCAPE_START'])
  })

  it('win → [MOVE, WIN]', () => {
    const base = createGame(config({ boardLength: 30 }), dict)
    const s = { ...base, board: { ...base.board, ladders: [], snakes: [] }, players: [{ ...base.players[0], square: 27 }, base.players[1]] }
    const r = submitWord(s, 'CARD', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.events.map((e) => e.type)).toEqual(['MOVE', 'WIN'])
  })

  it('win MOVE event has squares === to - from (no overshoot mismatch)', () => {
    const base = createGame(config({ boardLength: 30 }), dict)
    const s = { ...base, board: { ...base.board, ladders: [], snakes: [] }, players: [{ ...base.players[0], square: 27 }, base.players[1]] }
    const r = submitWord(s, 'CARD', dict)
    if (!r.ok) throw new Error('rejected')
    const move = r.events.find((e) => e.type === 'MOVE')
    if (!move || move.type !== 'MOVE') throw new Error('no move event')
    expect(move.to - move.from).toBe(move.squares)
    expect(move.squares).toBe(3)
  })

  it('escape success → [ESCAPE_SUCCESS, TURN]', () => {
    const r = resolveSnakeEscape(snakeState(), 'DOG', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.events.map((e) => e.type)).toEqual(['ESCAPE_SUCCESS', 'TURN'])
  })

  it('escape fail → [ESCAPE_FAIL, TURN]', () => {
    const r = resolveSnakeEscape(snakeState(), null, dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.events.map((e) => e.type)).toEqual(['ESCAPE_FAIL', 'TURN'])
  })

  it('stuck → [STUCK, TURN]', () => {
    const r = useStuck(cleanGame(), 'CARD', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.events.map((e) => e.type)).toEqual(['STUCK', 'TURN'])
  })

  it('forfeit → [STUCK, TURN]', () => {
    const r = forfeitTurn(cleanGame())
    if (!r.ok) throw new Error('rejected')
    expect(r.events.map((e) => e.type)).toEqual(['STUCK', 'TURN'])
  })
})

describe('multi-player rotation', () => {
  it('cycles through 4 players and wraps 3 -> 0', () => {
    const g = createGame(config({ players: [
      { id: 'p1', name: 'A', color: 'red', emblem: 's1' },
      { id: 'p2', name: 'B', color: 'blue', emblem: 's2' },
      { id: 'p3', name: 'C', color: 'green', emblem: 's3' },
      { id: 'p4', name: 'D', color: 'gold', emblem: 's4' },
    ] }), dict)
    const clean = { ...g, board: { ...g.board, snakes: [], ladders: [] } }
    const r1 = submitWord(clean, 'CARD', dict)
    if (!r1.ok) throw new Error('x')
    expect(r1.next.currentPlayerIndex).toBe(1)
    const r2 = submitWord(r1.next, 'DREAM', dict)
    if (!r2.ok) throw new Error('x')
    expect(r2.next.currentPlayerIndex).toBe(2)
    const r3 = submitWord(r2.next, 'MORE', dict)
    if (!r3.ok) throw new Error('x')
    expect(r3.next.currentPlayerIndex).toBe(3)
    const r4 = submitWord(r3.next, 'ENTRY', dict)
    if (!r4.ok) throw new Error('x')
    expect(r4.next.currentPlayerIndex).toBe(0)
    expect(r4.events.some((e) => e.type === 'TURN' && e.playerId === 'p1')).toBe(true)
  })

  it('3-player game wraps 2 -> 0', () => {
    const g = createGame(config({ players: [
      { id: 'p1', name: 'A', color: 'red', emblem: 's1' },
      { id: 'p2', name: 'B', color: 'blue', emblem: 's2' },
      { id: 'p3', name: 'C', color: 'green', emblem: 's3' },
    ] }), dict)
    const clean = { ...g, board: { ...g.board, snakes: [], ladders: [] } }
    const r1 = submitWord(clean, 'CAT', dict)
    if (!r1.ok) throw new Error('x')
    expect(r1.next.currentPlayerIndex).toBe(1)
    const r2 = submitWord(r1.next, 'TAR', dict)
    if (!r2.ok) throw new Error('x')
    expect(r2.next.currentPlayerIndex).toBe(2)
    const r3 = submitWord(r2.next, 'RAT', dict)
    if (!r3.ok) throw new Error('x')
    expect(r3.next.currentPlayerIndex).toBe(0)
  })
})

describe('escape rescue word may start with any letter', () => {
  it('accepts a rescue word whose first letter differs from the required letter', () => {
    const s = snakeState() // requiredLetter 'D' (from CARD), drop 3
    const r = resolveSnakeEscape(s, 'RAT', dict) // starts 'R', length 3 >= 3
    if (!r.ok) throw new Error('rejected')
    expect(r.next.requiredLetter).toBe('D') // unchanged by the rescue
    expect(r.next.usedWords).toContain('RAT')
  })
})

describe('createGame player-count guard', () => {
  it('throws for fewer than 2 players', () => {
    expect(() => createGame(config({ players: [{ id: 'p1', name: 'A', color: 'red', emblem: 's' }] }), dict)).toThrow()
  })
  it('throws for more than 4 players', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, color: 'c', emblem: 's' }))
    expect(() => createGame(config({ players: five }), dict)).toThrow()
  })
})

describe('submitWord edge cases', () => {
  it('wins on exact landing (dest === length)', () => {
    const base = createGame(config({ boardLength: 30 }), dict)
    const s = { ...base, board: { ...base.board, ladders: [], snakes: [] }, players: [{ ...base.players[0], square: 26 }, base.players[1]] }
    const r = submitWord(s, 'CARD', dict) // 26 + 4 = 30 === length
    if (!r.ok) throw new Error('rejected')
    expect(r.next.phase).toBe('won')
    expect(r.next.winnerId).toBe('p1')
    expect(r.next.players[0].square).toBe(30)
  })

  it('normalizes padded/lowercase input', () => {
    const r = submitWord(cleanGame(), '  card  ', dict)
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[0].square).toBe(4)
    expect(r.next.requiredLetter).toBe('D')
    expect(r.next.usedWords).toEqual(['CARD'])
  })
})

describe('rescue requirement cap (RESCUE_NEED_CAP)', () => {
  // 8-letter NOTEBOOK / 7-letter DOLPHIN sit either side of the cap of 8.
  const rescueDict = createSetDictionary(
    ['CARD', 'DREAM', 'MORE', 'NOTEBOOK', 'DOLPHIN'],
    'test-rescue-v1',
  )

  // Land p1 on a snake head at `head` (drop = head - tail) by playing CARD from head-4.
  function cappedSnakeState(head: number, tail: number) {
    const base = createGame(config(), rescueDict)
    const s = {
      ...base,
      board: { ...base.board, ladders: [], snakes: [{ head, tail }] },
      players: [{ ...base.players[0], square: head - 4 }, base.players[1]],
    }
    const r = submitWord(s, 'CARD', rescueDict)
    if (!r.ok) throw new Error('setup failed')
    return r.next
  }

  it('caps the requirement at 8 on a drop-10 snake (drop itself unchanged)', () => {
    const s = cappedSnakeState(14, 4) // drop 10
    expect(s.pendingEscape?.drop).toBe(10) // movement semantics untouched
    expect(s.pendingEscape?.need).toBe(8)
  })

  it('drop 10: an 8-letter word escapes, staying on the head', () => {
    const r = resolveSnakeEscape(cappedSnakeState(14, 4), 'NOTEBOOK', rescueDict)
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[0].square).toBe(14)
    expect(r.events.some((e) => e.type === 'ESCAPE_SUCCESS')).toBe(true)
  })

  it('drop 10: a 7-letter word still rejects rescue-too-short', () => {
    expect(resolveSnakeEscape(cappedSnakeState(14, 4), 'DOLPHIN', rescueDict))
      .toEqual({ ok: false, reason: 'rescue-too-short' })
  })

  it('drop 10: failure still slides the FULL drop to the tail', () => {
    const r = resolveSnakeEscape(cappedSnakeState(14, 4), null, rescueDict)
    if (!r.ok) throw new Error('rejected')
    expect(r.next.players[0].square).toBe(4)
  })

  it('drop <= 8 keeps need === drop (exact length escapes, one short rejects)', () => {
    const s = cappedSnakeState(9, 4) // drop 5
    expect(s.pendingEscape?.need).toBe(5)
    expect(resolveSnakeEscape(s, 'MORE', rescueDict)).toEqual({ ok: false, reason: 'rescue-too-short' }) // 4 = drop-1
    const r = resolveSnakeEscape(s, 'DREAM', rescueDict) // 5 = exactly drop
    if (!r.ok) throw new Error('rejected')
    expect(r.events.some((e) => e.type === 'ESCAPE_SUCCESS')).toBe(true)
  })

  it('LEGACY GUARD: a persisted pendingEscape without `need` (drop 12) caps at 8', () => {
    // Version-1 localStorage saves predate `need`; resolveSnakeEscape must fall
    // back to min(drop, cap) — NOT `length < undefined` (which is always false
    // and would let any 3-letter word escape a 14-drop).
    const s = cappedSnakeState(16, 4) // drop 12
    const legacyEscape: PendingEscape = { playerId: 'p1', fromSquare: 16, drop: 12, toSquare: 4 }
    const legacy = { ...s, pendingEscape: legacyEscape }
    expect(resolveSnakeEscape(legacy, 'DOLPHIN', rescueDict)).toEqual({ ok: false, reason: 'rescue-too-short' })
    const r = resolveSnakeEscape(legacy, 'NOTEBOOK', rescueDict)
    if (!r.ok) throw new Error('rejected')
    expect(r.events.some((e) => e.type === 'ESCAPE_SUCCESS')).toBe(true)
  })
})

describe('reducer guard branches', () => {
  it('useStuck rejects in the wrong phase', () => {
    const s = createGame(config(), dict)
    expect(useStuck({ ...s, phase: 'won' }, 'CARD', dict)).toEqual({ ok: false, reason: 'wrong-phase' })
  })

  it('useStuck rejects an already-used word', () => {
    const r1 = submitWord(cleanGame(), 'CARD', dict)
    if (!r1.ok) throw new Error('x')
    expect(useStuck(r1.next, 'CARD', dict)).toEqual({ ok: false, reason: 'already-used' })
  })

  it('forfeitTurn cannot bypass a pending snake escape', () => {
    expect(forfeitTurn(snakeState())).toEqual({ ok: false, reason: 'wrong-phase' })
  })

  it('resolveSnakeEscape rejects a too-short (< 3) rescue word', () => {
    expect(resolveSnakeEscape(snakeState(), 'AH', dict)).toEqual({ ok: false, reason: 'too-short' })
  })

  it('resolveSnakeEscape rejects a long-enough non-word', () => {
    expect(resolveSnakeEscape(snakeState(), 'ZZZZ', dict)).toEqual({ ok: false, reason: 'not-a-word' })
  })

  it('rescue-too-short takes precedence over not-a-word', () => {
    const s = snakeState()
    const bigDrop = { ...s, pendingEscape: { ...s.pendingEscape!, drop: 5, need: 5 } }
    expect(resolveSnakeEscape(bigDrop, 'ZZZZ', dict)).toEqual({ ok: false, reason: 'rescue-too-short' })
  })
})
