import { Request, Response } from 'express';
import { getReqLang, t } from '../utils/i18n';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MAX_SUMMARY_CHARS = 80;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB — OpenRouter transcription limit

function getApiKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY;
  return key && key.length > 0 ? key : null;
}

function getSttModel(): string {
  return process.env.OPENROUTER_STT_MODEL || 'moondream/parakeet-ultra';
}

function getTextModel(): string {
  return process.env.OPENROUTER_TEXT_MODEL || 'nvidia/nemotron-3.5-super-vl:free';
}

function truncateTo80(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ').replace(/^["'”]+|["'”]+$/g, '').trim();
  const chars = Array.from(cleaned);
  if (chars.length <= MAX_SUMMARY_CHARS) return cleaned;
  return chars.slice(0, MAX_SUMMARY_CHARS).join('').trimEnd();
}

/**
 * Totally-transcribes the incoming base64 audio via OpenRouter STT, then
 * summarises it to a precise 80-char title with the text model.
 * The OpenRouter API key never leaves the server. Auth + rate limiting
 * are applied by the route, not here.
 */
export async function summarizeVoice(req: Request, res: Response): Promise<void> {
  const lang = getReqLang(req);
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(500).json({ message: 'Voice summary is not configured on the server.' });
    return;
  }

  const { audioData, audioFormat, language } = req.body as {
    audioData?: string;
    audioFormat?: string;
    language?: string;
  };

  if (!audioData || typeof audioData !== 'string') {
    res.status(400).json({ message: t(lang, 'request.invalidTitle') });
    return;
  }

  const format = (audioFormat || 'm4a').toLowerCase().replace(/^\./, '');
  const byteLength = Buffer.byteLength(audioData, 'base64');
  if (byteLength > MAX_AUDIO_BYTES) {
    res.status(413).json({ message: 'Recording is too long. Please try again with a shorter recording.' });
    return;
  }

  const sttModel = getSttModel();
  const textModel = getTextModel();

  // 1) Speech → text
  let transcript: string;
  try {
    const sttRes = await fetch(`${OPENROUTER_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.PUBLIC_BASE_URL || 'https://aasaan.app',
        'X-OpenRouter-Title': 'Aasaan Voice Summary',
      },
      body: JSON.stringify({
        model: sttModel,
        input_audio: { data: audioData, format },
        language: language || 'en',
        response_format: 'json',
      }),
    });
    if (!sttRes.ok) {
      const errText = await sttRes.text();
      console.error(`[voiceSummary] STT ${sttRes.status}: ${errText.slice(0, 500)}`);
      res.status(502).json({ message: 'Could not transcribe your voice. Please try again.' });
      return;
    }
    const sttJson = (await sttRes.json()) as { text?: string };
    transcript = (sttJson.text || '').trim();
  } catch (err) {
    console.error('[voiceSummary] STT fetch failed', err);
    res.status(502).json({ message: 'Could not transcribe your voice. Please try again.' });
    return;
  }

  if (!transcript) {
    res.status(422).json({ message: 'We could not hear anything in that recording. Please try again.' });
    return;
  }

  // 2) Text → precise 80-char summary
  let summary: string;
  try {
    const chatRes = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.PUBLIC_BASE_URL || 'https://aasaan.app',
        'X-OpenRouter-Title': 'Aasaan Voice Summary',
      },
      body: JSON.stringify({
        model: textModel,
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: 'system',
            content:
              'You summarise a spoken service-request description into a short title. ' +
              `Output exactly one line of at most ${MAX_SUMMARY_CHARS} characters. ` +
              'Remove filler words, repetitions, stammering and unnecessary detail. ' +
              'Keep only the core problem and action. No quotes, no punctuation prefix, plain text only.',
          },
          { role: 'user', content: transcript },
        ],
      }),
    });
    if (!chatRes.ok) {
      const errText = await chatRes.text();
      console.error(`[voiceSummary] Chat ${chatRes.status}: ${errText.slice(0, 500)}`);
      res.status(502).json({ message: 'Could not summarise your voice. Please try again.' });
      return;
    }
    const chatJson = (await chatRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    summary = truncateTo80(chatJson.choices?.[0]?.message?.content || processWordFallback(transcript));
  } catch (err) {
    console.error('[voiceSummary] Chat fetch failed', err);
    summary = truncateTo80(processWordFallback(transcript));
  }

  if (!summary) summary = truncateTo80(processWordFallback(transcript));

  res.json({ transcript, summary, sttModel, textModel });
}

function processWordFallback(transcript: string): string {
  return transcript
    .replace(/\b(um+|uh+|er+|ah+|hmm+|like|you know)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
