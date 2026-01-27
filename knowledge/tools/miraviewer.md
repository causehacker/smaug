---
title: "MiraViewer"
type: tool
date_added: 2026-01-25
source: "https://github.com/blader/MiraViewer"
tags: [medical, mri, dicom, healthcare, open-source]
via: "Twitter bookmark from @blader"
---

MiraViewer is a browser-based DICOM viewer specifically designed for comparing MRI brain scans across multiple dates. Built by Siqi Chen to help track his daughter's brain tumor progression, it runs entirely locally in the browser with no server required—all data stays on your device via IndexedDB storage.

The tool was created out of necessity when Chen and his family were tracking his daughter Mira's adamatinomatous craniopharyngioma treatment. The painful manual process of comparing MRI scans across dates inspired him to build a tool that automates alignment, brightness/contrast matching, and synchronized viewing of tumor progression.

## Key Features

- **Local-first architecture**: Runs entirely in browser with IndexedDB storage, no server needed
- **DICOM Import**: Import folders or ZIP archives of DICOM files directly in browser
- **Synchronized comparison matrix**: View the same MRI sequence across multiple dates in a synchronized grid
- **Intelligent alignment**: Click and drag a rectangle around a tumor on any image, and the tool automatically finds matching slices from other scans
- **Automatic registration**: Matches brightness/contrast, rotation, pan, zoom, and even shear across dates
- **Overlay mode**: Flip between dates quickly for visual comparison (hold space bar to toggle)
- **Synchronized navigation**: Bottom slider keeps anatomical position aligned across dates
- **Per-date panel settings**: Persist slice offset, zoom, rotation, brightness/contrast, and pan per date
- **Export/backup**: Download your data as ZIP for backup or transfer

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- DICOM Parsing: dicom-parser
- Medical Imaging: Cornerstone.js
- Local Storage: IndexedDB via idb
- Icons: Lucide React

## Why It Matters

This is a deeply personal tool built to solve a real medical challenge—tracking tumor progression for a loved one. It represents the power of engineering applied to healthcare problems, making complex medical imaging comparisons accessible and efficient. The tool is completely free, private, and open source, demonstrating Chen's commitment to helping others who might face similar challenges.

## Links

- [GitHub](https://github.com/blader/MiraViewer)
- [Live App](https://miraviewer.org/)
- [Original Tweet](https://x.com/blader/status/2015686527482044599)
- [Donate to UCSF Children's Hospital](https://donate.ucsfbenioffchildrens.org/fund/childrens-fund?appealCode=KBCH21)
