import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // ATENÇÃO: A chave foi codificada diretamente para fins de teste neste ambiente.
  const apiKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmIxNTk1ZmQ0LWI3ZjUtNDM5My04OGJkLTE4YjI5ZWI2Y2MwMDo6JGFhY2hfYjljNGMxNTQtOTAxYy00ODgwLWI2ODUtOWEyMmViYjE4ZGU3';

  if (!apiKey) {
    // Esta verificação agora é redundante, mas mantida por segurança.
    return NextResponse.json({ error: 'A chave de API do Asaas não foi configurada no servidor.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, cpfCnpj, email, phone, billingType, value, dueDate, description } = body;

    // Etapa 1: Criar o Cliente
    const customerData: any = { name, cpfCnpj };
    if (email) customerData.email = email;
    if (phone) customerData.mobilePhone = phone;

    const customerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify(customerData),
    });

    const customerResult = await customerResponse.json();

    if (!customerResponse.ok) {
        const errorMessage = customerResult.errors?.[0]?.description || 'Verifique os dados do cliente ou a chave de API.';
        return NextResponse.json({ error: `Erro ao criar cliente: ${errorMessage}` }, { status: customerResponse.status });
    }

    // Etapa 2: Criar a Cobrança
    const paymentData = {
      customer: customerResult.id,
      billingType,
      value,
      dueDate,
      description,
      externalReference: `PEDIDO-${Date.now()}`
    };

    const paymentResponse = await fetch('https://api-sandbox.asaas.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey,
        },
        body: JSON.stringify(paymentData),
    });
    
    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok) {
        const errorMessage = paymentResult.errors?.[0]?.description || 'Verifique os dados da cobrança.';
        return NextResponse.json({ error: `Erro ao criar cobrança: ${errorMessage}` }, { status: paymentResponse.status });
    }

    return NextResponse.json(paymentResult, { status: 200 });

  } catch (error: any) {
    console.error('Falha na API interna:', error);
    return NextResponse.json({ error: 'Ocorreu um erro interno no servidor.' }, { status: 500 });
  }
}
