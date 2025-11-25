'use server';

import { z } from 'zod';

// Define o schema esperado da resposta da API da RapidAPI.
const InstagramAPIResponseSchema = z.object({
  result: z.array(z.object({
    user: z.object({
      follower_count: z.number(),
    }),
  })),
});

// Extrai um tipo mais simples para o nosso uso
const FollowersSchema = z.number();

// Define a estrutura do nosso retorno padronizado
type ActionResponse = {
  success: boolean;
  data?: { followers: number };
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

  // A URL pode variar. Verifique a documentação da API na RapidAPI.
  const url = `https://${apiHost}/user/info_by_username`;

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
    
    // Caminho para o número de seguidores baseado na resposta real da API.
    const followers = result?.result?.[0]?.user?.follower_count;

    const parsedFollowers = FollowersSchema.safeParse(followers);

    if (!parsedFollowers.success) {
      console.error("Não foi possível encontrar 'follower_count' na resposta da API ou o formato é inesperado:", result);
      return { success: false, error: "A resposta da API não retornou o número de seguidores no formato esperado." };
    }

    return { success: true, data: { followers: parsedFollowers.data } };

  } catch (error: any) {
    console.error("Falha ao buscar dados da RapidAPI:", error);
    return { success: false, error: error.message || "Uma falha de comunicação com a API ocorreu." };
  }
}
