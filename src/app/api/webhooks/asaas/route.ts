'use server';

import { NextResponse } from 'next/server';

/**
 * Endpoint para receber webhooks do Asaas.
 * https://docs.asaas.com/docs/eventos-de-webhook
 */
export async function POST(request: Request) {
  try {
    const event = await request.json();

    // Log do evento para depuração.
    // Em um ambiente de produção, você processaria o evento aqui.
    // Ex: verificar a assinatura, atualizar o banco de dados, etc.
    console.log('Webhook Asaas recebido:', JSON.stringify(event, null, 2));

    // O Asaas espera uma resposta 200 OK para confirmar o recebimento.
    return NextResponse.json({ message: 'Webhook recebido com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar webhook do Asaas:', error);
    // Retorna um erro, mas ainda com um status que pode ser útil para o Asaas.
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
