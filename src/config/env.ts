interface Environment {
  supabase: {
    url: string;
    anonKey: string;
  };
  openai: {
    apiKey: string;
    defaultModel: string;
  };
  agora: {
    appId: string;
    tokenServer?: string;
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
  agora: {
    appId: import.meta.env.VITE_AGORA_APP_ID || "",
    tokenServer: import.meta.env.VITE_AGORA_TOKEN_SERVER,
  },
};

// Validate that essential environment variables are set
const validateEnv = (): boolean => {
  const requiredVars = [
    { key: "VITE_SUPABASE_URL", value: env.supabase.url },
    { key: "VITE_SUPABASE_ANON_KEY", value: env.supabase.anonKey },
    { key: "VITE_OPENAI_API_KEY", value: env.openai.apiKey },
    { key: "VITE_AGORA_APP_ID", value: env.agora.appId },
  ];

  let valid = true;
  const missing: string[] = [];

  requiredVars.forEach(({ key, value }) => {
    if (!value) {
      valid = false;
      missing.push(key);
    }
  });

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

# Agora Configuration (for voice chat)
VITE_AGORA_APP_ID=your_agora_app_id
VITE_AGORA_TOKEN_SERVER=optional_token_server_url
`;

// Run validation on import
validateEnv();

export default env;
