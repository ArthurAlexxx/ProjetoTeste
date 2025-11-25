"use client";

import { useState } from "react";
import { User, Search, Loader2, XCircle, Users, Rss, GalleryHorizontal, Film } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Status = "idle" | "loading" | "success" | "error";

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary text-secondary-foreground">
        {icon}
        <p className="text-xl font-bold mt-2">{value.toLocaleString("pt-BR")}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
    </div>
);

export function MediaUploader() {
  const [username, setUsername] = useState("neymarjr");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<InstagramData | null>(null);
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
    setResult(null);

    try {
      // Remove o '@' se o usuário tiver digitado
      const cleanUsername = username.replace('@', '');
      const response = await getInstagramFollowers(cleanUsername);

      if (response.success && response.data) {
        setResult(response.data);
        setStatus("success");
        toast({
          title: "Sucesso!",
          description: `Dados de @${cleanUsername} encontrados.`,
        });
      } else {
        throw new Error(
          response.error || "Não foi possível encontrar os dados."
        );
      }
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
    setResult(null);
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
          <div className="text-center space-y-4">
            <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>{result?.full_name}</AlertTitle>
              <AlertDescription>
                <p className="font-bold">@{username.replace('@','')}</p>
                <p className="text-xs mt-1">{result?.biography}</p>
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <StatCard icon={<Users className="w-6 h-6 text-primary"/>} label="Seguidores" value={result?.follower_count ?? 0} />
                <StatCard icon={<Rss className="w-6 h-6 text-primary"/>} label="Seguindo" value={result?.following_count ?? 0} />
                <StatCard icon={<GalleryHorizontal className="w-6 h-6 text-primary"/>} label="Publicações" value={result?.media_count ?? 0} />
                <StatCard icon={<Film className="w-6 h-6 text-primary"/>} label="Reels" value={result?.total_clips_count ?? 0} />
            </div>
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
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          Analisador de Perfil do Instagram
        </CardTitle>
        <CardDescription>
          Insira um nome de usuário do Instagram para ver os dados do
          perfil.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
