# Grounding E2E — 25 correct answers through the production ladder

Run: 2026-09-15T20:17:41.387Z · witness model hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest · Ollama

A case is **grounded** when the ladder places the correct answer anywhere but `self` (the model's own voice). The answer is ground truth by construction — it restates the material — so a working grounding system should mark every row grounded.

**Two numbers, kept apart (2026-09-15):** the MECHANICAL arm below runs the ladder with the witness stubbed out — deterministic, zero model calls, the reproducibility floor (25/25). The live headline reports what the real witness model adds under THIS machine's current load; the witness (a calibrated small model) can flip a mechanically-established `named` to `self` by returning a false `no-testimony` refusal when asked, a pre-existing property under GPU contention, not a ladder defect.

## Headline (live witness)
- **25/25 grounded** (100%)
- verbatim: 100% (6/6)
- close-paraphrase: 100% (7/7)
- reorder: 100% (6/6)
- name-only: 100% (6/6)

## Per-case

| # | kind | relation verdict | witness | tier | grounded | answer |
|---|---|---|---|---|---|---|
| 1 | verbatim | bound | — | bound | ✓ | Hannibal Hamlin was the 15th vice president of the United States. |
| 2 | close-paraphrase | unbound|unheard | skipped (witness could not reach a verdict: indiscriminate) | named | ✓ | Hannibal Hamlin served as vice president under Abraham Lincoln from 1861 to 1865. |
| 3 | reorder | unbound|unheard | states | witnessed | ✓ | Mikhail Kutuzov replaced Barclay de Tolly as commander in 1812. |
| 4 | name-only | unbound | skipped (witness could not reach a verdict: unarmed-select) | recorded | ✓ | Paris is the capital of France. |
| 5 | verbatim | bound | — | bound | ✓ | Water freezes at 0 degrees Celsius. |
| 6 | close-paraphrase | unbound | skipped (witness could not reach a verdict: unarmed-select) | named | ✓ | Amelia Earhart was the first female aviator to fly alone across the Atlantic. |
| 7 | reorder | unbound|unheard | skipped (witness could not reach a verdict: indiscriminate) | named | ✓ | Russia was invaded by Napoleon in 1812. |
| 8 | name-only | unbound | skipped (witness could not reach a verdict: indiscriminate) | recorded | ✓ | Mount Everest is the tallest mountain on Earth. |
| 9 | verbatim | bound|unheard | — | verbatim | ✓ | The Great Wall of China is over 13,000 miles long. |
| 10 | close-paraphrase | unheard | skipped (witness could not reach a verdict: unarmed-select) | named | ✓ | Marie Curie received the Nobel Prize for her research into radioactivity. |
| 11 | reorder | beyond-reach|unheard | skipped (witness could not reach a verdict: unarmed-select) | named | ✓ | The phonograph was patented by Thomas Edison in 1878. |
| 12 | name-only | no-claim | skipped (witness could not reach a verdict: unarmed-select) | recorded | ✓ | The Mariana Trench is the deepest part of the ocean. |
| 13 | verbatim | no-claim | states | verbatim | ✓ | Light travels at approximately 300,000 kilometers per second. |
| 14 | close-paraphrase | unbound | skipped (witness could not reach a verdict: unarmed-select) | named | ✓ | The Amazon is the biggest river on Earth by the amount of water it carries. |
| 15 | reorder | beyond-reach | skipped (witness could not reach a verdict: unarmed-select) | recorded | ✓ | The telephone was invented in 1876 by Alexander Graham Bell. |
| 16 | name-only | unbound | skipped (witness could not reach a verdict: unarmed-select) | recorded | ✓ | Augustus was the first emperor of Rome. |
| 17 | verbatim | no-claim | skipped (witness could not reach a verdict: unarmed-select) | verbatim | ✓ | The chemical symbol for gold is Au. |
| 18 | close-paraphrase | unbound | skipped (witness could not reach a verdict: uncontained) | named | ✓ | Jupiter is the biggest of all the planets orbiting the Sun. |
| 19 | reorder | no-claim | skipped (witness could not reach a verdict: unarmed-select) | named | ✓ | The first algorithm for a machine was written by Ada Lovelace. |
| 20 | name-only | no-claim | skipped (witness could not reach a verdict: indiscriminate) | recorded | ✓ | The Nile is the longest river in the world. |
| 21 | close-paraphrase | unheard | skipped (witness could not reach a verdict: unarmed-select) | named | ✓ | The Battle of Gettysburg took place in Pennsylvania in 1863. |
| 22 | reorder | unbound|unheard | skipped (witness could not reach a verdict: unarmed-select) | recorded | ✓ | The Continental Army was commanded by George Washington during the American Revolution. |
| 23 | verbatim | no-claim | skipped (witness could not reach a verdict: unarmed-select) | verbatim | ✓ | The human body has 206 bones in the adult skeleton. |
| 24 | close-paraphrase | unheard | skipped (witness could not reach a verdict: unarmed-select) | named | ✓ | Shakespeare authored Romeo and Juliet in about 1595. |
| 25 | name-only | no-claim | skipped (witness could not reach a verdict: unarmed-select) | recorded | ✓ | Vatican City is the smallest country in the world. |

## Mechanical arm (ladder alone, witness stubbed — deterministic) — 25/25

| # | tier | grounded |
|---|---|---|
| 1 | bound | ✓ |
| 2 | named | ✓ |
| 3 | named | ✓ |
| 4 | named | ✓ |
| 5 | bound | ✓ |
| 6 | named | ✓ |
| 7 | named | ✓ |
| 8 | named | ✓ |
| 9 | verbatim | ✓ |
| 10 | named | ✓ |
| 11 | named | ✓ |
| 12 | named | ✓ |
| 13 | verbatim | ✓ |
| 14 | named | ✓ |
| 15 | named | ✓ |
| 16 | named | ✓ |
| 17 | verbatim | ✓ |
| 18 | named | ✓ |
| 19 | named | ✓ |
| 20 | named | ✓ |
| 21 | named | ✓ |
| 22 | named | ✓ |
| 23 | verbatim | ✓ |
| 24 | named | ✓ |
| 25 | named | ✓ |


## Ungrounded cases (the failure the user sees)
None.

## Omnilingual arm (5/9 grounded)

The English ladder's relation tier is English-positional, so on non-Latin scripts the mechanical tiers are the verbatim byte rung (script-neutral) and the sentence-initial-name rung (Cyrillic shares English's capital convention); the paraphrase cases must reach the witness — the model reading. Whether the small English-instructed witness model can READ these scripts and attest is what this arm measures.

