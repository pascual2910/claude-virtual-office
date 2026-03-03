export async function sendMessageToAgent(
  teamName: string,
  agentName: string,
  text: string,
  summary?: string
): Promise<void> {
  const res = await fetch('/api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamName, agentName, text, summary }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.statusText}`);
}

export async function wakeAgent(
  teamName: string,
  agentName: string
): Promise<void> {
  const res = await fetch('/api/wake-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamName, agentName }),
  });
  if (!res.ok) throw new Error(`Failed to wake agent: ${res.statusText}`);
}
