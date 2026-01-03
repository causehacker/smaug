---
title: "summarize"
type: tool
date_added: 2026-01-03
source: "https://summarize.sh/"
tags: [cli, chrome-extension, ai, summarization, transcription, youtube, podcast]
via: "Twitter bookmark from @smerchek"
---

A CLI tool and Chrome Side Panel extension for fast extraction and summarization of content. Built by @steipete, it provides a full extraction pipeline supporting URLs, PDFs, images, audio/video, YouTube, and podcasts.

## Key Features

- **CLI + Chrome Extension**: Use from terminal for automation or browser side panel for one-click summaries
- **Rich extraction pipeline**: HTML cleaning (Readability, markitdown, Firecrawl fallback)
- **Media-first workflow**: Prefers published transcripts, falls back to Whisper for audio/video
- **Provider-agnostic**: Works with local OpenAI-compatible gateways, paid providers, and OpenRouter free models
- **Scriptable output**: JSON, Markdown, extraction-only, and metrics modes
- **YouTube/Podcast aware**: Automatically extracts transcripts when available

## Use Cases

- Automating content summarization in scripts
- Quick summaries while browsing (Chrome Side Panel)
- Processing podcasts and YouTube videos without listening/watching
- Extracting clean text from paywalled articles (with Firecrawl)

## Installation

```bash
npm i -g @steipete/summarize
```

## Example Usage

```bash
summarize "https://example.com" --length long
summarize "https://youtu.be/..." --youtube auto
summarize "/path/report.pdf" --model google/gemini-3-flash-preview
```

## Links

- [Website](https://summarize.sh/)
- [GitHub](https://github.com/steipete/summarize)
- [Original Tweet](https://x.com/smerchek/status/2007223767060066734)
