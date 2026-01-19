---
title: "Vibecraft"
type: tool
date_added: 2026-01-18
source: "https://github.com/Nearcyan/vibecraft"
tags: [claude-code, visualization, 3d, developer-tools, typescript]
via: "Twitter bookmark from @nearcyan"
---

A 3D visualization tool for managing Claude Code sessions. Watch Claude work in real-time as it moves between workstations (Bookshelf for Read, Desk for Write, Workbench for Edit, Terminal for Bash, etc.) in a visual 3D workshop environment. Now open-source at ~30,000 lines of code including scripts, hooks, visualizations, and sound.

## Key Features

- **Real-time 3D visualization** - Watch Claude move between different workstations as it uses different tools
- **Multi-session management** - Run multiple Claude instances simultaneously and direct work to each
- **Spatial audio** - Position-based audio feedback for different zones
- **Context-aware animations** - Claude celebrates commits, shows thinking bubbles, and reacts to errors
- **Voice control** - Speak prompts with real-time transcription (requires Deepgram API key)
- **Draw mode** - Paint hex tiles with colors, 3D stacking, and text labels
- **Station panels** - Toggle to see recent tool history per workstation
- **Browser control** - Send prompts from browser when running Claude in tmux

## Stations

| Station | Tools | Visual Elements |
|---------|-------|-----------------|
| Bookshelf | Read | Books on shelves |
| Desk | Write | Paper, pencil, ink pot |
| Workbench | Edit | Wrench, gears, bolts |
| Terminal | Bash | Glowing screen |
| Scanner | Grep, Glob | Telescope with lens |
| Antenna | WebFetch, WebSearch | Satellite dish |
| Portal | Task (subagents) | Glowing ring portal |
| Taskboard | TodoWrite | Board with sticky notes |

## Links

- [GitHub](https://github.com/Nearcyan/vibecraft)
- [Demo](https://vibecraft.sh/)
- [Original Tweet](https://x.com/nearcyan/status/2012948508764946484)
