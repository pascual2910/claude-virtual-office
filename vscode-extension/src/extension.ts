import * as vscode from 'vscode';
import { VirtualOfficePanel } from './webview-provider';
import { StatusBar } from './status-bar';

let statusBar: StatusBar | undefined;

export function activate(context: vscode.ExtensionContext) {
  statusBar = new StatusBar();
  statusBar.start();
  context.subscriptions.push({ dispose: () => statusBar?.dispose() });

  context.subscriptions.push(
    vscode.commands.registerCommand('claude-virtual-office.open', () => {
      VirtualOfficePanel.createOrShow(context, statusBar);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claude-virtual-office.openExternal', () => {
      const port = vscode.workspace
        .getConfiguration('claudeVirtualOffice')
        .get<number>('port', 3377);
      vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
    })
  );
}

export function deactivate() {
  statusBar?.dispose();
  statusBar = undefined;
}
