# Qwen3.5 9B versus 27B — isolated planning comparison

Both models failed the complex autonomous sales workflow before any worker was spawned. Do not promote 27B as the default based on this experiment.

| Model | Duration | Planning calls | Workers spawned | Outcome |
| --- | ---: | ---: | ---: | --- |
| Qwen3.5:9b Q4_K_M | 155.880 seconds | 4 | 0 | Planning allowance exhausted; invalid topology/grants |
| Qwen3.5:27b Q4_K_M | 539.033 seconds | 4 | 0 | Planning allowance exhausted; the same sibling-dependency error survived both corrections |

The 27B plan placed the reviewer and researcher under different parents while specifying a dependency between them. VAC permits dependencies between siblings. All three submitted plans retained this invalid relationship. Its narrower error set is not successful execution or production qualification.

## Method

One fresh disposable workspace per model, same source implementation, synthetic CSV, objective, Deep Agents planner, tool grants, artifact contracts and limits. Only the evaluated model changed. Both used temperature 0, thinking disabled, 16,384-token context, at most 2,048 output tokens per call, four planning calls, 300-second inference timeout and a 20-minute root deadline. No paid inference or search was enabled. Neither trial reached external tool execution.

The 24 GiB Mac loaded 27B with an observed 18 GB runtime footprint and Ollama reporting 13% CPU / 87% GPU. The 9B baseline overlapped the 27B download, so timings are observations rather than a clean performance benchmark. Cold loading and caching are not normalized. One task and one run per model do not establish general capability, and reasoning-enabled inference was not tested.

The 27B download remains installed; it was unloaded after testing. Saved agents, deployed runtime and production defaults were not changed. The evaluator now accepts an optional fourth argument for the model and records model/settings metadata. TypeScript and diff-whitespace checks passed.

## Reproduction and evidence

Run `node --import tsx scripts/evaluate-swarm-workspace.ts live-harness /absolute/new-output.json qwen3.5:27b` with Ollama, Docker and the existing sandbox image available. Each run must use a new output filename. The script grants writes only to its disposable local connector fixture, subject to exact argument checks.

[Comparison evidence](../evaluations/2026-09-21-model-comparison.json) records source hashes, model identities, failures, receipts and raw-report hashes. Full reports are retained in the ignored private `data/evaluations/2026-09-21-model-comparison/` directory.

Next experiment: simplify dependency representation and compile topology deterministically, then compare both models again. A separate reasoning-enabled experiment can test inference configuration without conflating it with this model-size comparison. Neither improvement is established by this trial.
