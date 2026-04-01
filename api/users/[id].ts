import { prisma } from '../../lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const user = await prisma.user.findUnique({ where: { id } });

  // Guard: return 404 before accessing any property on user
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({ id: user.id, name: user.name, email: user.email });
}
