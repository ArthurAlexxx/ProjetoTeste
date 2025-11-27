'use server';

import { z } from 'zod';

const formSchema = z.object({
  name: z.string(),
  cpfCnpj: z.string(),
});

type CustomerData = z.infer<typeof formSchema>;

export async function createAsaasCustomer(customerData: CustomerData) {
  // Acessa a variável de ambiente diretamente.
  // Garanta que a variável ASAAS_API_KEY está no seu arquivo .env SEM ASPAS.
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    // Este erro indica que a variável não foi carregada no ambiente.
    return { success: false, customer: null, error: 'A chave de API do Asaas não foi configurada no ambiente.' };
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
        // Se a resposta não for OK, tenta ler a mensagem de erro da API do Asaas.
        const errorBody = await customerResponse.json();
        console.error('Erro ao criar cliente:', errorBody);
        // A mensagem de erro da API do Asaas é útil para debugar.
        const errorMessage = errorBody.errors?.[0]?.description || 'Verifique os dados informados ou a chave de API.';
        throw new Error(errorMessage);
    }

    const customer = await customerResponse.json();
    
    // Retorna sucesso com os dados do cliente criado.
    return { success: true, customer, error: null };

  } catch (error: any) {
    console.error('Falha na criação do cliente Asaas:', error);
    // Retorna o erro que ocorreu para ser exibido na tela.
    return { success: false, customer: null, error: error.message };
  }
}
