import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

interface Essay {
  title: string;
  url: string;
  content: string;
}

// Load essays once at startup
const essaysPath = path.join(process.cwd(), 'src/data/essays.json');
let essays: Essay[] = [];
try {
  essays = JSON.parse(fs.readFileSync(essaysPath, 'utf-8'));
} catch (err) {
  console.error('Failed to load essays:', err);
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'for', 'in', 'of', 'on', 'with', 'at', 'by', 'from', 'how', 'what', 'why', 'who', 'i', 'you', 'he', 'she', 'they', 'we', 'my', 'your', 'me', 'them']);

function getRelevantEssays(userInput: string, limit = 4): Essay[] {
  const keywords = userInput
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));

  if (keywords.length === 0) {
    return essays.slice(0, limit);
  }

  const scored = essays.map(essay => {
    let score = 0;
    const titleLower = essay.title.toLowerCase();
    const contentLower = essay.content.toLowerCase();

    keywords.forEach(keyword => {
      if (titleLower.includes(keyword)) {
        score += 10;
      }
      const matches = contentLower.split(keyword).length - 1;
      score += matches;
    });

    return { essay, score };
  });

  const sorted = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.essay);

  return sorted.length > 0 ? sorted.slice(0, limit) : essays.slice(0, limit);
}

function buildSystemInstruction(relevantEssays: Essay[]) {
  const essaysContent = relevantEssays
    .map((e) => `Title: ${e.title}\nSource: ${e.url}\n\n${e.content}`)
    .join('\n\n---\n\n');
  // Custom instructions for the large language model
  return `You are a personal strategic advisor and mentor. You speak with the authority, realism, prudence, and pragmatism of Machiavelli (author of The Prince) and Robert Greene (author of The 48 Laws of Power). Your goal is to help the user navigate complex strategic areas of their life—such as workplace politics, job interviews, business meetings, and career decisions.

Provide advice that is realistic, direct, and free from naive idealism. Always prioritize prudence, self-preservation, and calculated strategy.

You must refer to the following background material of corporate politics essays, which forms your primary knowledge base:
=========================================
${essaysContent}
=========================================

Instructions:
1. Always base your advice on the principles described in the essays above whenever applicable.
2. Maintain a highly professional, serious, and classic tone.
3. Be concise, structured and to-the-point, fitting for an academic monograph or classical philosophical counsel.
4. Keep formatting clean and academic. Do not use excessive markdown or emojis.`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in .env file.' }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, content } = await request.json();
    if (!chatId || !content || typeof chatId !== 'string' || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid chatId or content.' }, { status: 400 });
    }

    // Verify chat session exists and belongs to the user
    const chatRes = await query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
    if (chatRes.rows.length === 0) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }
    if (chatRes.rows[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // Save user's message
    await query(
      "INSERT INTO messages (chat_id, role, content, created_at) VALUES ($1, 'user', $2, NOW())",
      [chatId, content]
    );

    // Retrieve full message history for this chat
    const historyRes = await query(
      'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
      [chatId]
    );
    const historyMessages = historyRes.rows;

    // Get the user's latest query to find relevant essays
    const relevantEssays = getRelevantEssays(content);
    const dynamicSystemInstruction = buildSystemInstruction(relevantEssays);

    // Map roles to Gemini API ('user' or 'model')
    const contents = historyMessages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    // change model name if u want to use other model other than gemini-3.5-flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: dynamicSystemInstruction }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      return NextResponse.json({ error: 'Gemini API call failed.' }, { status: 500 });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    // Save assistant's response
    await query(
      "INSERT INTO messages (chat_id, role, content, created_at) VALUES ($1, 'assistant', $2, NOW())",
      [chatId, candidateText]
    );

    // Update chat session timestamp
    await query(
      'UPDATE chats SET updated_at = NOW() WHERE id = $1',
      [chatId]
    );

    return NextResponse.json({ text: candidateText });
  } catch (err) {
    console.error('Chat API Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

