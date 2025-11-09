import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

/**
 * Core file router for UploadThing
 * Handles wallpaper image uploads
 */
export const ourFileRouter = {
  // Wallpaper uploader endpoint
  wallpaperUploader: f({ image: { maxFileSize: "10MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ metadata, file }) => {
      // File uploaded successfully
      console.log("Wallpaper uploaded:", file.url);
      return { uploadedBy: "user" };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

