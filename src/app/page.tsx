'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createAsaasPayment } from '@/actions/create-payment';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Terminal } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  cpfCnpj: z.string().min(11, { message: 'O CPF/CNPJ é obrigatório.' }),
  value: z.coerce
    .number()
    .positive({ message: 'O valor deve ser maior que zero.' }),
  billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'], {
    required_error: 'Selecione uma forma de pagamento.',
  }),
});

type FormData = z.infer<typeof formSchema>;
type PaymentResponse = Awaited<ReturnType<typeof createAsaasPayment>>;

export default function PaymentPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [paymentResponse, setPaymentResponse] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      cpfCnpj: '',
      billingType: 'PIX',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setStatus('loading');
    setError(null);
    setPaymentResponse(null);
    try {
      const response = await createAsaasPayment(data);
      if (response.error) {
        throw new Error(response.error);
      }
      setPaymentResponse(response);
      setStatus('success');
    } catch (e: any) {
      setError(e.message || 'Ocorreu um erro desconhecido.');
      setStatus('error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Gerar Nova Cobrança</CardTitle>
          <CardDescription>Preencha os dados para criar uma cobrança via Asaas.</CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'success' ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João da Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpfCnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 100.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="PIX" />
                            </FormControl>
                            <FormLabel className="font-normal">PIX</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="BOLETO" />
                            </FormControl>
                            <FormLabel className="font-normal">Boleto</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="CREDIT_CARD" />
                            </FormControl>
                            <FormLabel className="font-normal">Cartão de Crédito</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={status === 'loading'} className="w-full">
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando Cobrança...
                    </>
                  ) : (
                    'Gerar Cobrança'
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold text-green-600 mb-4">Cobrança Gerada com Sucesso!</h2>
              {paymentResponse?.billingType === 'PIX' && paymentResponse.pixQrCode && (
                <div className='flex flex-col items-center gap-4'>
                  <p>Escaneie o QR Code para pagar:</p>
                  <Image src={`data:image/png;base64,${paymentResponse.pixQrCode.encodedImage}`} alt="PIX QR Code" width={200} height={200} />
                  <Input value={paymentResponse.pixQrCode.payload} readOnly className="text-center" />
                  <Button onClick={() => copyToClipboard(paymentResponse.pixQrCode!.payload)} variant="outline">Copiar Código PIX</Button>
                </div>
              )}
              {paymentResponse?.billingType === 'BOLETO' && paymentResponse.boleto && (
                 <div className='flex flex-col items-center gap-4'>
                   <p>Use o link abaixo para visualizar o boleto:</p>
                   <a href={paymentResponse.boleto.bankSlipUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                     Visualizar Boleto
                   </a>
                   <Input value={paymentResponse.boleto.identificationField} readOnly className="text-center" />
                   <Button onClick={() => copyToClipboard(paymentResponse.boleto!.identificationField)} variant="outline">Copiar Linha Digitável</Button>
                 </div>
              )}
              {paymentResponse?.billingType === 'CREDIT_CARD' && paymentResponse.creditCard && (
                <div className='flex flex-col items-center gap-4'>
                  <p>Use o link abaixo para realizar o pagamento com Cartão de Crédito:</p>
                  <a href={paymentResponse.creditCard.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Pagar com Cartão
                  </a>
                </div>
              )}
               <Button onClick={() => setStatus('idle')} className="w-full mt-6">Gerar Nova Cobrança</Button>
            </div>
          )}
        </CardContent>

        {status === 'error' && error && (
          <CardFooter>
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Erro ao Gerar Cobrança</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
