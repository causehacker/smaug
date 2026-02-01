---
title: "ZeroLeaks"
type: tool
date_added: 2026-01-31
source: "https://github.com/ZeroLeaks/zeroleaks"
tags: [ai-security, prompt-injection, llm-security, typescript]
via: "Twitter bookmark from @NotLucknite"
---

An autonomous AI security scanner that tests LLM systems for prompt injection and extraction vulnerabilities. ZeroLeaks uses a multi-agent architecture to simulate real-world attacks and identify security weaknesses before attackers do.

## Key Features

- **Multi-Agent Architecture**: Strategist, Attacker, Evaluator, Mutator, Inspector, and Orchestrator agents working together
- **Tree of Attacks (TAP)**: Systematic exploration of attack vectors with intelligent pruning
- **Modern Attack Techniques**: Crescendo, Many-Shot, Chain-of-Thought Hijacking, Policy Puppetry, Siren, Echo Chamber
- **TombRaider Pattern**: Dual-agent Inspector for defense fingerprinting and weakness exploitation
- **Multi-Turn Orchestrator**: Coordinated attack sequences with adaptive temperature
- **Defense Fingerprinting**: Identifies specific defense systems (Prompt Shield, Llama Guard, etc.)
- **Dual Scan Modes**: System prompt extraction and prompt injection testing
- **Configurable Models**: Choose different models for attacker, target, and evaluator agents
- **CLI and API**: Both command-line tool and programmatic interface available

## Tech Stack

- Runtime: Bun
- Language: TypeScript
- LLM Provider: OpenRouter
- AI SDK: Vercel AI SDK
- Architecture: Multi-agent orchestration

## Why It Matters

System prompts contain proprietary instructions, business logic, and sensitive configurations. Attackers use prompt injection to extract this data. ZeroLeaks helps identify these vulnerabilities before they're exploited in production.

## Links

- [GitHub](https://github.com/ZeroLeaks/zeroleaks)
- [Hosted Version](https://zeroleaks.ai)
- [Original Tweet](https://x.com/NotLucknite/status/2017730892307853625)
