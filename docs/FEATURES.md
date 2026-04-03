# Universal Hotbox OS - Features

## Current Feature Set

### 1) Global Hotbox Overlay
- Global shortcut (`Shift+Space`) to toggle hotbox from any app.
- Transparent, frameless, always-on-top overlay.
- Cursor-centered window positioning for contextual access.

### 2) Radial Navigation System
- Circular menu with slice-based directional interaction.
- Submenu depth support (main -> submenu -> child menu).
- Depth-based color mapping:
  - Main: `Level0`
  - First submenu: `Level1`
  - Child submenu: `Level2`
  - Deeper levels: `Level3`
- Hover highlight using `Highlight` color.

### 3) Command Actions
- `launch_app`: launch executable targets.
- `run_script`: run script files/commands.
- `open_folder`: folder navigation/open workflows.
- `submenu`: nested menu switching.
- `cancel`: close and reset to main menu.

### 4) Advanced Folder Workflow
For `open_folder` actions:
- Hover trigger (dwell): attempts to navigate currently active Explorer/Open/Save window to selected path.
- Click trigger: opens selected path in a new Explorer window.
- Environment variable paths supported (`%userprofile%`, etc.).

### 5) Hover Dwell Engine
- Hover-trigger navigation with configurable delay.
- Movement threshold guard to prevent accidental activation.
- Works for both `open_folder` and `submenu` actions (multi-level hover navigation).
- Controlled by settings in `config/ui-style.json` (with safe runtime defaults).

### 6) Runtime UI Controls
- In-radial top-right micro controls:
  - `-` decrease size
  - `+` increase size
  - `⚙` open editor
- Keyboard and mouse scaling:
  - `+` / `-` keys resize radial
  - `Ctrl + Mouse Wheel` resizes radial

### 7) Built-In Menu Editor GUI
- Left-side settings panel aligned beside the radial (does not overlay the radial center).
- Full rollout sections with collapse/expand support.
- Menu editor rollout:
  - Add/Delete menu entries.
  - Add/Edit/Delete item entries.
  - Reorder items (`Move Up` / `Move Down`).
  - Convert hierarchy (`Upper` / `Lower`).
  - Tree-style visual listing.
- UI style rollout:
  - Section collapse/expand (`Colors`, `Opacity`, `Radius`, `Hover`).
  - Native color picker inputs with live preview updates.
  - Numeric and boolean behavior controls.
- Save persists both menu and UI style configs.

### 8) Config System
- Primary source: `config/hotbox.json`.
- Fallback parser: `config/folders.txt`.
- UI style source: `config/ui-style.json`.
- Save APIs write pretty-formatted JSON for both files.

### 9) Startup Process Hygiene
- Startup script closes older Hotbox instances before launching a new session.
- Targets only this project tag/executable patterns (does not blindly close all Electron apps).

### 10) Reliability/Compatibility
- Software-rendering-compatible Electron startup configuration for VM/limited-GPU contexts.
- Single-instance protection.
- Global shortcut registration/unregistration lifecycle handling.

## Planned/Next Features
- Per-app context auto-menu switching.
- True visual drag-and-drop tree editor.
- Gesture-drawn commands.
- Plugin adapters for creative apps.
- Export/import profiles and cloud sync.
