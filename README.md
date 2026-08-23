# MortgageAdvisor

## Evals

`npm run eval` scores the LLM parts against hand-labeled cases: per-field extraction accuracy, and chat scored per category — answerable, unanswerable (the anti-hallucination metric), and adversarial. It makes real API calls, ~$0.50 for a full run; add `--repeats=1 --limit=3` for a cheap check.

Details, flags, and known limitations: [`backend/evals/README.md`](backend/evals/README.md).
