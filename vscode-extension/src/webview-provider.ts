import * as vscode from 'vscode';

export class VirtualOfficePanel {
  public static currentPanel: VirtualOfficePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposed = false;

  static createOrShow(context: vscode.ExtensionContext): void {
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

    // Handle messages from the webview
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
        }
      },
      null,
      context.subscriptions
    );
  }

  private getHtml(): string {
    const port = vscode.workspace
      .getConfiguration('claudeVirtualOffice')
      .get<number>('port', 3377);

    return `<!DOCTYPE html>
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
      background: #0f172a;
    }
    iframe {
      border: none;
      width: 100%;
      height: 100%;
    }
    .error {
      display: none;
      color: #94a3b8;
      font-family: system-ui, sans-serif;
      text-align: center;
      padding: 3rem 2rem;
    }
    .error h2 {
      color: #f59e0b;
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    .error p {
      margin: 0.5rem 0;
      line-height: 1.6;
    }
    .error code {
      background: #1e293b;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .error .steps {
      text-align: left;
      display: inline-block;
      margin-top: 1.5rem;
    }
    .error .steps li {
      margin: 0.5rem 0;
    }
  </style>
</head>
<body>
  <iframe
    id="dashboard"
    src="http://localhost:${port}"
    sandbox="allow-scripts allow-same-origin allow-forms"
  ></iframe>
  <div class="error" id="error-msg">
    <h2>Could not connect to Virtual Office server</h2>
    <p>The dashboard server needs to be running at <code>http://localhost:${port}</code></p>
    <div class="steps">
      <p>To start it:</p>
      <ol>
        <li>Open a terminal</li>
        <li>Run <code>cd your-project && npx claude-virtual-office start</code></li>
        <li>Or run <code>npx claude-virtual-office setup</code> first to install hooks</li>
      </ol>
    </div>
  </div>
  <script>
    const iframe = document.getElementById('dashboard');
    const errorMsg = document.getElementById('error-msg');
    let loaded = false;

    iframe.addEventListener('load', () => {
      loaded = true;
    });

    // Detect connection failure
    setTimeout(() => {
      if (!loaded) {
        iframe.style.display = 'none';
        errorMsg.style.display = 'block';
      }
    }, 5000);
  </script>
</body>
</html>`;
  }
}
