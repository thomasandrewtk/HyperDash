# UploadThing Setup Guide

This guide will help you set up UploadThing for storing wallpapers in HyperDash.

## Overview

UploadThing serves two purposes in HyperDash:
1. **Preset Wallpapers**: Host your 5 preset wallpapers on UploadThing's CDN (keeps them out of your build)
2. **User Uploads**: Allow users to upload their own custom wallpapers

## Prerequisites

- An UploadThing account (sign up at https://uploadthing.com)
- Your UploadThing API credentials

## Step 1: Get Your UploadThing Token

1. Go to https://uploadthing.com/dashboard
2. Sign in or create an account
3. Create a new application (or use an existing one)
4. Navigate to your app's settings or API keys section
5. Copy your **UPLOADTHING_TOKEN** (this is a single token that contains your API key and app ID)

## Step 2: Configure Environment Variables

### Local Development

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add your UploadThing token:

```env
UPLOADTHING_TOKEN='your_uploadthing_token_here'
```

**Important**: 
- Replace `your_uploadthing_token_here` with your actual UploadThing token (from your dashboard)
- The token is a base64-encoded string that contains your API key and app ID
- Never commit `.env.local` to version control (it's already in `.gitignore`)

## Step 3: Upload Your Preset Wallpapers

To host your 5 preset wallpapers on UploadThing (so they don't take up build space):

### Option A: Via UploadThing Dashboard

1. Go to your UploadThing dashboard
2. Navigate to your app → **Files** section
3. Upload your 5 wallpaper images
4. Copy the URL for each uploaded file (format: `https://<APP_ID>.ufs.sh/f/<FILE_KEY>`)

### Option B: Via Your App (Temporary)

1. Start your dev server: `npm run dev`
2. Go to Settings → Wallpaper → Upload Custom Image
3. Upload each of your 5 wallpapers one by one
4. After each upload, check the browser console or network tab to get the UploadThing URL
5. Copy each URL

### Add URLs to Config

1. Open `app/lib/wallpaperConfig.ts`
2. Add your wallpaper URLs to the `WALLPAPER_PRESETS` array:

```typescript
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'wallpaper-1',
    name: 'Gradient Blue',
    url: 'https://xu4g9pm3u3.ufs.sh/f/abc123...', // Your UploadThing URL
  },
  {
    id: 'wallpaper-2',
    name: 'Abstract Dark',
    url: 'https://xu4g9pm3u3.ufs.sh/f/def456...', // Your UploadThing URL
  },
  // ... add all 5 wallpapers
];
```

3. Save the file - your preset wallpapers will now appear in the Settings panel!

## Step 4: Verify Setup (Local Development)

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open the app and navigate to Settings (System Info widget)
3. You should see:
   - **Presets section**: Your 5 preset wallpapers as selectable thumbnails
   - **Custom Upload**: Button to upload custom wallpapers
4. Try selecting a preset wallpaper - it should load instantly from UploadThing's CDN
5. Try uploading a custom wallpaper - it should upload and display correctly

## Step 5: Configure for Vercel Deployment

To make UploadThing work with your Vercel deployment, you need to add the environment variable in Vercel:

### Option A: Via Vercel Dashboard (Recommended)

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project → **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `UPLOADTHING_TOKEN`
   - **Value**: `eyJhcGlLZXkiOiJza19saXZlX2UwYzJmZjJmMjhlMjg1YTExOGJiMGRhYjY3NDQyOGRhNmEzNGRmNjFmMTQ5NDQ0MmNkODY2YmNjYTY0MWViMGEiLCJhcHBJZCI6Inh1NGc5cG0zdTMiLCJyZWdpb25zIjpbInNlYTEiXX0=`
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy your application** for the changes to take effect:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on your latest deployment
   - Select **Redeploy**

### Option B: Via Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Add the environment variable:
   ```bash
   vercel env add UPLOADTHING_TOKEN
   ```
   - When prompted, paste your token value
   - Select all environments (Production, Preview, Development)

3. Redeploy:
   ```bash
   vercel --prod
   ```

### Important Notes for Vercel:

- **Environment variables must be set for all environments** (Production, Preview, Development) if you want it to work everywhere
- **After adding/updating environment variables, you must redeploy** - Vercel doesn't automatically pick up new env vars on existing deployments
- The token value should be the same as your local `.env.local` file
- Vercel will automatically inject `process.env.UPLOADTHING_TOKEN` at build/runtime, so no code changes are needed
- **Your preset wallpaper URLs are in code** (`wallpaperConfig.ts`), so they'll work immediately after redeploy - no need to re-upload them

## Troubleshooting

### Upload fails with "Unauthorized"
- **Local**: Check that your `UPLOADTHING_TOKEN` is correct and properly formatted (should be a base64 string)
- **Local**: Make sure you've restarted your dev server after adding environment variables
- **Local**: Verify the token includes the quotes: `UPLOADTHING_TOKEN='your_token_here'`
- **Vercel**: Verify the environment variable is set correctly in Vercel dashboard
- **Vercel**: Make sure you've redeployed after adding/updating the environment variable
- **Vercel**: Check that the environment variable is enabled for the environment you're testing (Production/Preview/Development)

### Preset wallpapers not showing
- Check that you've added URLs to `app/lib/wallpaperConfig.ts`
- Verify the URLs are correct UploadThing URLs (format: `https://<APP_ID>.ufs.sh/f/<FILE_KEY>`)
- Make sure the URLs are accessible (try opening them in a browser)
- Restart your dev server after updating the config file

### CORS errors when analyzing wallpaper
- UploadThing URLs support CORS by default, so this shouldn't happen
- If you see CORS errors, check that your UploadThing app is configured correctly

### Images not displaying
- Verify the uploaded file URL is accessible in your browser
- Check the browser console for any CORS or loading errors
- **Vercel**: Check Vercel function logs for any API route errors (Settings → Functions → View Logs)

## Benefits of This Setup

✅ **Smaller Build Size**: Preset wallpapers are hosted on UploadThing's CDN, not in your build  
✅ **Fast Loading**: CDN delivery means wallpapers load quickly  
✅ **User Customization**: Users can still upload their own wallpapers  
✅ **Easy Updates**: Change preset wallpapers by updating URLs in `wallpaperConfig.ts`  
✅ **No Storage Limits**: UploadThing handles storage and bandwidth

## Security Notes

- **Never commit your `.env.local` file** - it contains sensitive credentials
- The `UPLOADTHING_TOKEN` should be kept private and only used server-side
- UploadThing handles file storage, CDN, and bandwidth automatically
- Files uploaded through the app are stored securely on UploadThing's infrastructure
- Preset wallpaper URLs are public (they're in your code), but that's fine since they're meant to be accessible

## File Limits

- Maximum file size: 10MB per image
- Supported formats: All image formats (JPEG, PNG, GIF, WebP, etc.)
- Files are automatically optimized and served via CDN
