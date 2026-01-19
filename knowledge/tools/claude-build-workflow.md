---
title: "Claude Build Workflow"
type: tool
date_added: 2026-01-19
source: "https://github.com/rohunj/claude-build-workflow"
tags: [claude-code, automation, autonomous-development, workflow, prd, bmad-method, ralph-loop, github-codespaces]
via: "Twitter bookmark from @RohunJauhar"
---

An automated workflow for building apps, systems, and automations with Claude Code. Describe what you want to build, answer interview questions, and let it build autonomously while you close your laptop.

## Key Features

- **Guided Discovery** - BMAD method interviews you about what you're building, pushing back on vague ideas and challenging assumptions
- **Automated PRD Generation** - Creates detailed product requirements documents with user stories
- **Architecture Design** - Automatically designs technical architecture based on requirements
- **Edge Case Analysis** - Analyzes potential edge cases you might miss during initial planning
- **Story Quality Validation** - Validates that user stories are small enough for autonomous execution
- **Autonomous Execution** - Ralph loop runs up to 100 iterations without intervention
- **Phone Access** - Start on laptop, monitor progress and continue from phone via GitHub Codespaces
- **Push Notifications** - Get notified on your phone when builds complete or need attention
- **One-Command Setup** - Minimal configuration required to get started

## How It Works

The workflow combines three open-source projects:

1. **BMAD Method** - Discovery/interview framework that forces deliberate thinking before building
2. **Ralph Loop** - Autonomous execution loop that iteratively solves problems by throwing tokens at challenges
3. **Amp Skills** - Utility skills for PRD generation, quality checks, progress tracking, and automatic commits

### The Complete Flow

```
You: "I want to build a habit tracker"
    ↓
Claude interviews you (5-10 min)
    ↓
PRD + Architecture created
    ↓
Edge cases analyzed
    ↓
Stories validated for autonomous execution
    ↓
Autonomous build starts (Ralph loop)
    ↓
[You close laptop, go about your day]
    ↓
Phone notification: "Build complete!"
```

## Quick Start

```bash
# Clone and setup
git clone https://github.com/rohunj/claude-build-workflow.git
cd claude-build-workflow

# One-time setup
./one-time-setup.sh      # Sets up GitHub template repo
./setup-notifications.sh # Sets up phone notifications via ntfy
```

Then build something:

```bash
cd /path/to/claude-build-workflow && claude
```

Say: `Run the workflow`

Answer the questions. When ready, say "Start now" and close your laptop.

## Key Commands

```bash
claude
> "Run the workflow"   # Start the full workflow
```

## Requirements

- Claude Code CLI installed
- GitHub account
- `jq` for JSON parsing (install with: `brew install jq`)
- ntfy app on your phone (for notifications)

## Project Structure

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Main workflow instructions (Claude reads this) |
| `ralph.sh` | Autonomous build loop with iteration tracking |
| `skills/` | PRD generation, edge cases, story quality validation, progress tracking |
| `one-time-setup.sh` | Sets up GitHub template repository |
| `setup-notifications.sh` | Sets up ntfy phone notifications |

## Use Cases

- Rapidly prototype MVP applications without manual intervention
- Accelerate development cycles by automating repetitive planning and implementation
- Build side projects while focusing on other work
- Learn from autonomous execution patterns and edge case handling
- Establish standardized development workflows for teams

## Credits

Built on top of:
- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) - Discovery and planning methodology
- [Ralph](https://github.com/snarktank/ralph) - Autonomous execution loop
- [Amp Skills](https://github.com/snarktank/amp-skills) - Utility skills library

## Links

- [GitHub Repository](https://github.com/rohunj/claude-build-workflow)
- [Twitter Thread](https://x.com/RohunJauhar/status/2012983351288692941)
