# janulus-core

Framework-agnostic core of [Janulus Matrix](https://github.com/senseikatana/janulus-matrix): Portuguese/Spanish/English/Catalan/Galician phrase matrix with offline dictionary, approximate IPA phonetics and a free-first translation provider chain. Pure TypeScript, zero runtime dependencies.

## Install

```bash
pnpm add janulus-core
# or
npm i janulus-core
```

## Usage

```ts
import {
  translateWithChain,
  transcribe,
  lookupDictionary,
  LOCALE_LABELS
} from 'janulus-core'

// Free-first chain: dictionary → Google gtx → MyMemory → word-by-word.
// No keys, no accounts. Pass `googleApiKey` to put the official API first (opt-in).
const res = await translateWithChain({
  text: 'hoy',
  source: 'es',
  targets: ['pt', 'en', 'ca', 'gl']
})
// { translations: { es:'hoy', pt:'hoje', en:'today', … }, provider: 'dictionary', fromDictionary: true }

// IPA: verified dictionary entry first, rule-based approximation (pt/es) otherwise.
const { ipa, verified } = transcribe('empregos', 'pt')
// { ipa: '[ẽˈpɾe.ɡuz]', verified: true }
```

## Provider chain

| Order | Provider | Cost | Notes |
|---|---|---|---|
| 0 | Local dictionary | $0 | Offline, instant |
| 1 | Google official (opt-in via `googleApiKey`) | Free tier 500K chars/mo | Requires own key + billing |
| 2 | Google gtx (no key) | $0 | Unofficial, may 429/block on some networks |
| 3 | MyMemory | $0 | ~5K chars/day anon. Collaborative TM: can return real but unrelated sentences with high match scores — flagged `needsReview`, never trusted blindly |
| 4 | Word-by-word dictionary | $0 | Keeps unknown words intact |
| 5 | Echo + `provider: 'echo'` | $0 | Never breaks the caller |

Every remote answer passes `isPlausibleTranslation()` (rejects empties, quota warnings, identical echoes, absurd length ratios) before being accepted.

## License

MIT © Sergio Jurado (senseikatana)
