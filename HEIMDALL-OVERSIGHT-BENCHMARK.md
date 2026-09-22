# Heimdall oversight: how much, and through what mechanism

Status: benchmark and analysis, run 2026-09-22, against the live, shared
machine described below. Every measurement cited here — across all three
research phases and this pass's own follow-up reads — respected a standing
good-citizen constraint the workflow was launched under: this box was under
real, active, concurrent multi-session load throughout (confirmed live:
swapPct 96–98%, load1 climbing from ~5.6 to 255 during one measurement
window, Heimdall's own proxy.mjs process itself at 78.2% CPU from other
callers' turns, sustained 429/503 from Ollama and multi-minute turn
latencies reported independently by the person who asked this question).
Nothing in this workflow ran a sustained stress test, stacked concurrent
in-tab loads, or held any single measurement past a few minutes; this
synthesis pass itself made zero additional model calls and zero additional
network requests — every code citation below was read from disk, not
executed.

## 1. The answer, stated first

**Heimdall's admission gate must not be extended to gate WebLLM or the CPU
rung directly — there is no channel for it to reach them, and the project's
own recent direction (P247, landed the same day this benchmark ran) has
already refused a consent-style gate on principle.** But Heimdall's
*oversight*, in the narrower sense of "does Heimdall know what is actually
happening on this box before it refuses someone," should be extended by one
specific, cheap, one-way mechanism: **a self-report from the browser tab to
Heimdall's own disclosure surface immediately before a genuinely large
in-tab download starts** — never a permission ask, never a blocking call,
purely so a refusal Heimdall issues to an unrelated Ollama caller a few
seconds later can be attributed rather than left as an unexplained "the box
is thrashing." This is not built. Section 5 states exactly what it would
carry and why the memory-gate coupling that already exists is not a
substitute for it.

**WebLLM and the CPU rung are forward-isolated from Heimdall's code at the
network-call level (confirmed by direct read, not just grep) but they are
not backward-isolated from Heimdall's *readings*, and — new to this pass,
confirmed by reading code that landed today — they are now also
architecturally coupled to the forward direction too, through P247's hop
ladder.** A heavy in-tab load can move the same system-wide swap/free-memory
numbers Heimdall's admission gate reads for an unrelated Ollama caller;
Heimdall's own `memory_pressured` refusal of that caller is now, as of
today, one of the exact failure kinds that sends *that caller's own turn*
hopping onto the identical in-tab WebGPU/CPU rungs already under load — with
zero cross-tab coordination of any kind. That loop is real by construction;
its practical severity is unmeasured, and section 4 says exactly what a
real test of it would need and why this workflow correctly declined to run
one today.

## 2. Architecture, confirmed by direct read (this pass)

The standing finding going into this workflow was two claims: (a) Heimdall's
code never sees, gates, or knows WebLLM/CPU exist (forward isolation), and
(b) Heimdall's memory-pressure gate reads OS-wide vitals that an unrelated
in-tab load could move (the backward-coupling hypothesis). Both were
re-verified directly in this pass, not taken on the prior phases' word.

**Forward isolation.** `grep -rni heimdall` across
`/Users/mlacy/Documents/3.0/the-fold/webllm-client.js`, `webllm-rung.js`,
`tf-chat-client.js`, `tf-rung.js` returns exit code 1 — zero matches in all
four, confirmed fresh this pass. `heimdall.mjs` itself (4,533 lines) has no
reference to webllm, transformers.js, WebGPU, or the-fold's browser rungs
anywhere in it.

**The backward-coupling mechanism, read line by line.** `heimdall.mjs:1200`
(`collectMemHeadroom`) parses `vm_stat`'s own Pages free/speculative/
inactive/compressor counts — a whole-machine report, no PID scoping — into
`memFreeMb`/`memAvailableMb`. `heimdall.mjs:1244` (`readSwap`) parses
`sysctl -n vm.swapusage` — also one system-wide swap file, not
per-process. `memoryPressureReason` (`heimdall.mjs:1255`) and
`memoryPressured` (`heimdall.mjs:1265`) consume only `vitals.swapOutPerS`,
`vitals.memAvailableMb`, `vitals.memFreeMb` — nothing derived from Ollama's
own process RSS (that figure, `ollamaMemMb`, is tracked separately via `ps`
and is never read by either function). Both are wired live into the
admission path at `heimdall.mjs:3401` (`starved = memAvailableMb <
MEM_FLOOR_MB * 2`) and `heimdall.mjs:3420` (`memoryPressured(vitals)`), each
returning a 503 to whichever unrelated Ollama caller is asking at that
moment. **This confirms the standing finding exactly: the gate a heavy
in-tab load could move, and the gate that actually refuses an unrelated
caller, are the same one.**

