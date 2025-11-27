'use server';

import { NextResponse } from 'next/server';

/**
 * Endpoint para receber webhooks do Asaas.
 * https://docs.asaas.com/docs/eventos-de-webhook
 */
export async function POST(request: Request) {
  const asaasToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const requestToken = request.headers.get('asaas-webhook-token');

  // Etapa 1: Validar o token de autenticação
  if (asaasToken && requestToken !== asaasToken) {
    return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 401 });
  }

  try {
    const event = await request.json();

    // Etapa 2: Log do evento para depuração.
    // Em um ambiente de produção, você processaria o evento aqui.
    // Ex: verificar a assinatura, atualizar o banco de dados, etc.
    console.log('Webhook Asaas recebido:', JSON.stringify(event, null, 2));

    // Etapa 3: O Asaas espera uma resposta 200 OK para confirmar o recebimento.
    return NextResponse.json({ message: 'Webhook recebido com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar webhook do Asaas:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
