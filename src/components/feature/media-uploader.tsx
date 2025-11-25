"use client";

import { useState } from "react";
import { User, Search, Loader2, XCircle, Users } from "lucide-react";
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
import { getInstagramFollowers } from "@/actions/get-instagram-followers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Status = "idle" | "loading" | "success" | "error";

export function MediaUploader() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{ followers: number } | null>(null);
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
        setResult({ followers: response.data.followers });
        setStatus("success");
        toast({
          title: "Sucesso!",
          description: `O usuário @${cleanUsername} tem ${response.data.followers.toLocaleString(
            "pt-BR"
          )} seguidores.`,
        });
      } else {
        // Usa o erro retornado pela nossa server action
        throw new Error(
          response.error || "Não foi possível encontrar os dados."
        );
      }
    } catch (e: any) {
      console.error("Erro ao buscar seguidores:", e);
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
    setUsername("");
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
            <p className="mt-4 text-sm font-medium">Buscando seguidores...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aguarde enquanto conectamos à API.
            </p>
          </div>
        );
      case "success":
        return (
          <div className="text-center space-y-4">
            <Users className="mx-auto h-12 w-12 text-success" />
            <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Busca Concluída</AlertTitle>
              <AlertDescription>
                O usuário <strong>@{username.replace('@','')}</strong> tem <br />
                <span className="text-2xl font-bold">
                  {result?.followers.toLocaleString("pt-BR")}
                </span>
                <br /> seguidores.
              </AlertDescription>
            </Alert>
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
              Buscar Seguidores
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          Buscador de Seguidores
        </CardTitle>
        <CardDescription>
          Insira um nome de usuário do Instagram para ver o número de
          seguidores.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