**Two more system-wide gates, beyond what the standing finding named.**
`boxSaturated` (`heimdall.mjs:1389`, `cpuIdle <= 10`) reads `cpuIdle` from
`top -l 1 -n 0 -s 0` (`heimdall.mjs:3024`) — also whole-machine, also wired
into the admission path (`heimdall.mjs:3433`, `busy = saturated ||
laneFull`). The CPU rung (`tf-rung.js`, transformers.js/ONNX running
Qwen2.5-0.5B) is CPU-bound in the browser's own renderer process and would
show up in this identical system-wide `top` reading — a second, independent
backward-isolation lever, on a different admission check than the memory
gate, not named in the original standing finding. `expectedWaitMs`
(`heimdall.mjs:246`, gated at `heimdall.mjs:3440`) is different in kind from
the two gauge-based gates: it holds an unrelated caller only if Heimdall's
own EWMA of *measured, real* Ollama turn wall-clock time
(`recordTurnMs`) exceeds `SLA_MAX_WAIT_MS`. If genuine CPU contention from a
heavy in-tab CPU-rung load slowed the physical machine enough to slow
Ollama's own token generation, that would be a real resource-contention
effect reflected honestly in a real measurement, not a misread gauge — worth
keeping distinct from the two gauge-based gates above.

**One gate that is disclosed and never used to refuse anything.** `gpuUtil`
(`heimdall.mjs:1376`, from `ioreg AppleGPU`) is read into every vitals
object and logged (`heimdall.mjs:2513`, `2517`) but a full read of every use
of the identifier in the file shows it feeding only the `/heimdall`
disclosure endpoint and a vitals-changed diff check — never a branch that
refuses or holds a caller. **WebLLM's own WebGPU load therefore has no
confirmed admission-gate pathway into Heimdall at all** — only the CPU-rung
and memory paths above do.

## 3. What was actually measured (per tier, condensed)

