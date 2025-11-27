'use server';

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Em ambientes serverless como a Vercel, apenas o diretório /tmp é gravável.
const dbPath = path.join('/tmp', 'payments.json');

async function readPayments() {
    try {
        // Tenta ler o arquivo. Se não existir, o catch trata.
        const data = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error: any) {
        // Se o erro for 'ENOENT' (arquivo não encontrado), cria o arquivo e retorna o estado inicial.
        if (error.code === 'ENOENT') {
            await writePayments({ paid: [] });
            return { paid: [] };
        }
        // Se for outro erro, lança a exceção.
        console.error("Erro ao ler payments.json:", error);
        throw error;
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
                console.log(`Referência externa ${payment.externalReference} salva com sucesso em ${dbPath}.`);
            }
        }
    }

    return NextResponse.json({ message: 'Webhook recebido com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar webhook do Asaas:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
