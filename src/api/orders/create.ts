import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId, items } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Validate that the referenced user actually exists before attempting insert
  // to avoid a foreign key constraint failure at the database level
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return res.status(400).json({ error: 'Invalid userId: user does not exist' });
  }

  const order = await prisma.order.create({
    data: {
      userId,
      items: { create: items },
    },
  });

  return res.status(201).json(order);
}
