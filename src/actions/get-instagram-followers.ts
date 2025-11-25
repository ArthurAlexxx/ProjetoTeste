'use server';

import { z } from 'zod';

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

const InstagramAPIResponseSchema = z.object({
  result: UserSchema,
});

export type InstagramData = {
  follower_count: number;
  following_count: number;
  media_count: number;
  full_name: string;
  biography: string;
};

type ActionResponse = {
  success: boolean;
  data?: InstagramData;
  error?: string;
};

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
    
    const parsedResponse = InstagramAPIResponseSchema.safeParse(result);

    if (!parsedResponse.success) {
      console.error("Não foi possível encontrar os dados do usuário na resposta da API ou o formato é inesperado:", parsedResponse.error, result);
      return { success: false, error: "A resposta da API de perfil não retornou os dados no formato esperado." };
    }

    const userData = parsedResponse.data.result;

    const finalData: InstagramData = {
      follower_count: userData.edge_followed_by.count,
      following_count: userData.edge_follow.count,
      media_count: userData.edge_owner_to_timeline_media.count,
      full_name: userData.full_name,
      biography: userData.biography,
    };

    return { success: true, data: finalData };

  } catch (error: any) {
    console.error("Falha ao buscar dados do perfil da RapidAPI:", error);
    return { success: false, error: error.message || "Uma falha de comunicação com a API de perfil ocorreu." };
  }
}
