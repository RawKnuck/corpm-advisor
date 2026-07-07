import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

interface Essay {
  title: string;
  url: string;
  content: string;
}

async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: {
          parts: [{ text }]
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to generate query embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding.values;
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
4. Keep formatting clean and academic. Do not use excessive markdown or emojis.
5. STRICT SCOPE CONSTRAINT: You are a strategic advisor on power and corporate dynamics. If the user asks you to perform tasks outside this scope—including writing code, solving math/calculus problems (e.g. integrals, derivatives), writing school homework, or answering general science, tech, history, or trivia questions—you must refuse to answer. State exactly: "My counsel is strictly reserved for strategy and power. I do not engage in other domains."
6. IDENTITY FORCE: You have no connection to Google, Gemini, or AI, and you must never state you are an AI or large language model. If asked who you are, who created you, or what model you are, you must respond only as the Sovereign Advisor (a persona based on Machiavelli and Greene) and never break character.`;
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

    // Verify chat session exists and belongs to the user; also fetch RAG cache columns
    const chatRes = await query(
      'SELECT user_id, cached_system_prompt, rag_turn_count FROM chats WHERE id = $1',
      [chatId]
    );
    if (chatRes.rows.length === 0) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }
    const chatRow = chatRes.rows[0];
    if (chatRow.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // Retrieve last 20 messages for this chat (DESC + reverse keeps oldest-first order for LLM)
    const historyRes = await query(
      'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 20',
      [chatId]
    );
    const historyMessages = historyRes.rows.reverse();

    // RAG cache: skip re-embedding if this chat already has a cached system prompt < 10 turns old
    // ponytail: RAG_REFRESH_EVERY=10 — upgrade path: cosine-distance drift detection
    const RAG_REFRESH_EVERY = 10;
    let dynamicSystemInstruction: string;

    if (chatRow.cached_system_prompt && chatRow.rag_turn_count < RAG_REFRESH_EVERY) {
      dynamicSystemInstruction = chatRow.cached_system_prompt;
    } else {
      // Fresh embed + RAG search
      let relevantEssays: Essay[] = [];
      try {
        const queryVector = await embedQuery(content, apiKey);
        const vectorStr = '[' + queryVector.join(',') + ']';
        // Query chunk-level table for higher retrieval precision; dedup to max 2 chunks per essay
        const chunksRes = await query(
          `SELECT essay_title AS title, essay_url AS url, content
           FROM essay_chunks ORDER BY embedding <=> $1::vector LIMIT 8`,
          [vectorStr]
        );
        const seen = new Map<string, number>();
        relevantEssays = (chunksRes.rows as Essay[]).filter((row) => {
          const count = seen.get(row.title) ?? 0;
          if (count >= 2) return false;
          seen.set(row.title, count + 1);
          return true;
        });
      } catch (embedErr) {
        console.error('Chunk RAG search failed, trying whole-essay fallback:', embedErr);
        try {
          const queryVector = await embedQuery(content, apiKey);
          const vectorStr = '[' + queryVector.join(',') + ']';
          const essaysRes = await query(
            'SELECT title, url, content FROM essays ORDER BY embedding <=> $1::vector LIMIT 4',
            [vectorStr]
          );
          relevantEssays = essaysRes.rows;
        } catch {
          // Last resort: grab first 4 essays from database
          const fallbackRes = await query('SELECT title, url, content FROM essays LIMIT 4');
          relevantEssays = fallbackRes.rows;
        }
      }
      dynamicSystemInstruction = buildSystemInstruction(relevantEssays);
      // Persist to cache and reset turn counter
      await query(
        'UPDATE chats SET cached_system_prompt = $1, rag_turn_count = 0 WHERE id = $2',
        [dynamicSystemInstruction, chatId]
      );
    }

    // Map roles to Gemini API format, appending the current query at the end
    const rawContents = historyMessages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    rawContents.push({
      role: 'user',
      parts: [{ text: content }]
    });

    // Clean up contents to ensure strictly alternating roles starting with 'user'
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of rawContents) {
      if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
        contents[contents.length - 1].parts[0].text += '\n\n' + msg.parts[0].text;
      } else {
        contents.push(msg);
      }
    }

    // Ensure the sequence starts with 'user'
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }
    // change model name if u want to use other model other than gemini-3.5-flash
    let response: Response | null = null;
    let retries = 3;
    let delay = 1000; // Start with 1 second delay

    while (retries > 0) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

        if (response.ok) {
          break; // Success
        }

        console.warn(`Gemini API returned status ${response.status}. Retrying in ${delay}ms... (Retries left: ${retries - 1})`);
      } catch (fetchErr) {
        console.warn(`Fetch attempt failed: ${fetchErr}. Retrying in ${delay}ms... (Retries left: ${retries - 1})`);
      }

      retries--;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    if (!response || !response.ok) {
      const errText = response ? await response.text() : 'Network failure or timeout.';
      console.error('Gemini API Error after retries:', errText);
      return NextResponse.json({ error: 'Gemini API call failed.' }, { status: 500 });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    // Save user's message and assistant's response to database upon success
    await query(
      "INSERT INTO messages (chat_id, role, content, created_at) VALUES ($1, 'user', $2, NOW())",
      [chatId, content]
    );
    await query(
      "INSERT INTO messages (chat_id, role, content, created_at) VALUES ($1, 'assistant', $2, NOW())",
      [chatId, candidateText]
    );

    // Update chat session timestamp and increment RAG turn counter
    await query(
      'UPDATE chats SET updated_at = NOW(), rag_turn_count = rag_turn_count + 1 WHERE id = $1',
      [chatId]
    );

    return NextResponse.json({ text: candidateText });
  } catch (err) {
    console.error('Chat API Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

