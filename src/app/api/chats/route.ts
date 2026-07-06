import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

// GET /api/chats: Retrieve all chat sessions for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ponytail: Retrieve all chats for user ordered by updated_at descending
    const res = await query(
      'SELECT id, title, created_at, updated_at FROM chats WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return NextResponse.json({ chats: res.rows });
  } catch (err) {
    console.error('Failed to get chats:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/chats: Create a new chat session for the logged-in user
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let title = 'Strategic Consultation';
    try {
      const body = await request.json();
      if (body && typeof body === 'object' && 'title' in body && typeof body.title === 'string' && body.title.trim()) {
        title = body.title.trim();
      }
    } catch {
      // Body might be empty or invalid JSON, fallback to default title
    }

    // ponytail: Create a new chat using raw SQL
    const res = await query(
      'INSERT INTO chats (user_id, title, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
      [userId, title]
    );
    return NextResponse.json({ chat: res.rows[0] });
  } catch (err) {
    console.error('Failed to create chat:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
