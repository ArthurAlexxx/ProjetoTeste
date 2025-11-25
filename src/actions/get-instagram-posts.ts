'use server';

import { z } from 'zod';

const PostNodeSchema = z.object({
  like_count: z.number(),
  comment_count: z.number(),
  caption: z.object({
    text: z.string(),
  }).nullable(),
  media_type: z.number(), // 1 for Image, 2 for Video, 8 for Carousel
  image_versions2: z.object({
    candidates: z.array(z.object({
      url: z.string(),
    })),
  }).optional(),
  video_versions: z.array(z.object({
      url: z.string(),
    })).optional().nullable(),
});

const InstagramPostsAPIResponseSchema = z.object({
  result: z.object({
    edges: z.array(z.object({
      node: PostNodeSchema,
    })),
  }),
});

export type InstagramPost = {
  like_count: number;
  comment_count: number;
  caption: string;
  image_url: string | null;
  video_url: string | null;
  media_type: number;
};

type ActionResponse = {
  success: boolean;
  data?: InstagramPost[];
  error?: string;
};

export async function getInstagramPosts(username: string): Promise<ActionResponse> {
  const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  const apiHost = process.env.NEXT_PUBLIC_RAPIDAPI_HOST;

  if (!apiKey || !apiHost) {
    console.error("Variáveis de ambiente da RapidAPI não estão configuradas.");
    return { success: false, error: "O servidor não está configurado para se conectar à API. Fale com o administrador." };
  }
  
  const url = `https://${apiHost}/api/instagram/posts`;

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
    
    const parsedResponse = InstagramPostsAPIResponseSchema.safeParse(result);

    if (!parsedResponse.success) {
      console.error("Não foi possível encontrar os dados dos posts na resposta da API ou o formato é inesperado:", parsedResponse.error, result);
      return { success: false, error: "A resposta da API de posts não retornou os dados no formato esperado." };
    }

    const finalData: InstagramPost[] = parsedResponse.data.result.edges.map(edge => ({
      like_count: edge.node.like_count,
      comment_count: edge.node.comment_count,
      caption: edge.node.caption?.text ?? '',
      media_type: edge.node.media_type,
      image_url: edge.node.image_versions2?.candidates[0]?.url ?? null,
      video_url: edge.node.video_versions?.[0]?.url ?? null,
    }));

    return { success: true, data: finalData };

  } catch (error: any) {
    console.error("Falha ao buscar posts da RapidAPI:", error);
    return { success: false, error: error.message || "Uma falha de comunicação com a API de posts ocorreu." };
  }
}
