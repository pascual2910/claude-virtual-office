import * as vscode from 'vscode';
import type { StatusBar } from './status-bar';

export class VirtualOfficePanel {
  public static currentPanel: VirtualOfficePanel | undefined;
  private static terminal: vscode.Terminal | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposed = false;

  static createOrShow(context: vscode.ExtensionContext, statusBar?: StatusBar): void {
    const column = vscode.ViewColumn.Beside;

    if (VirtualOfficePanel.currentPanel) {
      VirtualOfficePanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'claudeVirtualOffice',
      'Claude Virtual Office',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      }
    );

    VirtualOfficePanel.currentPanel = new VirtualOfficePanel(panel, context);

    // Auto-start server if configured and offline
    const config = vscode.workspace.getConfiguration('claudeVirtualOffice');
    const autoStart = config.get<boolean>('autoStart', false);
    if (autoStart && statusBar && !statusBar.isConnected()) {
      VirtualOfficePanel.currentPanel.startServerInTerminal();
    }
  }

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(
      () => {
        this.disposed = true;
        VirtualOfficePanel.currentPanel = undefined;
      },
      null,
      context.subscriptions
    );

    this.panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.type) {
          case 'openFile':
            if (msg.path) {
              vscode.workspace.openTextDocument(msg.path).then((doc) => {
                vscode.window.showTextDocument(doc);
              });
            }
            break;
          case 'startServer':
            this.startServerInTerminal();
            break;
        }
      },
      null,
      context.subscriptions
    );
  }

  private startServerInTerminal(): void {
    const config = vscode.workspace.getConfiguration('claudeVirtualOffice');
    const projectPath = config.get<string>('projectPath', '');

    if (!projectPath) {
      vscode.window
        .showWarningMessage(
          'Set "claudeVirtualOffice.projectPath" in settings to auto-start the server.',
          'Open Settings'
        )
        .then((choice) => {
          if (choice === 'Open Settings') {
            vscode.commands.executeCommand(
              'workbench.action.openSettings',
              'claudeVirtualOffice.projectPath'
            );
          }
        });
      return;
    }

    if (
      !VirtualOfficePanel.terminal ||
      VirtualOfficePanel.terminal.exitStatus !== undefined
    ) {
      VirtualOfficePanel.terminal = vscode.window.createTerminal({
        name: 'Virtual Office Server',
        cwd: projectPath,
      });
    }

    VirtualOfficePanel.terminal.show(true);
    VirtualOfficePanel.terminal.sendText('npm run dev');
  }

  private getHtml(): string {
    const port = vscode.workspace
      .getConfiguration('claudeVirtualOffice')
      .get<number>('port', 3377);

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Virtual Office</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family, system-ui, sans-serif);
    }

    iframe {
      border: none;
      width: 100%;
      height: 100%;
      display: none;
    }

    /* Loading state */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 1.25rem;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--vscode-editorWidget-border, #444);
      border-top-color: var(--vscode-progressBar-background, #0078d4);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading p {
      font-size: 0.875rem;
      color: var(--vscode-descriptionForeground);
    }

    /* Error state */
    .error {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      text-align: center;
    }

    .error h2 {
      color: var(--vscode-editorWarning-foreground, #cca700);
      font-size: 1.25rem;
      margin: 0 0 0.75rem;
      font-weight: 600;
    }

    .error p {
      margin: 0.375rem 0;
      line-height: 1.6;
      font-size: 0.875rem;
      color: var(--vscode-descriptionForeground);
    }

    .error code {
      background: var(--vscode-textCodeBlock-background, #1e1e1e);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.8125rem;
    }

    .error .steps {
      text-align: left;
      display: inline-block;
      margin-top: 1.25rem;
    }

    .error .steps li {
      margin: 0.375rem 0;
      font-size: 0.875rem;
    }

    .error .actions {
      display: flex;
      gap: 0.625rem;
      margin-top: 1.5rem;
    }

    .btn {
      padding: 6px 14px;
      border: none;
      border-radius: 2px;
      font-size: 0.8125rem;
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      cursor: pointer;
    }

    .btn-primary {
      background: var(--vscode-button-background, #0078d4);
      color: var(--vscode-button-foreground, #fff);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #026ec1);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #fff);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
  </style>
</head>
<body>
  <div class="loading" id="loading">
    <div class="spinner"></div>
    <p>Connecting to Virtual Office...</p>
  </div>

  <iframe
    id="dashboard"
    src="http://localhost:${port}"
    sandbox="allow-scripts allow-same-origin allow-forms"
  ></iframe>

  <div class="error" id="error-msg">
    <h2>Could not connect to Virtual Office server</h2>
    <p>The server needs to be running at <code>http://localhost:${port}</code></p>
    <div class="steps">
      <p>To start it:</p>
      <ol>
        <li>Open a terminal in the project directory</li>
        <li>Run <code>npm run dev</code></li>
        <li>Or for production: <code>npm run build && npm start</code></li>
      </ol>
    </div>
    <div class="actions">
      <button class="btn btn-primary" onclick="retry()">Retry Connection</button>
      <button class="btn btn-secondary" onclick="startServer()">Start Server in Terminal</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const iframe = document.getElementById('dashboard');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-msg');
    let loaded = false;

    iframe.addEventListener('load', function () {
      loaded = true;
      loading.style.display = 'none';
      iframe.style.display = 'block';
      errorMsg.style.display = 'none';
    });

    // Detect connection failure
    setTimeout(function () {
      if (!loaded) {
        loading.style.display = 'none';
        errorMsg.style.display = 'flex';
      }
    }, 8000);

    function retry() {
      loaded = false;
      errorMsg.style.display = 'none';
      loading.style.display = 'flex';
      iframe.src = 'http://localhost:${port}';
      setTimeout(function () {
        if (!loaded) {
          loading.style.display = 'none';
          errorMsg.style.display = 'flex';
        }
      }, 8000);
    }

    function startServer() {
      vscode.postMessage({ type: 'startServer' });
    }
  </script>
</body>
</html>`;
  }
}
