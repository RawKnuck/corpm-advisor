import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  try {
    // ponytail: check chat existence and ownership via raw SQL
    const chatRes = await query('SELECT user_id FROM chats WHERE id = $1', [id]);
    if (chatRes.rows.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    if (chatRes.rows[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete chat session (cascade in schema automatically handles message deletion)
    await query('DELETE FROM chats WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete chat:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