**The boundary, stated honestly (2026-09-15).** The verbatim byte rung is genuinely omnilingual (R1/H1/A1/C1 ground; T1 — a typo — correctly does not, the rung never invents ground the bytes do not carry). The three paraphrase misses (R2/H2/C2) are the SAME structural wall an English single-name paraphrase hits: the witness is deliberately unarmed (a competing filler cannot be built from a material with one name — p(states|fabricated)=1/8 measured, so an unarmed "yes" is refused), and these scripts additionally lack the English referent layer's fallback that carries the English single-name case to "named". This is a real, disclosed boundary of the mechanical NAME layer, not of the byte rung or the witness-as-model.

| # | script | kind | relation verdict | witness | tier | grounded | answer |
|---|---|---|---|---|---|---|---|
| R1 | Cyrillic | verbatim | no-claim | skipped (witness could not reach a verdict: no-valid-pick) | verbatim | ✓ | Наполеон вторгся в Россию в 1812 году. |
| R2 | Cyrillic | reorder | no-claim | skipped (witness could not reach a verdict: unarmed-select) | self | ✗ | «Евгений Онегин» был написан Пушкиным в 1830-х годах. |
| R3 | Cyrillic | name-only | no-claim | skipped (witness could not reach a verdict: unarmed-select) | named | ✓ | Москва — столица России. |
| H1 | Hebrew | verbatim | no-claim | skipped (witness could not reach a verdict: no-valid-pick) | verbatim | ✓ | המים רותחים במאה מעלות צלזיוס. |
| H2 | Hebrew | close-paraphrase | no-claim | skipped (witness could not reach a verdict: unarmed-select) | self | ✗ | ירושלים היא בירת ישראל. |
| A1 | Arabic | verbatim | no-claim | skipped (witness could not reach a verdict: no-valid-pick) | verbatim | ✓ | القاهرة هي عاصمة مصر. |
| C1 | CJK | verbatim | no-claim | skipped (no content to anchor a candidate on) | verbatim | ✓ | 化学元素金的符号是Au。 |
| C2 | CJK | close-paraphrase | no-claim | skipped (no content to anchor a candidate on) | self | ✗ | 北京是中华人民共和国的首都。 |
| T1 | Hebrew | typo | no-claim | skipped (witness could not reach a verdict: no-valid-pick) | self | ✗ | המים רוחים במאה מעלות צלזיוס. |

### Omnilingual ungrounded
- #R2 [reorder/Cyrillic] verdict=`no-claim` witness=`skipped` — witness could not reach a verdict: unarmed-select
  material: Пушкин написал «Евгения Онегина» в 1830-х годах.
  answer:   «Евгений Онегин» был написан Пушкиным в 1830-х годах.
- #H2 [close-paraphrase/Hebrew] verdict=`no-claim` witness=`skipped` — witness could not reach a verdict: unarmed-select
  material: ירושלים היא עיר הבירה של ישראל.
  answer:   ירושלים היא בירת ישראל.
- #C2 [close-paraphrase/CJK] verdict=`no-claim` witness=`skipped` — no content to anchor a candidate on
  material: 北京是中国的首都。
  answer:   北京是中华人民共和国的首都。
- #T1 [typo/Hebrew] verdict=`no-claim` witness=`skipped` — witness could not reach a verdict: no-valid-pick
  material: המים רותחים במאה מעלות צלזיוס.
  answer:   המים רוחים במאה מעלות צלזיוס.
