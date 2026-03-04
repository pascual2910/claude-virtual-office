import * as vscode from 'vscode';
import * as http from 'http';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private timer: ReturnType<typeof setInterval> | undefined;
  private _connected = false;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = 'claude-virtual-office.open';
    this.update(false);
    this.item.show();
  }

  start(): void {
    this.check();
    this.timer = setInterval(() => this.check(), 10_000);
  }

  isConnected(): boolean {
    return this._connected;
  }

  private check(): void {
    const port = vscode.workspace
      .getConfiguration('claudeVirtualOffice')
      .get<number>('port', 3377);

    const req = http.get(
      `http://127.0.0.1:${port}/api/state`,
      { timeout: 3000 },
      (res) => {
        this.update(res.statusCode === 200);
        res.resume();
      }
    );
    req.on('error', () => this.update(false));
    req.on('timeout', () => {
      req.destroy();
      this.update(false);
    });
  }

  private update(connected: boolean): void {
    this._connected = connected;
    if (connected) {
      this.item.text = '$(circle-filled) Virtual Office';
      this.item.tooltip = 'Claude Virtual Office: Connected — Click to open';
      this.item.color = new vscode.ThemeColor('testing.iconPassed');
    } else {
      this.item.text = '$(circle-outline) Virtual Office';
      this.item.tooltip = 'Claude Virtual Office: Offline — Click to open';
      this.item.color = new vscode.ThemeColor('disabledForeground');
    }
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.item.dispose();
  }
}
