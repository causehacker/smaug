---
title: "Smaug - Twitter Bookmark Archiver"
type: tool
date_added: 2026-01-04
date_updated: 2026-01-04
source: "https://github.com/alexknowshtml/smaug"
tags: [twitter, bookmarks, archiving, markdown, automation, knowledge-management, claude-code]
via: "Twitter bookmark from @alexhillman"
---

A tool that automatically archives Twitter/X bookmarks to markdown files. Like a dragon hoarding treasure, Smaug collects valuable bookmarked content and organizes it into a personal knowledge system.

## Features

- Automatic bookmark fetching from Twitter/X using bird CLI
- t.co link expansion to reveal actual URLs
- Content extraction from GitHub repos, articles, and quote tweets
- Claude Code integration for intelligent analysis and categorization
- Markdown-based archiving organized by date
- Knowledge library filing system (tools, articles, etc.)
- Customizable category system for different content types
- Support for bookmark folders as tags
- Pagination support for fetching entire bookmark history
- Token usage tracking and cost controls

## Quick Start

```bash
git clone https://github.com/alexknowshtml/smaug
cd smaug
npm install
npx smaug setup
npx smaug run
```

## Key Commands

```bash
npx smaug fetch 20                    # Fetch 20 recent bookmarks
npx smaug fetch --all                 # Fetch all bookmarks (paginated)
npx smaug process                     # Process fetched bookmarks
npx smaug run                         # Full job (fetch + process)
```

## Links

- [GitHub](https://github.com/alexknowshtml/smaug)
- [Original Tweet](https://x.com/alexhillman/status/2006968571268661423)
