# ⊹ PUPPY'S PALS ⊹

> A little companion that follows your cursor and taps along as you type in SillyTavern.

[![SillyTavern](https://img.shields.io/badge/SillyTavern-Extension-9333ea)](https://github.com/SillyTavern/SillyTavern)
[![Version](https://img.shields.io/badge/version-1.0.0-3b82f6)](manifest.json)
[![Author](https://img.shields.io/badge/author-aceenvw-1f2937)](https://github.com/aceeenvw)
[![License](https://img.shields.io/badge/license-GPL--3.0-10b981)](LICENSE.txt)

A fork of [Puppy's JanitorAI Chat Pets](https://github.com/PuppyWasTaken/Puppys-JanitorAI-Chat-Pets) by **PuppyWasTaken / Permanent**, adapted for **SillyTavern** by **aceenvw**.

## Features

- **11 original pets** with cursor-following movement and typing poses.
- **Up to 5 named custom pets**, each with **3–9 frames** — frame 1 is idle; the rest advance in order as you type.
- **Desktop-only typing sounds** — Typewriter, Keyboard, iPhone, or your own named clip. Off by default.
- **Pet size** — 32–300 px (100 px by default), with adjustable height and automatic fitting to smaller chat bars.
- **Native settings**, touch-friendly controls, reduced-motion support, and English/Russian UI.

## Install

In SillyTavern, open **Extensions → Install Extension**, paste this repository's URL, and reload after installing.

For manual installation, copy the `puppys-pals` folder into:

```text
SillyTavern/public/scripts/extensions/third-party/
```

## Use

Open a chat, then **Extensions → ⊹ PUPPY'S PALS ⊹**. Enable **Show my pet**, choose a pet, and adjust its size and height. On mobile, the pet stays above the input bar and follows the caret horizontally. On desktop, expand **Sound** and enable **Typing sound** to choose a sound style.

### Custom pets

1. Open **Manage Custom Pets → New pet**, enter a name, and add 3–9 images. Frame 1 is idle.
2. Click **Save custom pet**. Saved pets appear by name in **Pet appearance**.
3. Select a pet in the manager to rename or edit it. **Delete pet** removes its name and all frames; deleting the active pet switches to Samoyed.

PNG, JPEG, and WebP are supported, up to **5 MiB** and **4096 × 4096 px** per image. Frames are resized and bottom-aligned automatically.

At five pets, delete one before adding another. Saving replaces only the edited pet’s frames. Switching pets or closing discards unsaved edits.

### Custom sound (desktop)

Expand **Sound**, enable **Typing sound**, then use **Custom sound → Upload / replace**. The clip is saved and selected immediately. Edit its name and click **Save name** to rename it; **Remove sound** deletes its name and audio.

Use a short click, ideally **0.1–0.5 seconds**, since it restarts with each keystroke. MP3, WAV, OGG, and M4A are accepted, up to **2 MiB** and **5 seconds**, depending on browser playback support.

One custom sound is stored at a time. Uploading replaces it; failed uploads keep the previous sound.

Custom images and audio stay in this browser, are not uploaded or synced, and are removed when you clear site data.

**GPL-3.0** — original pet assets by PuppyWasTaken / Permanent. See [LICENSE.txt](LICENSE.txt).
