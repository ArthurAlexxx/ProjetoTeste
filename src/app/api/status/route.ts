import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'payments.json');

async function readPayments() {
    try {
        // Checa se o arquivo existe antes de tentar ler
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Se o arquivo não existir, retorna uma estrutura padrão
        return { paid: [] };
    }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');

  if (!ref) {
    return NextResponse.json({ error: 'Referência não fornecida.' }, { status: 400 });
  }

  try {
    const db = await readPayments();
    if (db.paid.includes(ref)) {
      return NextResponse.json({ status: 'PAID' });
    } else {
      return NextResponse.json({ status: 'PENDING' });
    }
  } catch (error) {
    console.error("Erro ao ler o status do pagamento:", error);
    return NextResponse.json({ status: 'PENDING', error: 'Erro ao verificar o status.' });
  }
}
