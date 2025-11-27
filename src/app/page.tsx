'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Terminal, CalendarIcon, Copy, PartyPopper, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactConfetti from 'react-confetti';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  cpfCnpj: z.string().min(11, { message: 'O CPF/CNPJ é obrigatório.' }),
  email: z.string().email({ message: 'Email inválido.' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  billingType: z.enum(['BOLETO', 'CREDIT_CARD', 'PIX'], {
    required_error: 'A forma de pagamento é obrigatória.',
  }),
  value: z.coerce.number().min(5, { message: 'O valor deve ser no mínimo R$5,00.' }),
  dueDate: z.date({
    required_error: 'A data de vencimento é obrigatória.',
  }),
  description: z.string().min(1, { message: 'A descrição é obrigatória.' }),
});

type FormData = z.infer<typeof formSchema>;
type UserPlan = 'free' | 'pro';

export default function PaymentPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [paymentResponse, setPaymentResponse] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan>('free');
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState<{width: number, height: number}>({width: 0, height: 0});

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      cpfCnpj: '',
      email: '',
      phone: '',
      value: 5,
      description: 'Acesso ao Plano Pro',
      dueDate: new Date(),
    },
  });

   useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    if (typeof window !== 'undefined') {
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    if (userPlan === 'pro') {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 8000);
        return () => clearTimeout(timer);
    }
  }, [userPlan]);

  useEffect(() => {
    if (paymentRef && userPlan === 'free') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/status?ref=${paymentRef}`);
          if (!response.ok) return;

          const result = await response.json();
          if (result.status === 'PAID') {
            setUserPlan('pro');
            setPaymentRef(null);
            clearInterval(interval);
          }
        } catch (e) {
          console.error('Error checking payment status:', e);
        }
      }, 2000); 

      return () => clearInterval(interval);
    }
  }, [paymentRef, userPlan]);


  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setStatus('loading');
    setError(null);
    setPaymentResponse(null);

    // Se for Cartão de Crédito, redireciona para o link de pagamento fixo
    if (data.billingType === 'CREDIT_CARD') {
        window.open('https://sandbox.asaas.com/c/339x2iwzo849irrx', '_blank');
        setStatus('idle'); // Reseta o status do botão
        
        // Também vamos setar uma referência para checagem, caso o webhook funcione para links de pagamento
        const externalReference = `PRO-SUB-${Date.now()}`;
        setPaymentRef(externalReference); // Assumindo que o webhook vai ter a info do cliente
        return; 
    }
    
    // Lógica para PIX e Boleto continua a mesma
    const externalReference = `PRO-SUB-${Date.now()}`;
    
    const formattedData = {
      ...data,
      dueDate: format(data.dueDate, 'yyyy-MM-dd'),
      externalReference,
    };

    try {
      const response = await fetch('/api/asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocorreu um erro desconhecido.');
      }
      
      setPaymentResponse(result);
      setStatus('success');
      
      // A checagem de status via polling só é necessária para PIX e Boleto agora.
      if (result.billingType !== 'CREDIT_CARD') {
         setPaymentRef(externalReference);
      } else {
        if (result.status === 'CONFIRMED' || result.status === 'RECEIVED') {
            setUserPlan('pro');
        } else {
            setPaymentRef(externalReference);
        }
      }

    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetForm = () => {
    window.location.reload();
  }

  const renderProView = () => (
    <div className="flex flex-col items-center text-center w-full">
       {showConfetti && <ReactConfetti width={windowSize.width} height={windowSize.height} />}
      <PartyPopper className="h-16 w-16 text-accent mb-4" />
      <h2 className="text-3xl font-bold text-accent mb-2">Parabéns!</h2>
      <p className="text-xl text-muted-foreground mb-6">Você agora é um usuário Pro!</p>
      <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
        <Rocket className="h-6 w-6"/>
        <span>Acesso a todas as funcionalidades exclusivas liberado.</span>
      </div>
       <Button onClick={resetForm} className="w-full mt-6" variant="outline">Fazer Novo Pagamento</Button>
    </div>
  );

  const renderPaymentFlow = () => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        name="email"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Email (Opcional)</FormLabel>
            <FormControl>
                <Input placeholder="cliente@email.com" {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />
        <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Telefone (Opcional)</FormLabel>
            <FormControl>
                <Input placeholder="(99) 99999-9999" {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />
        <hr className="my-2"/>
        <FormField
        control={form.control}
        name="billingType"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Forma de Pagamento</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                </FormControl>
                <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="BOLETO">Boleto</SelectItem>
                <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                </SelectContent>
            </Select>
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
                <Input type="number" placeholder="Ex: 5.00" {...field} readOnly/>
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />
        <FormField
        control={form.control}
        name="dueDate"
        render={({ field }) => (
            <FormItem className="flex flex-col">
            <FormLabel>Data de Vencimento</FormLabel>
            <Popover>
                <PopoverTrigger asChild>
                <FormControl>
                    <Button
                    variant={'outline'}
                    className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                    )}
                    >
                    {field.value ? (
                        format(field.value, 'PPP', { locale: ptBR })
                    ) : (
                        <span>Escolha uma data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                    date < new Date(new Date().setHours(0,0,0,0))
                    }
                    initialFocus
                />
                </PopoverContent>
            </Popover>
            <FormMessage />
            </FormItem>
        )}
        />
        <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Descrição da Cobrança</FormLabel>
            <FormControl>
                <Input placeholder="Ex: Referente ao serviço X" {...field} readOnly/>
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />
        <Button type="submit" disabled={status === 'loading'} className="w-full">
        {status === 'loading' ? (
            <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
            </>
        )
        : (
            'Pagar com Asaas (R$5,00)'
        )}
        </Button>
    </form>
  );

  const renderSuccessView = () => (
    <div className="flex flex-col items-center text-center w-full">
        <h2 className="text-2xl font-bold text-accent mb-4">Cobrança Gerada</h2>

        {paymentResponse.billingType !== 'CREDIT_CARD' && (
            <p className="mb-4 text-muted-foreground">Efetue o pagamento para concluir. Estamos aguardando a confirmação.</p>
        )}
        
        <Card className="w-full text-left p-6 space-y-4">
            <p className='text-sm'><strong>ID da Cobrança:</strong> {paymentResponse.id}</p>
            
            {paymentResponse.billingType === 'PIX' && paymentResponse.pixQrCode?.payload && (
            <div>
            <FormLabel>PIX Copia e Cola</FormLabel>
            <div className="flex items-center space-x-2">
                <Input value={paymentResponse.pixQrCode.payload} readOnly className="flex-grow text-xs"/>
                <Button onClick={() => copyToClipboard(paymentResponse.pixQrCode.payload)} size="icon" variant="outline">
                <Copy className="h-4 w-4" />
                </Button>
            </div>
            {paymentResponse.pixQrCode.encodedImage && (
                <img src={`data:image/png;base64,${paymentResponse.pixQrCode.encodedImage}`} alt="PIX QR Code" className="mx-auto my-4 rounded-md border p-2"/>
            )}
            </div>
        )}
        {paymentResponse.billingType === 'BOLETO' && paymentResponse.bankSlipUrl && (
            <div className='space-y-4'>
                <div>
                <FormLabel>Linha Digitável</FormLabel>
                <div className="flex items-center space-x-2">
                    <Input value={paymentResponse.identificationField} readOnly className="flex-grow"/>
                    <Button onClick={() => copyToClipboard(paymentResponse.identificationField)} size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div>
                <FormLabel>Visualizar Boleto</FormLabel>
                <a href={paymentResponse.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                    <Button className='w-full' variant="secondary">Abrir Boleto em nova aba</Button>
                </a>
            </div>
            </div>
        )}
        {/* Este bloco não será mais usado com a nova lógica, mas mantemos para consistência */}
        {paymentResponse.billingType === 'CREDIT_CARD' && paymentResponse.invoiceUrl && (
            <div className='space-y-4'>
                <p className="text-sm text-muted-foreground">Clique no botão abaixo para ser redirecionado para a página de pagamento segura e finalizar sua compra com cartão de crédito.</p>
                <a href={paymentResponse.invoiceUrl} target="_blank" rel="noopener noreferrer">
                    <Button className='w-full'>Pagar com Cartão de Crédito</Button>
                </a>
                 <p className="text-xs text-center text-muted-foreground pt-2">Estamos aguardando a confirmação do seu pagamento...</p>
            </div>
        )}
        </Card>
        <Button onClick={resetForm} className="w-full mt-6" variant="outline">Gerar Nova Cobrança</Button>
    </div>
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Plano {userPlan === 'free' ? 'Free' : 'Pro'}</CardTitle>
          {userPlan === 'free' && (
             <CardDescription>Faça o upgrade para o Plano Pro por apenas R$5,00 para ter acesso a funcionalidades exclusivas.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
            <Form {...form}>
                {userPlan === 'pro' 
                    ? renderProView() 
                    : status === 'success' ? renderSuccessView() : renderPaymentFlow()
                }
            </Form>
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

    