import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Antigravity Quota</title>
    <style>
        :root {
            --bg-color: var(--vscode-editor-background);
            --text-color: var(--vscode-foreground);
            --accent-color: var(--vscode-textLink-foreground);
            --border-color: var(--vscode-panel-border, var(--vscode-activityBar-border, rgba(128,128,128,0.2)));
            --card-bg: var(--vscode-editorWidget-background, transparent);
            --hover-bg: var(--vscode-list-hoverBackground, rgba(255,255,255,0.05));
            --tier-bg: var(--vscode-badge-background, #007acc);
            --tier-fg: var(--vscode-badge-foreground, #ffffff);
            --seg-empty: var(--vscode-editorWidget-border, rgba(128,128,128,0.2));
            --seg-filled: var(--vscode-progressBar-background, #0e70c0);
            --seg-warn: var(--vscode-editorWarning-foreground, #cca700);
            --seg-crit: var(--vscode-editorError-foreground, #f48771);
            --seg-pool: var(--vscode-descriptionForeground, #6b7280);
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--text-color);
            background-color: var(--bg-color);
            padding: 4px 12px 12px 12px;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .glass-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 12px;
        }

        h2 {
            margin-top: 0;
            font-size: 11px;
            text-transform: uppercase;
            color: var(--vscode-sideBarTitle-foreground, var(--text-color));
            margin-bottom: 12px;
            font-weight: 600;
            opacity: 0.8;
            letter-spacing: 0.5px;
        }

        .progress-segments {
            display: flex;
            gap: 2px;
            height: 4px;
            margin-top: 8px;
            width: 100%;
        }

        .segment {
            flex: 1;
            background: var(--seg-empty);
            transition: background 0.3s;
        }

        .segment.filled { background: var(--seg-filled); }
        .segment.filled.warning { background: var(--seg-warn); }
        .segment.filled.critical { background: var(--seg-crit); }
        .segment.filled.pool { background: var(--seg-pool); }

        button.refresh-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border, transparent);
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            width: 100%;
            transition: background 0.2s;
        }

        button.refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .status {
            text-align: center;
            font-size: 11px;
            opacity: 0.7;
            margin-top: 8px;
        }

        .loader {
            border: 2px solid var(--border-color);
            border-top: 2px solid var(--accent-color);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
            display: none;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .user-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 12px;
        }
        
        .user-info .tier {
            display: inline-block;
            background: var(--tier-bg);
            color: var(--tier-fg);
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 10px;
            font-weight: bold;
            width: fit-content;
            margin-bottom: 4px;
        }

        .models-container {
            display: flex;
            flex-direction: column;
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }
        
        .model-item {
            padding: 8px 10px;
            border-bottom: 1px solid var(--border-color);
            transition: background 0.2s;
        }
        
        .model-item:last-child {
            border-bottom: none;
        }

        .model-item:hover {
            background: var(--hover-bg);
        }

        .model-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            margin-bottom: 4px;
        }

        .model-name {
            font-weight: 600;
            display: flex;
            align-items: center;
        }

        .reset-time {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
        }

        /* Switch Toggle Styling */
        .switch {
            position: relative;
            display: inline-block;
            width: 24px;
            height: 14px;
            margin-left: 8px;
        }
        .switch input { display: none; }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: var(--vscode-checkbox-background, rgba(128,128,128,0.3));
            border-radius: 14px;
            transition: .2s;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 10px; width: 10px;
            left: 2px; bottom: 2px;
            background-color: var(--vscode-editor-background, #fff);
            border-radius: 50%;
            transition: .2s;
        }
        input:checked + .slider {
            background-color: var(--vscode-button-background, #0e70c0);
        }
        input:checked + .slider:before {
            transform: translateX(10px);
        }

        #content {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .hidden {
            display: none !important;
        }
            display: none !important;
        }
    </style>
</head>
<body>
    <div id="loading" class="loader"></div>
    <div id="error" class="status" style="color: #f5576c;"></div>

    <div id="content" class="hidden">
        <div class="glass-card">
            <h2>User Profile</h2>
            <div class="user-info">
                <div id="userTier" class="tier">Tier</div>
                <div id="userName">User Name</div>
                <div id="userEmail" style="font-size: 11px; opacity: 0.7;"></div>
            </div>
        </div>

        <div class="glass-card">
            <h2>Models Usage</h2>
            <div class="models-container" id="modelsList">
                <!-- Models inserted here -->
            </div>
        </div>
    </div>

    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <button class="refresh-btn" style="flex: 1;" onclick="refresh()">Refresh Data</button>
        <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
            <span style="font-size: 11px; opacity: 0.8;">Auto Refresh (60s)</span>
            <label class="switch" title="Toggle Auto Refresh (60s)">
                <input type="checkbox" id="autoRefreshToggle" onchange="toggleAutoRefresh(this.checked)">
                <span class="slider"></span>
            </label>
        </div>
    </div>
    <div id="lastUpdated" class="status"></div>

    <script>
        const vscode = acquireVsCodeApi();
        let refreshInterval = null;

        function refresh() {
            vscode.postMessage({ type: 'refresh' });
        }

        function toggleAutoRefresh(enabled) {
            const state = vscode.getState() || {};
            vscode.setState({ ...state, autoRefresh: enabled });
            
            if (enabled) {
                if (!refreshInterval) refreshInterval = setInterval(refresh, 60000);
            } else {
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                    refreshInterval = null;
                }
            }
        }

        // Let extension know we're ready
        vscode.postMessage({ type: 'ready' });

        // Initialize state
        const initialState = vscode.getState() || { autoRefresh: true };
        document.getElementById('autoRefreshToggle').checked = initialState.autoRefresh;
        toggleAutoRefresh(initialState.autoRefresh);

        function toggleModel(modelId, isVisible) {
            vscode.postMessage({ type: 'toggleModel', modelId, isVisible });
        }

        function getProgressColorClass(percentage) {
            if (percentage < 20) return 'critical';
            if (percentage < 35) return 'warning';
            return '';
        }

        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'loading') {
                document.getElementById('loading').style.display = 'block';
                document.getElementById('error').innerText = '';
                document.getElementById('content').classList.add('hidden');
            } 
            else if (message.type === 'error') {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').innerText = message.message;
            }
            else if (message.type === 'update') {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').classList.remove('hidden');
                
                try {
                    const status = message.data.userStatus;
                    
                    if (!status) {
                         document.getElementById('error').innerText = 'No user status found in response';
                         return;
                    }

                    // User Info
                    const tier = status.userTier?.name || status.planStatus?.planInfo?.teamsTier || 'Free';
                    document.getElementById('userTier').innerText = tier.toUpperCase();
                    document.getElementById('userName').innerText = status.name || status.email || 'Anonymous';
                    const emailEl = document.getElementById('userEmail');
                    if (status.email && status.email !== status.name) {
                        emailEl.innerText = status.email;
                        emailEl.style.display = 'block';
                    } else {
                        emailEl.style.display = 'none';
                    }

                    // Models
                    const modelsList = document.getElementById('modelsList');
                    let modelsHtml = '';
                    const rawModels = status.cascadeModelConfigData?.clientModelConfigs || [];

                    // Sort alphabetically to maintain consistent order
                    rawModels.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
                    
                    let modelDelay = 150;
                    for (const m of rawModels) {
                        if (!m.quotaInfo) continue;
                        
                        const fractionStr = m.quotaInfo.remainingFraction !== undefined 
                            ? (m.quotaInfo.remainingFraction * 100).toFixed(0) + '%'
                            : 'Havuz';
                            
                        const pct = m.quotaInfo.remainingFraction !== undefined 
                            ? Math.max(0, Math.min(100, m.quotaInfo.remainingFraction * 100))
                            : 0;
                            
                        const resetTime = new Date(m.quotaInfo.resetTime);
                        const isInvalidTime = isNaN(resetTime.getTime());
                        const now = new Date();
                        const diffMs = resetTime.getTime() - now.getTime();
                        
                        let timeDiffStr = '';
                        if (!isInvalidTime && diffMs > 0) {
                            const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
                            const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            if (hoursLeft > 0) {
                                timeDiffStr = \`(\${hoursLeft}h \${minsLeft}m left)\`;
                            } else {
                                timeDiffStr = \`(\${minsLeft}m left)\`;
                            }
                        } else {
                            timeDiffStr = '(Reset)';
                        }
                        
                        const timeStr = isInvalidTime ? 'Unknown' : resetTime.toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
                        const barColor = getProgressColorClass(pct);
                        
                        let segmentsHtml = '';
                        for (let i = 0; i < 5; i++) {
                            const segmentThreshold = i * 20;
                            const isFilled = pct > segmentThreshold;
                            const classes = \`segment \${isFilled ? 'filled' : ''} \${isFilled ? barColor : ''}\`.trim();
                            segmentsHtml += \`<div class="\${classes}" style="transition-delay: \${modelDelay + i*30}ms"></div>\`;
                        }
                        
                        const isChecked = message.selectedModels && message.selectedModels.includes(m.modelOrAlias?.model);
                        const switchHtml = \`
                            <label class="switch" title="Show in Status Bar">
                                <input type="checkbox" data-id="\${m.modelOrAlias?.model}" \${isChecked ? 'checked' : ''} onchange="toggleModel(this.dataset.id, this.checked)">
                                <span class="slider"></span>
                            </label>\`;
                        
                        modelsHtml += \`
                            <div class="model-item">
                                <div class="model-header">
                                    <div style="display:flex; flex-direction:column; gap:2px;">
                                        <span class="model-name">\${m.label}</span>
                                        <span class="reset-time">Resets: \${timeStr} \${timeDiffStr}</span>
                                    </div>
                                    <div style="display:flex; align-items:center;">
                                        \${switchHtml}
                                    </div>
                                </div>
                                <div class="progress-segments">\${segmentsHtml}
                                </div>
                            </div>
                        \`;
                        modelDelay += 50;
                    }
                    
                    if (!modelsHtml) modelsHtml = '<div class="status">No model quota specific data</div>';
                    modelsList.innerHTML = modelsHtml;

                    const now = new Date();
                    document.getElementById('lastUpdated').innerText = 'Last updated: ' + now.toLocaleTimeString();
                    
                } catch (e) {
                    document.getElementById('error').innerText = 'Error parsing data: ' + e.message;
                }
            }
        });
    </script>
</body>
</html>`;
}
