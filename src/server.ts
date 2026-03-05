import express from 'express';
import { PrismaClient } from '@prisma/client';
import { identifyContact } from './reconciliation';

const prisma = new PrismaClient();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/identify', async (req, res) => {
  const { email, phoneNumber } = req.body;

  try {
    const result = await identifyContact(email, phoneNumber);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /identify:', error);
    res.status(400).json({ error: error.message || 'Internal Server Error' });
  }
});

app.get('/contacts', async (req, res) => {
  const contacts = await prisma.contact.findMany({
    orderBy: { id: 'asc' }
  });

  res.json(contacts);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});