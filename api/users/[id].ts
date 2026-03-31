import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });

    // Guard: findUnique returns null when no record is found.
    // Accessing properties on null was the source of the TypeError.
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    console.error('[GET /api/users/[id]] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
