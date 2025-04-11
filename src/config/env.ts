interface Environment {
  supabase: {
    url: string;
    anonKey: string;
  };
  openai: {
    apiKey: string;
    defaultModel: string;
  };
  claude: {
    apiKey: string;
    defaultModel: string;
  };
  agora: {
    appId: string;
    tokenServer?: string;
  };
  elevenlabs?: {
    apiKey: string;
    defaultModel: string;
  };
}

// Validate environment variables and provide type safety
const env: Environment = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || "",
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  },
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || "",
    defaultModel:
      import.meta.env.VITE_OPENAI_DEFAULT_MODEL || "gpt-4-turbo-preview",
  },
  claude: {
    apiKey: import.meta.env.VITE_CLAUDE_API_KEY || "",
    defaultModel:
      import.meta.env.VITE_CLAUDE_DEFAULT_MODEL || "claude-3-7-sonnet-20240307",
  },
  agora: {
    appId: import.meta.env.VITE_AGORA_APP_ID || "",
    tokenServer: import.meta.env.VITE_AGORA_TOKEN_SERVER,
  },
  // ElevenLabs configuration
  elevenlabs: import.meta.env.VITE_ELEVENLABS_API_KEY
    ? {
        apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
        defaultModel:
          import.meta.env.VITE_ELEVENLABS_DEFAULT_MODEL || "eleven_turbo_v2",
      }
    : undefined,
};

// Validate that essential environment variables are set
const validateEnv = (): boolean => {
  const requiredVars = [
    { key: "VITE_SUPABASE_URL", value: env.supabase.url },
    { key: "VITE_SUPABASE_ANON_KEY", value: env.supabase.anonKey },
    // We'll validate either OpenAI or Claude key must be present
    // But both are not strictly required
  ];

  let valid = true;
  const missing: string[] = [];

  requiredVars.forEach(({ key, value }) => {
    if (!value) {
      valid = false;
      missing.push(key);
    }
  });

  // At least one AI provider must be configured
  if (!env.openai.apiKey && !env.claude.apiKey) {
    valid = false;
    missing.push("VITE_OPENAI_API_KEY or VITE_CLAUDE_API_KEY");
  }

  if (!valid) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}. 
      Please make sure these are set in your .env file.`
    );
  }

  return valid;
};

// Create a sample .env file template to assist with configuration
export const envTemplate = `
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview

# Claude AI Configuration
VITE_CLAUDE_API_KEY=your_claude_api_key
VITE_CLAUDE_DEFAULT_MODEL=claude-3-7-sonnet-20240307

# Agora Configuration (for voice chat)
VITE_AGORA_APP_ID=your_agora_app_id
VITE_AGORA_TOKEN_SERVER=optional_token_server_url

# ElevenLabs Configuration (for NPC voice synthesis)
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_ELEVENLABS_DEFAULT_MODEL=eleven_turbo_v2
`;

// Run validation on import
validateEnv();

export default env;
