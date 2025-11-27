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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Terminal } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  cpfCnpj: z.string().min(11, { message: 'O CPF/CNPJ é obrigatório.' }),
});

type FormData = z.infer<typeof formSchema>;

export default function CustomerPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [customerResponse, setCustomerResponse] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      cpfCnpj: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setStatus('loading');
    setError(null);
    setCustomerResponse(null);

    try {
      const response = await fetch('/api/asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocorreu um erro desconhecido.');
      }
      
      setCustomerResponse(result);
      setStatus('success');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Gerar Novo Cliente</CardTitle>
          <CardDescription>Preencha os dados para criar um cliente no Asaas.</CardDescription>
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

                <Button type="submit" disabled={status === 'loading'} className="w-full">
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando Cliente...
                    </>
                  ) : (
                    'Gerar Cliente'
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold text-green-600 mb-4">Cliente Gerado com Sucesso!</h2>
              {customerResponse && (
                <div className='flex flex-col items-start gap-2 text-left w-full'>
                    <p><strong>ID:</strong> {customerResponse.id}</p>
                    <p><strong>Nome:</strong> {customerResponse.name}</p>
                    <p><strong>CPF/CNPJ:</strong> {customerResponse.cpfCnpj}</p>
                </div>
              )}
               <Button onClick={() => { setStatus('idle'); form.reset(); }} className="w-full mt-6">Gerar Novo Cliente</Button>
            </div>
          )}
        </CardContent>

        {status === 'error' && error && (
          <CardFooter>
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Erro ao Gerar Cliente</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
