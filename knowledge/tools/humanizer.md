---
title: "Humanizer"
type: tool
date_added: 2026-01-18
source: "https://github.com/blader/humanizer"
tags: [ai-writing, claude-code, skill, text-processing]
via: "Twitter bookmark from @blader"
---

A Claude Code skill that removes signs of AI-generated writing from text, making it sound more natural and human. Based on Wikipedia's comprehensive "Signs of AI writing" guide maintained by WikiProject AI Cleanup.

## Key Features

- Detects and removes 24 distinct patterns of AI-generated writing
- Covers content patterns (significance inflation, notability name-dropping, superficial analyses)
- Addresses language patterns (AI vocabulary, copula avoidance, synonym cycling)
- Fixes style issues (em dash overuse, boldface overuse, curly quotes)
- Removes communication patterns (chatbot artifacts, sycophantic tone)
- Eliminates filler and excessive hedging

## Installation

Clone directly into Claude Code skills directory:

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer
```

## Usage

In Claude Code:
```
/humanizer

[paste your text here]
```

## Links

- [GitHub](https://github.com/blader/humanizer)
- [Original Tweet](https://x.com/blader/status/2013015738622284156)
- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
