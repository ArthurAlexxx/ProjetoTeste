'use server';

import { z } from 'zod';

// Define o schema esperado da resposta da API da RapidAPI.
// Isso pode precisar de ajuste dependendo da API que você escolher.
const InstagramAPIResponseSchema = z.object({
  followers: z.number(),
  // Adicione outros campos que você possa querer usar, como 'following', 'full_name', etc.
});

// Define a estrutura do nosso retorno padronizado
type ActionResponse = {
  success: boolean;
  data?: z.infer<typeof InstagramAPIResponseSchema>;
  error?: string;
};

/**
 * Busca o número de seguidores de um usuário do Instagram usando uma API da RapidAPI.
 * @param username O nome de usuário do Instagram para buscar.
 * @returns Um objeto contendo o status da operação e os dados do seguidor.
 */
export async function getInstagramFollowers(username: string): Promise<ActionResponse> {
  const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  const apiHost = process.env.NEXT_PUBLIC_RAPIDAPI_HOST;

  if (!apiKey || !apiHost) {
    console.error("Variáveis de ambiente da RapidAPI não estão configuradas.");
    return { success: false, error: "O servidor não está configurado para se conectar à API. Fale com o administrador." };
  }

  // A URL pode variar dependendo da API escolhida na RapidAPI.
  // Consulte a documentação da API na RapidAPI para a URL correta.
  // Exemplo de URL comum: `https://<api-host>/user/info?username=<username>`
  const url = `https://${apiHost}/user/info?username=${username}`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost
    }
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
       // Tenta extrair uma mensagem de erro da resposta da API
      const errorMessage = result.message || `Erro do servidor: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    // Valida se a resposta da API corresponde ao nosso schema esperado
    const parsedData = InstagramAPIResponseSchema.safeParse(result);

    if (!parsedData.success) {
      console.error("A resposta da API não corresponde ao formato esperado:", parsedData.error);
      return { success: false, error: "O formato da resposta da API mudou ou é inesperado." };
    }

    return { success: true, data: parsedData.data };

  } catch (error: any) {
    console.error("Falha ao buscar dados da RapidAPI:", error);
    return { success: false, error: error.message || "Uma falha de comunicação com a API ocorreu." };
  }
}
