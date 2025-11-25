'use server';

import { z } from 'zod';

// Define o schema esperado da resposta da API da RapidAPI.
// A resposta real pode ser mais complexa, mas estamos interessados apenas nos seguidores.
const InstagramAPIResponseSchema = z.object({
  data: z.object({
    user: z.object({
      edge_followed_by: z.object({
        count: z.number(),
      }),
    }),
  }),
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
  // Como a API espera um POST, a URL provavelmente não terá parâmetros.
  const url = `https://${apiHost}/user/info`;

  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost
    },
    body: JSON.stringify({
      username: username,
      maxId: "" // Parâmetro adicional que a API pode esperar, mesmo que vazio
    })
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.message || `Erro do servidor: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    // O formato da resposta pode variar muito entre as APIs.
    // O schema abaixo é uma suposição comum baseada em APIs que retornam dados do GraphQL do Instagram.
    // Você talvez precise ajustá-lo com base na resposta REAL que você vê no "Results" da RapidAPI.
    const followers = result?.data?.user?.edge_followed_by?.count;

    const parsedFollowers = FollowersSchema.safeParse(followers);

    if (!parsedFollowers.success) {
      console.error("Não foi possível encontrar 'count' na resposta da API ou o formato é inesperado:", result);
      return { success: false, error: "A resposta da API não retornou o número de seguidores no formato esperado." };
    }

    return { success: true, data: { followers: parsedFollowers.data } };

  } catch (error: any) {
    console.error("Falha ao buscar dados da RapidAPI:", error);
    return { success: false, error: error.message || "Uma falha de comunicação com a API ocorreu." };
  }
}
