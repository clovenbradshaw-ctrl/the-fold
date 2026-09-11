# MVP Acceptance Test — Voyager 1 (Wikipedia)

Run: 2026-09-11T04:35:11.950Z
Fixture: eval/fixtures/voyager1-wikipedia.txt (5496 words, real, fetched live this session, previously unused)
Model: gemma2:2b via Ollama (local, http://localhost:11434)

## Ingest
- 1989ms for 5496 words = 3619ms/10k words (target ≤30000ms/10k) — **PASS**
- 28 passages admitted

## Headline
- Questions: 20 (12 answerable, 3 contested, 5 absent)
- **Fabrication count: 1** (target 0)
- **Citation verification rate: 100.0%** (15/15 checked)
- Latency failures: 0/20

## Per-question detail

| # | bucket | ms | latency target | pass | fabricated | citation ok | answer (truncated) |
|---|---|---|---|---|---|---|---|
| 1 | answerable | 2952 | 15000 | ✓ | no | ✓ | The source material does not state the date Voyager 1 was launched. |
| 2 | answerable | 5049 | 15000 | ✓ | no | ✓ | NASA launched Voyager 1.  The material states that Voyager 1 was built by the Jet Propulsion Laboratory (JPL). |
| 3 | answerable | 4412 | 15000 | ✓ | no | ✓ | The source material does not state how many days after Voyager 2 was Voyager 1 launched. |
| 4 | answerable | 4569 | 15000 | ✓ | no | ✓ | Voyager 1 flew by Saturn's largest moon, Titan.  The Titan flyby occurred as the spacecraft entered the system to avoid any possibility of damage closer to Saturn compromising observations. |
| 5 | answerable | 3679 | 15000 | ✓ | YES | ✓ | Voyager 1 crossed the heliopause in August 2012.  It then entered interstellar space. |
| 6 | answerable | 2473 | 15000 | ✓ | no | ✓ | Voyager 1 was built by the Jet Propulsion Laboratory (JPL). |
| 7 | answerable | 6296 | 15000 | ✓ | no | ✓ | Voyager 1's closest approach to Jupiter was about 349,000 kilometers (217,000 miles) from the planet's center. |
| 8 | answerable | 3467 | 15000 | ✓ | no | ✓ | Voyager 1 discovered ongoing volcanic activity on the moon Io.  It was the first time active volcanoes had been seen on another body in the Solar System. |
| 9 | answerable | 5285 | 15000 | ✓ | no | ✓ | Voyager 1 discovered two new moons of Jupiter: Metis, which orbits just outside the ring, and Thebe, which was discovered between the orbits of Amalthea and Io. |
| 10 | answerable | 6658 | 15000 | ✓ | no | ✓ | Voyager 1's high-gain antenna has a diameter of 3.7 meters.  This information is found in the "Communication system" section of the source material. |
| 11 | answerable | 9350 | 15000 | ✓ | no | ✓ | The image famously taken in 1990 that shows Earth as a tiny dot is known as the "Pale Blue Dot."  This image was taken by Voyager 1. |
| 12 | answerable | 8246 | 15000 | ✓ | no | ✓ | Scientists at the Johns Hopkins University Applied Physics Laboratory believed Voyager 1 entered the termination shock in February 2003. |
| 13 | contested | 7843 | 15000 | ✓ | no | ✓ | Not stated in the source.  While Ed Roelof declared that "most scientists involved with Voyager 1 would agree that [these two criteria] have been sufficiently satisfied", the source does not state that all scientists agreed. |
| 14 | contested | 7580 | 15000 | ✓ | no | ✓ | Yes, there was disagreement among scientists about whether Voyager 1 had crossed the heliopause based on the magnetic field direction.  The field had changed direction by only 2 degrees, which suggested to some that the nature of the edge of the heliosphere had been misjudged. |
| 15 | contested | 13392 | 15000 | ✓ | no | ✓ | In 2013, it was officially confirmed that Voyager 1 had entered interstellar space.  Not stated in the source. |
| 16 | absent | 106 | 2000 | ✓ | no | n/a | (refused — not stated in the source material) |
| 17 | absent | 35 | 2000 | ✓ | no | n/a | (refused — not stated in the source material) |
| 18 | absent | 137 | 2000 | ✓ | no | n/a | (refused — not stated in the source material) |
| 19 | absent | 31 | 2000 | ✓ | no | n/a | (refused — not stated in the source material) |
| 20 | absent | 159 | 2000 | ✓ | no | n/a | (refused — not stated in the source material) |

## Failure detail
- Q5 [answerable] "On what date did Voyager 1 cross the heliopause and enter interstellar space?" — fabricated=true, citationOk=true, latency=3679ms (target 15000ms)
  answer: Voyager 1 crossed the heliopause in August 2012.  It then entered interstellar space.

## Bar verdict
**NOT MET** — 1 fabrication(s) ✗; 100% citation verification ✓; all latency targets held ✓.
