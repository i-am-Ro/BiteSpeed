# Bitespeed Identity Reconciliation

This is a backend service designed to identify and keep track of customer identities across multiple purchases on FluxKart.com.

## Tech Stack
- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: SQLite (local)

## Endpoint

### POST `/identify`
Receives a JSON body with `email` or `phoneNumber` and returns a consolidated contact object.

#### Logic Highlights:
- Identifies matching contacts by email or phone number.
- Consolidates linked contacts under a single primary ID.
- Automatically converts newer primary contacts to secondary when they are found to be related.
- Creates new secondary contacts for any previously unknown information in a request matching an existing customer.

## Running Locally

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database:
   ```bash
   npx prisma db push
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3000/identify`.

## Database Viewer

To view and edit the database contents visually, run:

```bash
npm run studio
```

This will open Prisma Studio in your browser at `http://localhost:5555`.
