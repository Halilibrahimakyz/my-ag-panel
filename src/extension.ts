import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as http from 'http';
import { getWebviewContent } from './webview';

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    const quotaManager = QuotaManager.getInstance(context);
    
    const provider = new QuotaViewProvider(context.extensionUri, quotaManager);
    quotaManager.setViewProvider(provider);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('ag.quotaView', provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ag.refreshQuota', () => {
            quotaManager.refresh();
        })
    );
}

interface ServerInfo {
    port: number;
    csrfToken: string;
    protocol: 'http' | 'https';
}

class QuotaManager {
    private static instance: QuotaManager;
    private statusBarItem: vscode.StatusBarItem;
    private pollInterval: NodeJS.Timeout | null = null;
    private lastData: any = null;
    private viewProvider: QuotaViewProvider | null = null;

    private constructor(private readonly context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'ag.refreshQuota';
        this.statusBarItem.text = "$(pulse) Antigravity Quota: Loading...";
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);

        this.pollInterval = setInterval(() => this.refresh(), 60 * 1000);
        this.refresh();
    }

    public static getInstance(context?: vscode.ExtensionContext): QuotaManager {
        if (!QuotaManager.instance && context) {
            QuotaManager.instance = new QuotaManager(context);
        }
        return QuotaManager.instance;
    }

    public setViewProvider(provider: QuotaViewProvider) {
        this.viewProvider = provider;
        if (this.lastData) {
            const selectedModels = this.getSelectedModels();
            this.viewProvider.updateData(this.lastData, selectedModels);
        }
    }

    public getSelectedModels(): string[] {
        return this.context.globalState.get<string[]>('ag.selectedStatusBarModels', []);
    }

    public async toggleStatusBarModel(modelId: string, isVisible: boolean) {
        let selectedModels = this.getSelectedModels();
        if (isVisible && !selectedModels.includes(modelId)) {
            selectedModels.push(modelId);
        } else if (!isVisible) {
            selectedModels = selectedModels.filter(id => id !== modelId);
        }
        await this.context.globalState.update('ag.selectedStatusBarModels', selectedModels);
        
        if (this.lastData) {
            this.updateStatusBar(this.lastData);
        }
    }

    public async refresh() {
        try {
            if (this.viewProvider) this.viewProvider.setLoading();

            const serverInfo = await this.discoverServer();
            if (!serverInfo) {
                const msg = 'Antigravity IDE server not found. Is the IDE running?';
                if (this.viewProvider) this.viewProvider.setError(msg);
                this.statusBarItem.text = "$(error) Antigravity: Server Not Found";
                this.statusBarItem.tooltip = msg;
                return;
            }

            const data = await this.fetchQuota(serverInfo);
            this.lastData = data;
            
            this.updateStatusBar(data);

            if (this.viewProvider) {
                const selectedModels = this.getSelectedModels();
                this.viewProvider.updateData(data, selectedModels);
            }
        } catch (error: any) {
            const msg = error.message || 'Unknown error';
            if (this.viewProvider) this.viewProvider.setError(msg);
            this.statusBarItem.text = `$(error) Antigravity: Error`;
            this.statusBarItem.tooltip = msg;
        }
    }

    private updateStatusBar(data: any) {
        const status = data.userStatus;
        if (!status) return;

        const rawModels = status.cascadeModelConfigData?.clientModelConfigs || [];
        if (rawModels.length === 0) return;

        // Sort alphabetically to maintain consistent order
        rawModels.sort((a: any, b: any) => (a.label || '').localeCompare(b.label || ''));

        const getPct = (m: any) => m.quotaInfo?.remainingFraction !== undefined 
            ? Math.max(0, Math.min(100, m.quotaInfo.remainingFraction * 100))
            : 0;

        const selectedIds = this.getSelectedModels();
        const selectedModels = rawModels.filter((m: any) => selectedIds.includes(m.modelOrAlias?.model));

        if (selectedModels.length === 0) {
            this.statusBarItem.text = `$(pulse) Quota: No Model Selected`;
        } else {
            const parts = selectedModels.map((m: any) => {
                const pct = getPct(m);
                let icon = '🟡';
                if (pct >= 100) icon = '🟢';
                else if (pct <= 0) icon = '🔴';
                
                return `${icon} ${m.label}: ${pct.toFixed(0)}%`;
            });
            this.statusBarItem.text = parts.join('  |  ');
        }

        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        markdown.appendMarkdown("**Antigravity Quota Models**\n\n---\n\n");
        
        for (const m of rawModels) {
            if (!m.quotaInfo) continue;
            const pct = getPct(m);
            const remainingFractionStr = `${pct.toFixed(0)}%`;

            let icon = '🟡';
            if (pct >= 100) icon = '🟢';
            else if (pct <= 0) icon = '🔴';

            const resetTime = new Date(m.quotaInfo.resetTime);
            const isInvalidTime = isNaN(resetTime.getTime());
            
            let timeDiffStr = '';
            if (!isInvalidTime) {
                const diffMs = resetTime.getTime() - new Date().getTime();
                if (diffMs > 0) {
                    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
                    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    timeDiffStr = hoursLeft > 0 ? `(${hoursLeft}h ${minsLeft}m left)` : `(${minsLeft}m left)`;
                } else {
                    timeDiffStr = '(Reset)';
                }
            }

            const timeStr = isInvalidTime ? 'Unknown' : resetTime.toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
            const isSelected = selectedIds.includes(m.modelOrAlias?.model) ? " *(Selected)*" : "";
            
            markdown.appendMarkdown(`${icon} **${m.label}** (${remainingFractionStr})${isSelected}\n\n`);
            markdown.appendMarkdown(`*Resets:* ${timeStr} ${timeDiffStr}\n\n`);
            markdown.appendMarkdown(`---\n\n`);
        }

        this.statusBarItem.tooltip = markdown;
    }

    private async discoverServer(): Promise<ServerInfo | null> {
        try {
            const { stdout } = await execAsync('ps -A -ww -o pid,ppid,args | grep "csrf_token" | grep -v grep');
            const lines = stdout.split('\n');
            
            const candidates: ServerInfo[] = [];

            for (const line of lines) {
                if (!line.trim()) continue;
                
                const tokenMatch = line.match(/--csrf_token[=\s]+(?:["']?)([a-zA-Z0-9\-_.]+)(?:["']?)/);
                if (!tokenMatch) continue;
                const csrfToken = tokenMatch[1];
                
                const httpsMatch = line.match(/--https_server_port[=\s]+(\d+)/);
                if (httpsMatch) {
                    candidates.push({ port: parseInt(httpsMatch[1], 10), csrfToken, protocol: 'https' });
                }
                
                const extMatch = line.match(/--extension_server_port[=\s]+(\d+)/);
                if (extMatch) {
                    candidates.push({ port: parseInt(extMatch[1], 10), csrfToken, protocol: 'http' });
                }
            }

            for (const candidate of candidates) {
                try {
                    await this.fetchQuota(candidate);
                    return candidate;
                } catch (e) {}
            }

        } catch (e) {
            console.error("Discovery error:", e);
        }
        return null;
    }

    private fetchQuota(serverInfo: ServerInfo): Promise<any> {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                metadata: {
                    ideName: 'antigravity',
                    extensionName: 'antigravity',
                    locale: 'en',
                }
            });

            const lib = serverInfo.protocol === 'https' ? require('https') : http;
            
            const req = lib.request({
                hostname: '127.0.0.1',
                port: serverInfo.port,
                path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
                method: 'POST',
                rejectUnauthorized: false,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'Connect-Protocol-Version': '1',
                    'X-Codeium-Csrf-Token': serverInfo.csrfToken,
                },
                timeout: 3000
            }, (res: any) => {
                let chunks = '';
                res.on('data', (chunk: any) => chunks += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const data = JSON.parse(chunks);
                            resolve(data);
                        } catch (e) {
                            reject(new Error("Invalid JSON response"));
                        }
                    } else {
                        reject(new Error(`Server responded with status ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (e: any) => reject(e));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error("Request timed out"));
            });

            req.write(body);
            req.end();
        });
    }
}

class QuotaViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly quotaManager: QuotaManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = getWebviewContent(webviewView.webview, this._extensionUri);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'ready':
                    {
                        this.quotaManager.refresh();
                        break;
                    }
                case 'refresh':
                    {
                        this.quotaManager.refresh();
                        break;
                    }
                case 'toggleModel':
                    {
                        await this.quotaManager.toggleStatusBarModel(data.modelId, data.isVisible);
                        break;
                    }
            }
        });
    }

    public setLoading() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'loading' });
        }
    }

    public setError(message: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'error', message });
        }
    }

    public updateData(data: any, selectedModels: string[]) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'update', data, selectedModels });
        }
    }
}
