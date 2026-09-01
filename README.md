# Chargeback Defender

AI agents that gather evidence, score confidence, and draft chargeback filings — a human approves every case before it ships.

Built by *Team Logic Builders* — Kaushal Sharma · Jiya Choudhary · Keshav Singhal

## Problem
Merchants lose ~$128 per chargeback, with 359M disputes/year projected by 2029. ~75% are "friendly fraud" — winnable, but evidence gathering is too slow and manual.

## How It Works
Webhook → Evidence Agent (pulls order/session/delivery data) → Confidence Score + Schema Validation → Human Review → Submission Agent files & logs.

## Features
- Batch CSV upload
- Autonomous evidence gathering & scoring (0–100)
- Human-in-the-loop review — nothing auto-files
- Strict output validation

## Tech Stack
React (TSX) · REST API · Llama 3.2 via Ollama · JSON Schema validation

## Links
- Live Demo: https://drive.google.com/file/d/1PLFM1x5U8XSnY-M6O8MG2reu-0wmmREe/view?usp=sharing
- Repo: github.com/Keshavweb/Logic-Builders/
- PPT: https://docs.google.com/presentation/d/1_mQkIcE-tlQhZMgatwM7kUVjXguEu4BQ/edit?usp=sharing&ouid=113480020379869204309&rtpof=true&sd=true
