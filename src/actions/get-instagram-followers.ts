'use server';

import { z } from 'zod';

// Define o schema do usuário dentro da resposta da API
const UserSchema = z.object({
  edge_followed_by: z.object({
    count: z.number(),
  }),
  edge_follow: z.object({
    count: z.number(),
  }),
  edge_owner_to_timeline_media: z.object({
    count: z.number(),
  }),
  full_name: z.string(),
  biography: z.string(),
});

// Define o schema da resposta completa da API da RapidAPI.
const InstagramAPIResponseSchema = z.object({
  result: UserSchema,
});

// Define a estrutura de dados que nossa função retornará
export type InstagramData = {
  follower_count: number;
  following_count: number;
  media_count: number;
  full_name: string;
  biography: string;
};

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
  
  const url = `https://${apiHost}/api/instagram/profile`;

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

    if (!parsedResponse.success) {
      console.error("Não foi possível encontrar os dados do usuário na resposta da API ou o formato é inesperado:", result);
      return { success: false, error: "A resposta da API não retornou os dados do usuário no formato esperado." };
    }

    const userData = parsedResponse.data.result;

    // Mapeia os dados da API para o nosso tipo de dados
    const finalData: InstagramData = {
      follower_count: userData.edge_followed_by.count,
      following_count: userData.edge_follow.count,
      media_count: userData.edge_owner_to_timeline_media.count,
      full_name: userData.full_name,
      biography: userData.biography,
    };

    return { success: true, data: finalData };

  } catch (error: any) {
    console.error("Falha ao buscar dados da RapidAPI:", error);
    return { success: false, error: error.message || "Uma falha de comunicação com a API ocorreu." };
  }
}
