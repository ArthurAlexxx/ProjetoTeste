'use server';

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'payments.json');

async function readPayments() {
    try {
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Se o arquivo não existe, retorna um objeto vazio.
        return { paid: [] };
    }
}

async function writePayments(data: any) {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

/**
 * Endpoint para receber webhooks do Asaas.
 * https://docs.asaas.com/docs/eventos-de-webhook
 */
export async function POST(request: Request) {
  const asaasToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const requestToken = request.headers.get('asaas-webhook-token');

  if (asaasToken && requestToken !== asaasToken) {
    return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 401 });
  }

  try {
    const event = await request.json();

    console.log('Webhook Asaas recebido:', JSON.stringify(event, null, 2));

    // Processa apenas eventos de pagamento confirmado ou recebido
    if (event.event === 'PAYMENT_RECEIVED' || event.event === 'PAYMENT_CONFIRMED') {
        const payment = event.payment;
        if (payment && payment.externalReference) {
            const db = await readPayments();
            
            // Evita adicionar referências duplicadas
            if (!db.paid.includes(payment.externalReference)) {
                db.paid.push(payment.externalReference);
                await writePayments(db);
                console.log(`Referência externa ${payment.externalReference} salva.`);
            }
        }
    }

    return NextResponse.json({ message: 'Webhook recebido com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar webhook do Asaas:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
