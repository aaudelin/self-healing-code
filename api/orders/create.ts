import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { userId, items } = req.body;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  try {
    // Validate that the referenced user exists before attempting the insert.
    // Without this check, Prisma propagates the DB foreign key violation
    // as an unhandled PrismaClientKnownRequestError (P2003).
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003: Foreign key constraint violation
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid userId: user does not exist' });
      }
      // P2025: Record not found (e.g. nested relation)
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'A related record was not found' });
      }
    }
    console.error('[POST /api/orders/create] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
