# AI Photo Editor for Agents

A Next.js + React + Tailwind web application that allows real estate agents to upload property photos and use AI to edit them with simple text instructions like "Remove microwave" or "Fix glare in window".

## Features

### Frontend Features
- File upload for agents (JPEG/PNG)
- Text input box for simple editing instructions
- "Enhance Photo" button that triggers AI processing
- Before/After preview of edited images side-by-side
- Loading spinner during AI processing
- Download buttons for edited images

### Backend Features
- **`/api/refine-prompt`** - Uses Replicate LLM to convert agent instructions into polished AI prompts
- **`/api/edit`** - Uses Replicate API for high-quality image editing with FLUX models
- **`/api/generate`** - Uses Replicate API for property description generation
- Image storage via Supabase Storage with public URLs
- Comprehensive logging and error handling

### AI Models
- **Replicate**: `mistralai/mistral-7b-v0.1` for property description generation
- **Replicate**: `black-forest-labs/flux-kontext-pro` for photorealistic image editing

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI Services**: Replicate API (Property Descriptions & Image Editing)
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Replicate Token**: Get an API token from [Replicate](https://replicate.com/account/api-tokens)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-photo-editor-for-agents
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your API keys to `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Services
REPLICATE_API_TOKEN=your_replicate_token
```

4. Set up Supabase Storage:
   - Go to your Supabase project dashboard
   - Navigate to Storage
   - Create a new bucket named `video-assets`
   - Make it public and allow these MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
   - Or run the SQL script in `supabase-setup.sql` in your Supabase SQL Editor

5. Run database migrations:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and run the contents of `supabase-setup.sql`

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
ai-photo-editor-for-agents/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── edit/           # Main image editing API route
│   │   │   ├── refine-prompt/  # Prompt refinement API route
│   │   │   └── ...             # Other API routes
│   │   ├── photo-editor/       # Photo editor page
│   │   └── ...                 # Other pages
│   ├── components/             # Reusable React components
│   ├── contexts/               # React contexts
│   └── lib/                    # Utility libraries
├── supabase-setup.sql          # Database and storage setup
├── setup-storage.js           # Storage setup helper
└── README.md
```

## API Routes

### POST `/api/edit`
Edits an uploaded image using AI based on text instructions.

**Request Body (FormData):**
- `image`: Image file (JPEG/PNG)
- `prompt`: Text instruction (e.g., "Remove microwave")
- `mask`: Optional mask file for precise editing

**Response:**
```json
{
  "edited_image_url": "https://replicate.delivery/..."
}
```

### POST `/api/refine-prompt`
Converts simple agent instructions into polished AI prompts.

**Request Body:**
```json
{
  "instruction": "Remove microwave"
}
```

**Response:**
```json
{
  "refinedPrompt": "Remove the microwave from the kitchen counter, keeping all other elements exactly the same..."
}
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to [Vercel](https://vercel.com)
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Set environment variables on your hosting platform
3. Deploy the `.next` folder

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `REPLICATE_API_TOKEN` | Replicate API token (used for both property descriptions and image editing) | ✅ |
| `REPLICATE_API_TOKEN` | Replicate API token | ✅ |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
