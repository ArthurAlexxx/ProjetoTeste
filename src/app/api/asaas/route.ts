'use server';

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'A chave de API do Asaas não foi configurada no servidor.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, cpfCnpj, email, phone, billingType, value, dueDate, description, externalReference } = body;

    // Para pagamentos com Cartão de Crédito, é melhor enviar os dados do cliente
    // junto com a cobrança para evitar inconsistências no nome do portador.
    // O Asaas criará o cliente no momento do pagamento.
    // Para outros métodos, a criação antecipada do cliente funciona bem.
    
    let customerId: string | undefined;

    if (billingType !== 'CREDIT_CARD') {
        const customerData: any = { name, cpfCnpj };
        if (email) customerData.email = email;
        if (phone) customerData.mobilePhone = phone;

        const customerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
            body: JSON.stringify(customerData),
        });

        const customerResult = await customerResponse.json();

        if (!customerResponse.ok) {
            const errorMessage = customerResult.errors?.[0]?.description || 'Verifique os dados do cliente ou a chave de API.';
            return NextResponse.json({ error: `Erro ao criar cliente: ${errorMessage}` }, { status: customerResponse.status });
        }
        customerId = customerResult.id;
    }

    // Etapa 2: Criar a Cobrança
    const paymentData: any = {
      billingType,
      value,
      dueDate,
      description,
      externalReference: externalReference || `PEDIDO-${Date.now()}`
    };

    if (customerId) {
        paymentData.customer = customerId;
    } else {
        // Envia os dados do cliente para serem criados junto com o pagamento (para Cartão de Crédito)
        paymentData.customer = { name, cpfCnpj, email, mobilePhone: phone };
    }


    const paymentResponse = await fetch('https://api-sandbox.asaas.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey,
        },
        body: JSON.stringify(paymentData),
    });
    
    let paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok) {
        const errorMessage = paymentResult.errors?.[0]?.description || 'Verifique os dados da cobrança.';
        return NextResponse.json({ error: `Erro ao criar cobrança: ${errorMessage}` }, { status: paymentResponse.status });
    }
    
    // Adiciona o nossoNumero (linha digitável) à resposta se for boleto
    if (paymentResult.billingType === 'BOLETO') {
        paymentResult.identificationField = paymentResult.nossoNumero;
    }


    // Etapa 3: Se for PIX, buscar o QR Code
    if (paymentResult.billingType === 'PIX' && paymentResult.id) {
        const qrCodeResponse = await fetch(`https://api-sandbox.asaas.com/v3/payments/${paymentResult.id}/pixQrCode`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'access_token': apiKey,
            }
        });

        const qrCodeResult = await qrCodeResponse.json();

        if (qrCodeResponse.ok) {
            paymentResult.pixQrCode = qrCodeResult;
        } else {
            console.warn(`Não foi possível obter o QR Code para a cobrança ${paymentResult.id}.`);
        }
    }

    return NextResponse.json(paymentResult, { status: 200 });

  } catch (error: any) {
    console.error('Falha na API interna:', error);
    return NextResponse.json({ error: 'Ocorreu um erro interno no servidor.' }, { status: 500 });
  }
}
