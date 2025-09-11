# Living Heirloom

## Project info

**URL**: 

## How can I edit this code?

There are several ways of editing your application.



**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Deploy using your preferred platform or static hosting service.

## Can I connect a custom domain?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Refer to your hosting provider's documentation for custom domain setup.

## Local AI generation (OSS 20B)

This project includes a small API server (`server/index.ts`) that calls any OpenAI-compatible endpoint (e.g., vLLM, Text Generation Inference, LM Studio, or Ollama OpenAI API). Configure it via environment variables:

- OPENAI_BASE_URL (default `http://localhost:11434/v1`)
- OPENAI_API_KEY (if your server requires a key)
- MODEL (default `gpt-neox-20b`)
- PORT (default `3001`)

Run both client and server during development:

```powershell
npm install
npm run dev:all
```

Ensure your OpenAI-compatible server is running a 20B-class OSS model (e.g., GPT-NeoX-20B) and accessible at `OPENAI_BASE_URL`.
