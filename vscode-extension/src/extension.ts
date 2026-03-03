import * as vscode from 'vscode';
import { VirtualOfficePanel } from './webview-provider';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('claude-virtual-office.open', () => {
      VirtualOfficePanel.createOrShow(context);
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

export function deactivate() {}
