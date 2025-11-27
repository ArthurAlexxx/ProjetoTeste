'use server';

import { z } from 'zod';

const formSchema = z.object({
  name: z.string(),
  cpfCnpj: z.string(),
});

type CustomerData = z.infer<typeof formSchema>;

export async function createAsaasCustomer(customerData: CustomerData, apiKey: string) {
  if (!apiKey) {
    return { success: false, customer: null, error: 'A chave de API do Asaas não foi fornecida.' };
  }

  try {
    const customerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
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
        const errorMessage = errorBody.errors?.[0]?.description || 'Verifique os dados informados ou a chave de API.';
        throw new Error(errorMessage);
    }

    const customer = await customerResponse.json();
    
    return { success: true, customer, error: null };

  } catch (error: any) {
    console.error('Falha na criação do cliente Asaas:', error);
    return { success: false, customer: null, error: error.message };
  }
}
