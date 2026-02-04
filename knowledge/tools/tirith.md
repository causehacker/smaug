---
title: "Tirith"
type: tool
date_added: 2026-02-02
source: "https://github.com/sheeki03/tirith"
tags: [security, terminal, shell, rust, homograph-attack, supply-chain-security]
via: "Twitter bookmark from @sheeki03"
---

Tirith is a terminal security tool that guards against homograph attacks, ANSI injection, and pipe-to-shell exploits. It's an invisible shell hook that catches malicious commands before execution—addressing vulnerabilities that browsers have solved but terminals haven't.

## Key Features

- **Homograph attack detection**: Catches Cyrillic/Greek lookalike characters in URLs (e.g., іnstall vs install)
- **ANSI injection blocking**: Stops escape sequences that manipulate terminal display
- **Pipe-to-shell warnings**: Warns about `curl | bash` and similar risky patterns
- **Dotfile protection**: Blocks malicious downloads targeting ~/.bashrc, ~/.ssh/authorized_keys, etc.
- **30+ security rules** across 7 categories: homograph attacks, terminal injection, pipe-to-shell, dotfile attacks, insecure transport, ecosystem threats, credential exposure
- **Zero friction**: Sub-millisecond overhead, local-only analysis, no telemetry
- **Multi-shell support**: Works with zsh, bash, fish, and PowerShell

## Why It Matters

Modern development practices (copying commands from ChatGPT, running `curl | bash` installers) have created new attack vectors. Tirith addresses the gap between browser security (which blocks homograph attacks) and terminal security (which doesn't).

## Links

- [GitHub](https://github.com/sheeki03/tirith)
- [Original Tweet](https://x.com/sheeki03/status/2018382483465867444)
