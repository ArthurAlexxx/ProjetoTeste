import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'A chave de API do Asaas não foi configurada no servidor.' }, { status: 500 });
  }

  try {
    const { name, cpfCnpj } = await request.json();

    const customerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify({ name, cpfCnpj }),
    });

    const responseData = await customerResponse.json();

    if (!customerResponse.ok) {
        const errorMessage = responseData.errors?.[0]?.description || 'Verifique os dados informados ou a chave de API.';
        return NextResponse.json({ error: errorMessage }, { status: customerResponse.status });
    }

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('Falha na API interna:', error);
    return NextResponse.json({ error: 'Ocorreu um erro interno no servidor.' }, { status: 500 });
  }
}
