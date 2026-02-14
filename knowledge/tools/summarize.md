---
title: "summarize"
type: tool
date_added: 2026-01-03
date_updated: 2026-02-13
source: "https://summarize.sh/"
tags: [cli, chrome-extension, ai, summarization, transcription, youtube, podcast, groq, cursor]
via: "Twitter bookmark from @smerchek (updated from @steipete)"
---

A CLI tool and Chrome Side Panel extension for fast extraction and summarization of content. Built by @steipete, it provides a full extraction pipeline supporting URLs, PDFs, images, audio/video, YouTube, and podcasts.

**Latest (v0.11):** Added Cursor integration for free tokens, Groq for faster TTS inference, and enhanced --slides mode with OCR + timestamped video frame extraction.

## Key Features

- **CLI + Chrome Extension**: Use from terminal for automation or browser side panel for one-click summaries
- **Rich extraction pipeline**: HTML cleaning (Readability, markitdown, Firecrawl fallback)
- **Media-first workflow**: Prefers published transcripts, falls back to Whisper for audio/video
- **Provider-agnostic**: Works with local OpenAI-compatible gateways, paid providers, and OpenRouter free models
- **Scriptable output**: JSON, Markdown, extraction-only, and metrics modes
- **YouTube/Podcast aware**: Automatically extracts transcripts when available
- **Slides mode (v0.11)**: Extract video frames with OCR and timestamps using `--slides`
- **Cursor integration (v0.11)**: Use Cursor for free AI tokens
- **Groq TTS (v0.11)**: Faster text-to-speech inference
- **Chat mode (v0.11)**: Streaming agent with history in Chrome Side Panel
- **OpenClaw integration**: Powers content summarization for OpenClaw agent system

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
# Basic summarization
summarize "https://example.com" --length long

# YouTube with slides (v0.11)
summarize "https://youtu.be/..." --slides

# YouTube with auto transcript
summarize "https://youtu.be/..." --youtube auto

# Specific model
summarize "/path/report.pdf" --model google/gemini-3-flash-preview

# Extract only (no summary)
summarize "https://example.com" --extract

# JSON output with metrics
summarize "https://example.com" --json --metrics
```

## Links

- [Website](https://summarize.sh/)
- [GitHub](https://github.com/steipete/summarize)
- [Chrome Web Store](https://chromewebstore.google.com/detail/summarize/cejgnmmhbbpdmjnfppjdfkocebngehfg)
- [v0.11.1 Release](https://github.com/steipete/summarize/releases/tag/v0.11.1)
- [Original Tweet](https://x.com/smerchek/status/2007223767060066734)
- [v0.11 Announcement Tweet](https://x.com/steipete/status/2022513027870810384)
