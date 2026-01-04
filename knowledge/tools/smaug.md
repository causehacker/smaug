---
title: "Smaug - Twitter Bookmark Archiver"
type: tool
date_added: 2026-01-02
date_updated: 2026-01-04
source: "https://github.com/alexknowshtml/smaug"
tags: [twitter, bookmarks, archiving, markdown, automation, knowledge-management, claude-code]
via: "Twitter bookmark from @alexhillman"
---

A tool that automatically archives Twitter/X bookmarks to markdown files. Like a dragon hoarding treasure, Smaug collects valuable bookmarked content and organizes it into a personal knowledge system. It fetches bookmarks via the bird CLI, expands shortened URLs, extracts content from linked pages (GitHub repos, articles, quote tweets), and uses Claude Code to analyze and categorize each bookmark. Bookmarks are saved to markdown organized by date with rich context, and can be filed into a knowledge library structure.

## Key Features

- Automatic bookmark fetching from Twitter/X using bird CLI
- t.co link expansion to reveal actual URLs
- Content extraction from GitHub repos, articles, and quote tweets
- Claude Code integration for intelligent analysis and categorization
- Markdown-based archiving organized by date
- Knowledge library filing system (tools, articles, etc.)
- Customizable category system for different content types
- Automation support via PM2, cron, or systemd
- **NEW:** Bookmark folders carry over as tags
- **NEW:** Tweet dates show when posted (not when fetched)
- **NEW:** `--all` flag for fetching entire bookmark history with pagination
- **NEW:** Token usage tracking and cost controls

## Recent Updates (Jan 2026)

Thanks to first-time contributors @afalk, @webология, and aparente:
- X bookmark folders now preserved as tags in the archive
- Dates display when the tweet was posted instead of when fetched
- New `--all` flag enables paginated fetching of complete bookmark history
- `--max-pages` option to control pagination limits
- `--limit` flag with `-t` token tracking for cost management

## Links

- [GitHub](https://github.com/alexknowshtml/smaug)
- [Original Tweet](https://x.com/alexhillman/status/2006968571268661423)
