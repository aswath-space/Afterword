// Prebuild: compute the final word set (ENABLE + supplement − denylist) and write it
// gzip-compressed to public/dict.bin, which the app fetches + decompresses at runtime.
// Wired into `npm run build`; run manually with `npm run gen-dict` after editing any
// of the three source word-list files.
import { readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildWordList } from '../src/dictionary/buildWordList.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, 'src/dictionary', p), 'utf8')
const words = buildWordList(read('enable.txt'), read('extra-words.txt'), read('denylist.txt'))
// NOTE: written as dict.bin (NOT .gz) on purpose — a .gz extension makes static hosts
// serve the file with `Content-Encoding: gzip`, so the browser transparently decompresses
// it and our manual DecompressionStream would then double-decode + fail. An opaque .bin is
// served as-is on every host, so the client controls decompression. (De-risked 2026-07-16.)
const gz = gzipSync(Buffer.from(words.join('\n') + '\n', 'utf8'), { level: 9 })
writeFileSync(resolve(root, 'public/dict.bin'), gz)
console.log(`dict.bin (gzip): ${words.length} words → ${(gz.length / 1024).toFixed(1)} KB`)
