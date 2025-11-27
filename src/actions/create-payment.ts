'use server';

import { z } from 'zod';

const formSchema = z.object({
  name: z.string(),
  cpfCnpj: z.string(),
});

type CustomerData = z.infer<typeof formSchema>;

export async function createAsaasCustomer(customerData: CustomerData) {
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    return { error: 'A chave de API do Asaas não foi configurada no ambiente.' };
  }

  try {
    const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify({
        name: customerData.name,
        cpfCnpj: customerData.cpfCnpj,
      }),
    });

    if (!customerResponse.ok) {
        const errorBody = await customerResponse.json();
        console.error('Erro ao criar cliente:', errorBody);
        throw new Error(`Erro ao criar cliente: ${errorBody.errors?.[0]?.description || 'Verifique os dados informados.'}`);
    }

    const customer = await customerResponse.json();
    
    return { success: true, customer, error: null };

  } catch (error: any) {
    console.error('Falha na criação do cliente Asaas:', error);
    return { success: false, customer: null, error: error.message };
  }
}