**Ollama / GPU-resident tier (gemma2:2b, raw daemon on 127.0.0.1:11435,
confirmed a distinct PID — 53918 — from eoreader7's proxy/Heimdall process,
PID 72110, fronting 11434/11436/11437).** Four short prompts, `num_predict`
capped at 40, ~5 seconds of real inference across all four, 553ms–1.1s
each, all correct. Live vitals pulled at the same moment showed swapPct
98% ("thrashing" by Heimdall's own ≥85% label), memFreeMb 128, load1 7.85
on 8 cores — ambient load from other concurrent sessions, not from this
benchmark. A distinct, second finding surfaced the same phase: hitting the
Heimdall-gated channel (port 11434, not raw Ollama) for the identical model
returned a 503 `model_unavailable` ("Heimdall dropped it") while the raw
daemon on 11435 answered all four requests correctly and fast — Heimdall's
own unservable-list gate reading stale relative to what the engine can
actually do right now. That is a distinct reliability question from the
isolation hypothesis this benchmark exists to test, named again in section
6 as its own open item.

**WebLLM tier (OLMo 2 1B, WebGPU, in-tab).** Three chat turns through the
real composer, ~4 minutes total wall time including server/browser setup
and teardown, longest single turn ~51s. **The cold-load measurement did not
actually happen** — `caches.open("webllm/model").keys()` already held 29
entries before the first turn, so every measured latency here is a
warm-cache figure, not the genuine multi-hundred-MB-to-~1.7GB first
download; forcing a real cold reload was judged out of scope given the
shared-machine constraint (a multi-hundred-MB fetch over a network already
serving other real sessions). The more load-bearing finding from this tier:
**a WebLLM turn is not fully forward-isolated from Heimdall at the
application level**, even though the client files that speak to WebLLM
literally are. Every one of the three turns, with the chat model explicitly
pinned to WebLLM, generated real `POST /api/chat` calls to Heimdall's own
proxy on port 11436 (16 total across three turns) — because the app's
witness/checking pipeline (`buildWitnessMessages`, run on every turn
regardless of the chosen chat model) targets a fixed `WITNESS_MODEL`
(`hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest`, an Ollama-served copy
of the same model family) via `resolveNamedModel`, falling back only if
that named Ollama model is not actually pulled. So in the ordinary case
(Ollama healthy, that model pulled), a WebLLM chat turn's *visible answer*
comes from the in-tab WebGPU model while its *invisible fact-check step* is
a real, Heimdall-gated Ollama call on every turn — an existing coupling
this benchmark did not go looking for and found anyway.

**CPU / transformers.js tier (Qwen2.5-0.5B).** Cold download on a fresh
origin: ~29s for a declared ~400MB q4 download, disclosed live via a
progress banner, matching the project's own documented "fast, disclosed,
no failure" framing for this rung. One real chat turn, malformed by an
input-handling mistake (a stray `cmd+a` that failed to clear a prior
question, concatenating two questions into one), ran past 221 seconds with
no completion and appeared to be escalating from the explicitly-picked CPU
rung up to a second, heavier, cold-downloading WebLLM load — cut off by
closing the tab rather than let a second multi-gigabyte fetch start on an
already-loaded box. Genuinely confounded with a concurrent server exit on
the same physical machine (SIGTERM, code 143, ~4 minutes in) that may or
may not be resource pressure; not re-run, because a clean re-run would cost
more shared-machine time than the modest budget allowed that day. Treat as
a real, worth-investigating anomaly, not a clean isolated failure.

**Coupling test (the direct A/B).** Baseline Heimdall vitals read twice,
~90s apart, before touching WebLLM: `memoryPressured(vitals)` was already
**true** at the second baseline reading (memFreeMb 84 < the 256MB hard
floor) purely from ambient load, before any in-tab action at all — meaning
this test never had a clean control condition to begin with. Three baseline
Ollama probes through Heimdall's gated channel: two of three already failed
(connection timeout / "upstream not responding") before WebLLM was ever
touched. One WebLLM turn was then triggered — again a warm-cache hit, not a
genuine load — and immediately afterward Heimdall's own `/heimdall` status
endpoint went fully unresponsive for three consecutive attempts (8s, 10s,
25s timeouts), while the *raw* Ollama daemon, probed directly, answered
correctly in 1.4s (Ollama's own `total_duration` 920ms) at the same moment.
Heimdall's proxy process itself was measured at 78.2% CPU during this
window, serving other real concurrent sessions' calls visible in its own
disclosure log; load average spiked to 255 by the end of the ~7-minute
window. **Honest result: no clean signal either way.** No response, before
or after the WebLLM turn, ever carried Heimdall's specific `memory_pressured`
refusal body — every failure was a bare connection timeout or the separate,
non-memory `ollamaReachable()` preflight timeout in proxy-runner.mjs. The
underlying engine was never actually impaired (raw Ollama answered fast
throughout); what was failing sat entirely in Heimdall's own gating/proxy
layer, CPU-saturated by unrelated callers. This is a genuine null, not
evidence of absence: the test never applied the kind of load (a real
multi-hundred-MB-plus in-tab fetch) the hypothesis is actually about, and
the ambient noise floor on this box (a 90-second baseline swing large
enough to flip `memoryPressured` from false to true on its own) is large
enough to swallow a signal from one small warm-cache chat turn even if one
were present.

## 4. New this pass: P247 wires the backward path directly into a forward hop, and nothing coordinates the landing

Section 2 establishes that a heavy in-tab load can move the readings behind
an unrelated Ollama caller's refusal. What was not checked by the prior
phases — because the code did not exist yet when they ran — is what happens
to that refused caller next. It landed the same day as this benchmark:
POLICIES.md **P247**, "a busy or absent box falls to the in-tab rungs,"
gives Huginn's hop ladder a bottom rung onto WebLLM and the CPU tier when
the primary engine declines. Read directly:

`app.js:3512` — `completeLocal`'s own non-2xx branch: `if (res.status >= 500
|| body?.type === "model_unavailable" || body?.type ===
"memory_pressured") err.unserved = true;`. **Heimdall's own
`memory_pressured` 503 — the exact refusal body Section 2 traces to
system-wide swap/free-memory readings a heavy in-tab load can move — is one
of the three conditions that sets `err.unserved`.**

`huginn.js:106` — `export const HOP_FAILURE_KINDS = Object.freeze(["machine",
"unserved", ...ROOM_FALLBACK_KINDS]);` and `huginn.js:107` —
`hopEligible = (kind) => HOP_FAILURE_KINDS.includes(kind)`. An `unserved`
failure is hop-eligible by construction.

`app.js:3277–3333` (`huginnPlanFor`) — after room-mouth prioritization, the
function appends the in-tab WebGPU rung (gated only on `webgpuBlocker({gpu:
navigator.gpu, secureContext})`, a purely local, per-tab capability check)
and the in-tab CPU rung (offered unconditionally), each preferring whatever
model is *already warm in that tab's own client state*
(`webllmClient.ready && webllmClient.modelId`, `tfChatClient.ready &&
tfChatClient.model`). **Nothing in this function reads system memory,
reads another tab's state, or consults any shared registry.** A direct grep
of `app.js`, `webllm-client.js`, `webllm-rung.js`, `tf-chat-client.js`,
`tf-rung.js`, `huginn.js` for `BroadcastChannel`, `navigator.locks`, or
`SharedWorker` — the three standard browser primitives for exactly this
kind of cross-tab coordination — returns zero matches across all six files.

**The loop, stated plainly:** a heavy in-tab WebLLM/CPU load in Tab A moves
the box's real system-wide free memory and swap-churn numbers → Heimdall
refuses an unrelated Ollama caller in Tab B with `memory_pressured` → Tab
B's client marks that failure `unserved` (`app.js:3512`) → Huginn's hop
ladder treats `unserved` as hop-eligible (`huginn.js:106-107`) → Tab B's own
`huginnPlanFor` appends the identical in-tab WebGPU/CPU rungs Tab A is
already loading, decided purely from Tab B's own local state, with no check
of whether Tab A (or any other tab) is doing the same thing at the same
moment. The shape is a positive-feedback loop: memory pressure caused by an
in-tab load can, through Heimdall's own honest refusal of an unrelated
caller, recruit a *second* tab onto the same contended local resource.

**This is confirmed as a real, wired mechanism, not a hypothesis** — every
line cited above was read from the actual files, not inferred. **Its
magnitude is unmeasured, and this workflow correctly did not attempt to
measure it today.** A real test of this specific loop needs a genuine
multi-hundred-MB-or-larger in-tab download deliberately triggered (not a
warm-cache hit, which is what Phase 3's coupling test actually applied)
while polling Heimdall's live vitals and running a small number of
unrelated Ollama probes from a second tab, ideally on a quieter window than
today's (swapPct 96–98%, load1 up to 255 from ambient multi-session load
alone) — none of which this modest, time-bounded, good-citizen workflow was
positioned to run on a machine other real people are using right now, and
none of which should be attempted casually given what a genuine cold
download costs on a box already this loaded.

## 5. Should Heimdall's oversight extend to the in-tab tiers, and through what mechanism

**No admission-gate extension.** Heimdall has no channel to WebLLM or the
CPU rung to gate in the first place (Section 2's forward-isolation
confirmation), and the project's own governing UX direction for exactly
this ladder — recorded the same day, in the same P247 entry — explicitly
refused a consent/selection gate on this path ("this should mostly all be
invisible... I don't want to have to select"). Building an admission wall
Heimdall cannot structurally reach, against a mechanism the project has
just decided must stay invisible, is the wrong shape of answer.

**Yes, a one-way self-report before a large in-tab download, and here is
exactly what it should carry and why.** The actual harm named in the
standing finding was never "WebLLM/CPU get throttled" — nothing in Section
2's code reading gates them at all. The actual harm is that **Heimdall's
refusal of an unrelated Ollama caller becomes silently misattributed**
precisely when an in-tab load is the real cause: every caller who hits
`memoryPressured` sees the identical "the box is thrashing/starved" message
whether the cause was five other people's concurrent Ollama sessions or one
person's own browser tab loading a 1.7GB model. A cheap, fire-and-forget
`POST` from the tab to Heimdall's own steer port (already serving
`/heimdall`'s disclosure JSON, whose `disclosure.profiles`/`claims`
machinery — visible live in the coupling test's own evidence, Section
3 — already carries other callers' self-identifying activity) at the moment
a genuinely large (multi-hundred-MB-plus) WebLLM or CPU cold download
begins, carrying nothing more than a tab-scoped label and an approximate
byte size, would let a `memory_pressured` refusal disclose "a large
in-browser model download was reported starting on this box Ns ago" instead
of an unexplained number. This is never a gate — Heimdall cannot refuse the
report, cannot delay the download, and the download proceeds identically
whether or not the report lands. It costs one POST that never blocks
anything, and it turns an opaque coincidence into a named, checkable fact
the next person debugging a stalled Ollama turn can actually use.

**The existing memory-gate coupling does not substitute for this, and the
distinction is worth stating precisely.** The fact that Heimdall's memory
gate already reads system-wide vitals (Section 2) means it will, correctly,
refuse an unrelated Ollama caller *more often* when the box is genuinely
under real pressure — including pressure an in-tab load caused. That is
protection of the shared resource, and it already works, indirectly, today,
without any new code. What it does not do, and cannot do from where it
sits, is explain *why* — every refused caller gets the identical
undifferentiated message regardless of cause. "How much does Heimdall need
to be involved" is a question about diagnosability as much as protection;
the existing coupling answers the protection half and leaves the
diagnosability half exactly where the standing finding found it: a
refusal with no attributable cause.

## 6. Does P247 create new risk — the direct answer

**Yes.** Section 4 traces the mechanism in full, by reading code that
landed the same day. Multiple simultaneous turns or tabs can each
independently hop to WebLLM or the CPU tier with zero coordination — this
is not a possibility inferred from the architecture, it is the literal,
confirmed behavior of `huginnPlanFor` (`app.js:3277-3333`), which computes
its hop decision entirely from the calling tab's own local browser state
and consults nothing shared. The coupling test's own null result (Section
3) does not meaningfully soften this: that test's WebLLM turn was a
warm-cache hit, never the genuine large download this risk is actually
about, and the box was already saturated by unrelated multi-session
activity before the test began strongly enough to move `memoryPressured`
from false to true in the ninety seconds before any in-tab action at all.
A test that never applies the load in question, on a machine whose ambient
noise already swamps a plausible single-tab effect, produces a null that
says the test was underpowered for this specific question — not that the
risk is small. The honest position, stated without hedging past what was
actually measured: **the mechanism is real by construction (Section 4); its
practical frequency and severity are unmeasured, and measuring them
honestly needs a deliberately-triggered large cold download next to a live
Heimdall vitals read, on a quieter window than today's — a test this
workflow's own modest, time-bounded, good-citizen constraint correctly
declined to run on a shared machine under real load right now.**

## 7. One paragraph, for pasting directly

Heimdall's admission gate has zero code-level visibility into WebLLM or the
CPU rung — confirmed by reading heimdall.mjs in full and grepping every
browser-model client file, zero matches — so it is correctly forward-
isolated and should stay that way; do not build a gate for it to reach
them, especially since the project has already ruled out a consent-style
selector on this exact path. But it is *not* backward-isolated: Heimdall's
memory-pressure and box-saturation gates both key off whole-machine
readings (`vm_stat`, `sysctl vm.swapusage`, `top`'s `cpuIdle`) that a heavy
in-tab WebLLM or CPU-rung load can genuinely move, so it can refuse an
unrelated Ollama caller elsewhere on the same box without ever knowing an
in-tab tab was the cause — and, as of today's P247 change, that same
refused caller's own client now classifies Heimdall's `memory_pressured`
503 as hop-eligible and can land on the very same contended in-tab rungs,
with no cross-tab coordination anywhere in the code. The direct A/B run
today could not confirm the backward-pressure effect cleanly — it tested a
warm-cache hit, not a genuine large download, on a box already noisy enough
from other people's real sessions to swamp the signal either way — so the
right next step is not more gating but one cheap, one-way self-report from
a tab to Heimdall's disclosure endpoint right before a genuinely large
in-tab download starts, purely so a later refusal can say why, plus a real
follow-up test that deliberately triggers a cold multi-hundred-MB download
next to a live Heimdall vitals read on a quieter machine than today's.

## 8. Also found, not this benchmark's main question, worth a separate fix

Heimdall's own unservable-list gate (the mechanism behind the `503
model_unavailable` on the Heimdall-fronted channel, distinct from the
memory-pressure gate) answered incorrectly for gemma2:2b during this
workflow's own Phase 1 measurement: the raw Ollama daemon answered all four
direct requests correctly and fast (553ms–1.1s) at the same moment the
Heimdall-gated channel refused the identical model as unservable. Whatever
marks a model unservable can go stale relative to what the engine can
actually do right now — a real, distinct reliability question from
everything else in this document, since "how much Heimdall needs to be
involved" partly depends on whether its own gates track ground truth. Not
investigated further here; named so it is not lost.
