import { PrismaClient, Contact } from '@prisma/client';

const prisma = new PrismaClient();

export interface IdentityResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export async function identifyContact(email?: string, phoneNumber?: string): Promise<IdentityResponse> {
  if (!email && !phoneNumber) {
    throw new Error('Email or phoneNumber is required');
  }


  const matchingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber ? String(phoneNumber) : undefined },
      ],
    },
  });

  if (matchingContacts.length === 0) {

    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkPrecedence: 'primary',
      },
    });

    return {
      contact: {
        primaryContactId: newContact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [String(phoneNumber)] : [],
        secondaryContactIds: [],
      },
    };
  }


  const primaryIds = new Set<number>();
  for (const contact of matchingContacts) {
    primaryIds.add(contact.linkPrecedence === 'primary' ? contact.id : contact.linkedId!);
  }

  // Fetch all contacts in the linked groups to find true primaries and all secondary info
  let allLinkedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: Array.from(primaryIds) } },
        { linkedId: { in: Array.from(primaryIds) } },
      ],
    },
  });

  // Re-evaluate primary IDs after fetching everything
  const finalPrimaryIds = new Set<number>();
  for (const contact of allLinkedContacts) {
    finalPrimaryIds.add(contact.linkPrecedence === 'primary' ? contact.id : contact.linkedId!);
  }

  // Sort primaries by createdAt to find the oldest one
  const primaries = await prisma.contact.findMany({
    where: { id: { in: Array.from(finalPrimaryIds) }, linkPrecedence: 'primary' },
    orderBy: { createdAt: 'asc' },
  });

  const mainPrimary = primaries[0];


  const hasEmailMatched = matchingContacts.some((c: Contact) => c.email === email);
  const hasPhoneMatched = matchingContacts.some((c: Contact) => c.phoneNumber === (phoneNumber ? String(phoneNumber) : null));

  const isNewEmail = email && !allLinkedContacts.some((c: Contact) => c.email === email);
  const isNewPhone = phoneNumber && !allLinkedContacts.some((c: Contact) => c.phoneNumber === String(phoneNumber));

  if ((email && isNewEmail) || (phoneNumber && isNewPhone)) {
    const newSecondary = await prisma.contact.create({
      data: {
        email,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkedId: mainPrimary.id,
        linkPrecedence: 'secondary',
      },
    });
    allLinkedContacts.push(newSecondary);
  }


  if (primaries.length > 1) {
    const newerPrimaries = primaries.slice(1);
    for (const p of newerPrimaries) {
      await prisma.contact.update({
        where: { id: p.id },
        data: {
          linkedId: mainPrimary.id,
          linkPrecedence: 'secondary',
          updatedAt: new Date(),
        },
      });

      await prisma.contact.updateMany({
        where: { linkedId: p.id },
        data: {
          linkedId: mainPrimary.id,
          updatedAt: new Date(),
        },
      });
    }


    allLinkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: mainPrimary.id },
          { linkedId: mainPrimary.id },
        ],
      },
    });
  }

 
  const emails = new Set<string>();
  const phoneNumbers = new Set<string>();
  const secondaryContactIds: number[] = [];

  
  if (mainPrimary.email) emails.add(mainPrimary.email);
  if (mainPrimary.phoneNumber) phoneNumbers.add(mainPrimary.phoneNumber);

  for (const contact of allLinkedContacts) {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    if (contact.linkPrecedence === 'secondary') {
      secondaryContactIds.push(contact.id);
    }
  }

  return {
    contact: {
      primaryContactId: mainPrimary.id,
      emails: Array.from(emails),
      phoneNumbers: Array.from(phoneNumbers),
      secondaryContactIds: Array.from(new Set(secondaryContactIds)),
    },
  };
}
