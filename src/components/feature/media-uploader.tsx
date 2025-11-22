"use client";

import { useState, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  UploadCloud,
  File as FileIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Clapperboard
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { analyzeVideo } from "@/ai/flows/analyze-video-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type UploadStatus = "idle" | "uploading" | "success" | "error";
type AnalysisStatus = "idle" | "loading" | "success" | "error";

export function MediaUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string>("");

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
      resetState();
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const resetState = () => {
    setStatus("idle");
    setProgress(0);
    setDownloadURL(null);
    setError(null);
    setAnalysisStatus("idle");
    setAnalysisResult("");
    setAnalysisError("");
  };

  const handleReset = () => {
    setFile(null);
    resetState();
  };

  const handleAnalyzeVideo = async () => {
    if (!file || !file.type.startsWith('video/')) {
        setAnalysisError("Please upload a valid video file to analyze.");
        setAnalysisStatus("error");
        return;
    }

    setAnalysisStatus("loading");
    setAnalysisError("");
    setAnalysisResult("");

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            
            const result = await analyzeVideo({ videoDataUri: base64data });

            if (result && result.analysis) {
                setAnalysisResult(result.analysis);
                setAnalysisStatus("success");
            } else {
                throw new Error("Analysis failed to produce a result.");
            }
        };
        reader.onerror = () => {
            throw new Error("Failed to read the video file.");
        }
    } catch (e: any) {
        console.error("Analysis error:", e);
        const errorMsg = e.message || "An unknown error occurred during analysis.";
        setAnalysisError(errorMsg);
        setAnalysisStatus("error");
        toast({
            title: "Analysis Failed",
            description: errorMsg,
            variant: "destructive",
        });
    }
  };


  const handleUpload = useCallback(() => {
    if (!file) {
      setError("Please select a file first.");
      console.error("Upload error: No file selected.");
      return;
    }
    
    if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
      const errorMsg = "Firebase Storage is not configured. Please check your .env.local file.";
      console.error(errorMsg);
      setError(errorMsg);
      setStatus("error");
      toast({
        title: "Configuration Error",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    setStatus("uploading");
    setError(null);

    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error.code, error.message, error);
        let errorMsg = `Upload failed: ${error.message}`;

        switch (error.code) {
          case 'storage/unauthorized':
            errorMsg = "Upload failed: You do not have permission to upload files. Please check your Firebase Storage security rules.";
            console.error("Security Rules error: User does not have permission for this action.");
            break;
          case 'storage/canceled':
            errorMsg = "Upload was canceled.";
            console.error("Upload canceled by the user.");
            setStatus("idle");
            return;
          case 'storage/quota-exceeded':
            errorMsg = "Upload failed: Storage quota exceeded. Please upgrade your plan or free up space.";
            console.error("Storage quota exceeded for this Firebase project.");
            break;
          case 'storage/unauthenticated':
            errorMsg = "Upload failed: User is not authenticated. Please log in.";
            console.error("User is not authenticated. Security rules may require authentication.");
            break;
          case 'storage/unknown':
          default:
            errorMsg = "An unknown error occurred during upload. Check the console for details.";
            console.error("An unknown Firebase Storage error occurred:", error);
            break;
        }
        
        setError(errorMsg);
        setStatus("error");
        toast({
          title: "Upload Failed",
          description: errorMsg,
          variant: "destructive",
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          setDownloadURL(url);
          setStatus("success");
          setProgress(100);
          toast({
            title: "Upload Successful",
            description: "Your file has been uploaded.",
          });
        });
      }
    );
  }, [file, toast]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    switch (status) {
      case "uploading":
        return (
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium">Uploading...</p>
            <Progress value={progress} className="mt-2 w-full" />
            <p className="mt-1 text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        );
      case "success":
        const isVideo = file?.type.startsWith('video/');
        return (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="mt-4 font-semibold">Upload Complete!</p>
            <p className="mt-2 text-sm text-muted-foreground">Your file is now available.</p>
            
            <div className="mt-6 flex flex-col items-center gap-4">
              <a href={downloadURL!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm break-all">
                View File
              </a>

              {isVideo && (
                <div className="w-full space-y-4">
                  <Button onClick={handleAnalyzeVideo} disabled={analysisStatus === 'loading'}>
                    {analysisStatus === 'loading' ? (
                      <Loader2 className="mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2" />
                    )}
                    Analisar Vídeo
                  </Button>

                  {analysisStatus === 'success' && analysisResult && (
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertTitle>Análise do Vídeo</AlertTitle>
                      <AlertDescription>
                        {analysisResult}
                      </AlertDescription>
                    </Alert>
                  )}

                  {analysisStatus === 'error' && analysisError && (
                     <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Erro na Análise</AlertTitle>
                      <AlertDescription>
                        {analysisError}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Button onClick={handleReset} variant="outline" className="mt-2">
                Upload Another File
              </Button>
            </div>
          </div>
        );
      case "error":
        return (
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 font-semibold">Upload Failed</p>
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <Button onClick={handleReset} variant="secondary" className="mt-4">
              Try Again
            </Button>
          </div>
        );
      default: // idle
        const fileIcon = file?.type.startsWith('video/') ? <Clapperboard className="mx-auto h-12 w-12 text-gray-400" /> : <FileIcon className="mx-auto h-12 w-12 text-gray-400" />;
        return file ? (
          <div className="space-y-4 text-center">
            {fileIcon}
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            <div className="flex justify-center gap-4">
              <Button onClick={handleUpload}>Upload File</Button>
              <Button onClick={handleReset} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/10" : "border-border"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <UploadCloud className="h-12 w-12 text-gray-400" />
            <p className="mt-4 font-semibold">Drag & drop your file here</p>
            <p className="mt-1 text-sm text-muted-foreground">or</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
              accept="image/*,video/*"
            />
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Media Uploader</CardTitle>
        <CardDescription>
          Upload your photos and videos. The AI can analyze video content.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
