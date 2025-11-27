'use server';

import { z } from 'zod';

const formSchema = z.object({
  name: z.string(),
  cpfCnpj: z.string(),
  value: z.number(),
  billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']),
});

type PaymentData = z.infer<typeof formSchema>;

// Definição dos tipos de resposta para cada forma de pagamento
type PixResponse = {
  encodedImage: string;
  payload: string;
};

type BoletoResponse = {
  identificationField: string;
  bankSlipUrl: string;
};

type CreditCardResponse = {
  invoiceUrl: string;
};


export async function createAsaasPayment(paymentData: PaymentData) {
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    return { error: 'A chave de API do Asaas não foi configurada no ambiente.' };
  }

  try {
    // 1. Criar o cliente no Asaas
    const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify({
        name: paymentData.name,
        cpfCnpj: paymentData.cpfCnpj,
      }),
    });

    if (!customerResponse.ok) {
        const errorBody = await customerResponse.json();
        console.error('Erro ao criar cliente:', errorBody);
        throw new Error(`Erro ao criar cliente: ${errorBody.errors?.[0]?.description || 'Verifique os dados informados.'}`);
    }

    const customer = await customerResponse.json();
    const customerId = customer.id;

    // 2. Criar a cobrança para o cliente
    const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: paymentData.billingType,
        value: paymentData.value,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 5))
          .toISOString()
          .split('T')[0], // Vencimento em 5 dias
      }),
    });
    
    if (!paymentResponse.ok) {
      const errorBody = await paymentResponse.json();
      console.error('Erro ao criar cobrança:', errorBody);
      throw new Error(`Erro ao criar cobrança: ${errorBody.errors?.[0]?.description || 'Não foi possível gerar a cobrança.'}`);
    }

    const payment = await paymentResponse.json();

    // 3. Retornar dados específicos dependendo do tipo de cobrança
    if (payment.billingType === 'PIX') {
        const qrCodeResponse = await fetch(`https://api.asaas.com/v3/payments/${payment.id}/pixQrCode`, {
            headers: { 'access_token': apiKey }
        });
        const pixData = await qrCodeResponse.json();
        return {
            billingType: 'PIX' as const,
            pixQrCode: pixData as PixResponse,
            boleto: null,
            creditCard: null,
            error: null,
        }
    }

    if (payment.billingType === 'BOLETO') {
        return {
            billingType: 'BOLETO' as const,
            boleto: {
                identificationField: payment.identificationField,
                bankSlipUrl: payment.bankSlipUrl,
            } as BoletoResponse,
            pixQrCode: null,
            creditCard: null,
            error: null,
        }
    }
    
    if (payment.billingType === 'CREDIT_CARD') {
         return {
            billingType: 'CREDIT_CARD' as const,
            creditCard: {
                invoiceUrl: payment.invoiceUrl
            } as CreditCardResponse,
            pixQrCode: null,
            boleto: null,
            error: null,
        }
    }

    return { error: 'Tipo de pagamento não suportado para retorno de dados.' };

  } catch (error: any) {
    console.error('Falha na criação da cobrança Asaas:', error);
    return { error: error.message };
  }
}
