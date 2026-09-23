/** Small SMS gateway adapter used by server-side notification flows. */
export async function sendSMS(to: string, body: string): Promise<unknown> {
  const url = process.env.SMS_API_URL?.trim();
  const apiKey = process.env.SMS_API_KEY?.trim();
  if (!url || !apiKey) {
    throw new Error('SMS is not configured. Set SMS_API_URL and SMS_API_KEY in backend/.env.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ to, body }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`SMS provider rejected the request with status ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}