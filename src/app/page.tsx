import { MediaUploader } from "@/components/feature/media-uploader";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <MediaUploader />
    </main>
  );
}
