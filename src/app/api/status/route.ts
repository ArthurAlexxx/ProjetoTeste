
'use server';

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join('/tmp', 'payments.json');

async function readPayments() {
    try {
        await fs.access(dbPath);
    } catch (error) {
         // If the file doesn't exist, create it with an empty state
        await writePayments({ paid: [] });
    }
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
}

async function writePayments(data: any) {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

/**
 * Endpoint to check the status of a payment reference.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const externalReference = searchParams.get('ref');

  if (!externalReference) {
    return NextResponse.json({ error: 'Referência externa não fornecida.' }, { status: 400 });
  }

  try {
    const db = await readPayments();
    
    if (db.paid.includes(externalReference)) {
        return NextResponse.json({ status: 'PAID' }, { status: 200 });
    } else {
        return NextResponse.json({ status: 'PENDING' }, { status: 200 });
    }

  } catch (error: any) {
    console.error('Falha ao verificar status do pagamento:', error);
    return NextResponse.json({ error: 'Ocorreu um erro interno no servidor.' }, { status: 500 });
  }
}
