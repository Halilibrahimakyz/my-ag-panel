# Antigravity Quota Dashboard

An unofficial, robust quota tracking extension for developers using the Antigravity IDE natively in VS Code.

This extension discovers your local Antigravity Language Server seamlessly and monitors your LLM model usages without requiring any external accounts, API keys, or third-party web sockets. Everything is executed securely and locally on your machine.

## Features

- **Zero Config Setup:** Automatically scans local background processes to securely capture the CSRF token from the Antigravity server. No logins required.
- **Status Bar Integration:** A minimal and elegant active integration living directly on your VS Code Status Bar. Shows top active models with their real-time quotas.
- **Clean Tooltips:** Hover over the Status Bar to see a purely formatted breakdown of all quota models and their remaining reset timers perfectly mirroring the panel.
- **Dedicated Webview Panel:** A beautifully designed side-panel (`Ag Quota`) featuring dynamic progress blocks, an auto-refresh toggle, user profiling, and simple switches to pin/unpin individual models directly to your Status Bar.
- **Immediate Data Delivery:** Handshake optimized. Upon opening the webview, existing quota statistics populate instantly without needing manual clicks.
- **Smart Auto-Refresh:** Built-in polling logic locally updates background trackers and front-end displays synchronically every 60 seconds ensuring you don't overshoot your thresholds.

## Compatibility

> [!WARNING]
> This extension uses `ps -A` under the hood to discover the Antigravity server process. Currently, it fully supports **macOS and Linux environments**. Windows OS support is not yet implemented.

## Local Installation

You can easily compile and start using or testing this extension right away on your local VS Code environment.

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd my-ag-panel
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Compile the Typescript code:**
   ```bash
   npm run compile
   ```

## Installing into your IDE

The quickest and easiest way to load this extension permanently into your VS Code:

1. Open VS Code and press **Cmd+Shift+P** (or Ctrl+Shift+P on Windows).
2. Type and select `Developer: Install Extension from Location...`.
3. Select this compiled project directory (the folder containing `package.json`).
4. Press **Cmd+Shift+P** again, execute `Developer: Reload Window`, and you're good to go!

---

_Developer Note:_ If you edit the source code later and want to see your changes instantly, simply run `npm run compile` in your terminal and execute `Developer: Reload Window` again.

## Usage

1. Click on the **Ag Quota** icon on your Activity Bar (usually on the left side) to open the side panel.
2. Toggle specific LLMs (like Claude 3.5 Sonnet) on/off to pin them automatically to the Status Bar at the bottom right.
3. Keep an eye on the bottom bar for your running quote, and hover over it anytime for an elegant drop-up summary.

## Privacy & Security

Designed purely for security, this extension never connects to third-party dashboards or cloud tools. It talks directly to `127.0.0.1` locally with your IDE's very own token.
