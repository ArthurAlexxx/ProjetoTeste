"use client";

import { useState } from "react";
import { User, Search, Loader2, XCircle, Users, Rss, GalleryHorizontal, Heart, MessageCircle, PlayCircle } from "lucide-react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getInstagramFollowers, type InstagramData } from "@/actions/get-instagram-followers";
import { getInstagramPosts, type InstagramPost } from "@/actions/get-instagram-posts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";


type Status = "idle" | "loading" | "success" | "error";

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary text-secondary-foreground">
        {icon}
        <p className="text-xl font-bold mt-2">{value.toLocaleString("pt-BR")}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
    </div>
);

const PostCard = ({ post }: { post: InstagramPost }) => {
  const mediaUrl = post.media_type === 2 ? post.video_url : post.image_url;

  return (
    <Card className="flex flex-col">
      <CardContent className="p-0">
        {mediaUrl ? (
          post.media_type === 2 ? (
            <video controls src={mediaUrl} className="w-full h-auto rounded-t-lg" />
          ) : (
            <Image
              src={mediaUrl}
              alt="Post media"
              width={600}
              height={600}
              className="w-full h-auto object-cover rounded-t-lg"
            />
          )
        ) : <div className="w-full h-64 bg-secondary rounded-t-lg flex items-center justify-center text-muted-foreground">Sem Mídia</div>}
      </CardContent>
      <div className="p-4 flex-grow flex flex-col">
        <p className="text-xs text-muted-foreground flex-grow mb-4">{post.caption}</p>
        <Separator className="my-2" />
        <div className="flex items-center justify-around text-xs">
           {post.media_type === 2 ? (
            <div className="flex items-center gap-1">
              <PlayCircle className="w-4 h-4 text-primary" />
              <span>{(post.view_count ?? 0).toLocaleString("pt-BR")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-primary" />
              <span>{post.like_count.toLocaleString("pt-BR")}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span>{post.comment_count.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>
    </Card>
  )
};


export function MediaUploader() {
  const [username, setUsername] = useState("neymarjr");
  const [status, setStatus] = useState<Status>("idle");
  const [profile, setProfile] = useState<InstagramData | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!username) {
      setError("Por favor, insira um nome de usuário do Instagram.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    setProfile(null);
    setPosts([]);

    try {
      const cleanUsername = username.replace('@', '');
      
      // Fetch profile and posts in parallel
      const [profileResponse, postsResponse] = await Promise.all([
        getInstagramFollowers(cleanUsername),
        getInstagramPosts(cleanUsername)
      ]);

      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
      } else {
        throw new Error(
          profileResponse.error || "Não foi possível encontrar os dados do perfil."
        );
      }

      if (postsResponse.success && postsResponse.data) {
        setPosts(postsResponse.data);
      } else {
        // This is not a critical error, so we just toast a warning.
        toast({
          title: "Aviso",
          description: postsResponse.error || "Não foi possível buscar os posts.",
          variant: "default",
        });
      }
      
      setStatus("success");
      toast({
        title: "Sucesso!",
        description: `Dados de @${cleanUsername} encontrados.`,
      });

    } catch (e: any) {
      console.error("Erro ao buscar dados:", e);
      const errorMsg = e.message || "Ocorreu um erro desconhecido.";
      setError(errorMsg);
      setStatus("error");
      toast({
        title: "Falha na Busca",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setProfile(null);
    setPosts([]);
    setError("");
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium">Buscando dados...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aguarde enquanto conectamos à API.
            </p>
          </div>
        );
      case "success":
        return (
          <div className="text-center space-y-6">
            <div>
              <Alert>
                <Users className="h-4 w-4" />
                <AlertTitle>{profile?.full_name}</AlertTitle>
                <AlertDescription>
                  <p className="font-bold">@{username.replace('@','')}</p>
                  <p className="text-xs mt-1">{profile?.biography}</p>
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-3 gap-2 text-center mt-4">
                  <StatCard icon={<Users className="w-6 h-6 text-primary"/>} label="Seguidores" value={profile?.follower_count ?? 0} />
                  <StatCard icon={<Rss className="w-6 h-6 text-primary"/>} label="Seguindo" value={profile?.following_count ?? 0} />
                  <StatCard icon={<GalleryHorizontal className="w-6 h-6 text-primary"/>} label="Publicações" value={profile?.media_count ?? 0} />
              </div>
            </div>

            {posts.length > 0 && (
              <div>
                <Separator />
                <h3 className="text-lg font-semibold my-4">Posts Recentes</h3>
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent>
                    {posts.map((post, index) => (
                      <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                        <div className="p-1 h-full">
                          <PostCard post={post} />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="ml-12"/>
                  <CarouselNext className="mr-12"/>
                </Carousel>
              </div>
            )}

            <Button onClick={handleReset} variant="outline">
              Buscar Outro Usuário
            </Button>
          </div>
        );
      case "error":
        return (
          <div className="text-center space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Erro na Busca</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleReset} variant="secondary">
              Tentar Novamente
            </Button>
          </div>
        );
      case "idle":
      default:
        return (
          <div className="flex flex-col space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="@username"
                className="pl-10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={status === "loading" || !username}
            >
              <Search className="mr-2" />
              Buscar Dados
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          Analisador de Perfil do Instagram
        </CardTitle>
        <CardDescription>
          Insira um nome de usuário do Instagram para ver os dados do
          perfil e suas publicações.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
