import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  const { userId, items } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return res.status(400).json({ error: 'Invalid user ID: user does not exist' });
  }

  const order = await prisma.order.create({
    data: {
      userId,
      items: { create: items },
    },
  });

  return res.json(order);
}
