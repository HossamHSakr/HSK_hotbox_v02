# Universal Hotbox OS - Usage Guide

## Overview
Universal Hotbox OS is a global radial launcher for Windows.

- Trigger the hotbox from anywhere with `Shift+Space`.
- Navigate nested menus with consistent directional muscle memory.
- Run scripts, open folders, launch apps, and execute folder navigation workflows for Open/Save dialogs.

## Run the App
From the project root:

```powershell
npm install
npm start
```

## Core Controls
- `Shift+Space`: toggle hotbox show/hide
- `Esc`: go back one submenu level, or hide when on main level
- `+` / `-`: resize radial menu
- `Ctrl + Mouse Wheel`: resize radial menu
- Click center `X`: close hotbox

## Item Behavior
- `submenu`: opens target menu
- `launch_app`: starts an executable
- `run_script`: executes script/command file
- `open_folder`:
	- Hover trigger: navigate current Open/Save/Explorer window to selected directory
	- Mouse click: open selected directory in a new Explorer window
- Hover on `submenu`: opens submenu after hover dwell delay

## Menu Editor (Built-In GUI)
1. Open hotbox.
2. Click top-right `⚙` button.
3. Use the left-side editor panel (aligned beside radial, not on top of it).
4. Use rollout sections:
	- `Hotbox Menu Editor` (collapse/expand)
	- `UI Style (ui-style.json)` (collapse/expand)
5. In `Hotbox Menu Editor`, use actions:
	 - `Add`, `Del`, `Preview`, `Save File`
	 - `Move Up`, `Move Down`, `Upper`, `Lower`
6. Select a menu/item in the tree area.
7. Edit `Item Label`, `Path / Command`, and action type.
8. In `UI Style`, edit colors (native color picker), opacity, radius, and hover settings.
9. Click `Save File` to persist to both `config/hotbox.json` and `config/ui-style.json`.

## Configuration Source
Load order:
1. `config/hotbox.json` (preferred)
2. Fallback: parse `config/folders.txt` when JSON is missing

UI style source:
1. `config/ui-style.json` (preferred)
2. Fallback defaults inside renderer

## UI/Behavior Tuning
Tune radial visuals and hover behavior in `config/ui-style.json` or through the in-app UI Style rollout:

- `RadialOpacity`
- `RadialHoverOpacity`
- `CenterGrayOpacity`
- `TopRightMenuOpacity`
- `HoverNavigateEnabled`
- `HoverNavigateDelayMs`
- `HoverNavigateMaxMovePx`

## Troubleshooting
### App builds but does not start
Run:

```powershell
npm run build
npm start
```

If startup still fails intermittently:
- Close old Electron windows/processes
- Re-run `npm start`

### Folder hover navigation does not trigger
- Increase `HoverNavigateDelayMs`
- Increase `HoverNavigateMaxMovePx`
- Ensure `HoverNavigateEnabled` is `true`
- Hover works for both `open_folder` and `submenu` items

### Open/Save dialog did not change directory
- Keep the target app/dialog focused before opening hotbox
- Try hover selection first (non-click path navigation)
