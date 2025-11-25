'use server';

import { z } from 'zod';

// Define o schema do usuário dentro da resposta da API
const UserSchema = z.object({
  follower_count: z.number(),
  following_count: z.number(),
  media_count: z.number(),
  total_clips_count: z.number().optional().default(0), // Reels podem não existir
  full_name: z.string(),
  biography: z.string(),
});

// Define o schema da resposta completa da API da RapidAPI.
const InstagramAPIResponseSchema = z.object({
  result: z.array(z.object({
    user: UserSchema,
  })),
});

// Extrai um tipo mais simples para o nosso uso, que será o tipo de retorno
export type InstagramData = z.infer<typeof UserSchema>;

// Define a estrutura do nosso retorno padronizado
type ActionResponse = {
  success: boolean;
  data?: InstagramData;
  error?: string;
};

/**
 * Busca os dados de um usuário do Instagram usando uma API da RapidAPI.
 * @param username O nome de usuário do Instagram para buscar.
 * @returns Um objeto contendo o status da operação e os dados do usuário.
 */
export async function getInstagramFollowers(username: string): Promise<ActionResponse> {
  const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  const apiHost = process.env.NEXT_PUBLIC_RAPIDAPI_HOST;

  if (!apiKey || !apiHost) {
    console.error("Variáveis de ambiente da RapidAPI não estão configuradas.");
    return { success: false, error: "O servidor não está configurado para se conectar à API. Fale com o administrador." };
  }
  
  const url = `https://${apiHost}/api/instagram/userInfo`;

  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost
    },
    body: JSON.stringify({
      username: username,
    })
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.message || `Erro do servidor: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    // Valida a resposta da API com o Zod
    const parsedResponse = InstagramAPIResponseSchema.safeParse(result);

    if (!parsedResponse.success || parsedResponse.data.result.length === 0) {
      console.error("Não foi possível encontrar os dados do usuário na resposta da API ou o formato é inesperado:", result);
      return { success: false, error: "A resposta da API não retornou os dados do usuário no formato esperado." };
    }

    const userData = parsedResponse.data.result[0].user;

    return { success: true, data: userData };

  } catch (error: any) {
    console.error("Falha ao buscar dados da RapidAPI:", error);
    return { success: false, error: error.message || "Uma falha de comunicação com a API ocorreu." };
  }
}
