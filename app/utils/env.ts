import { isBrowser } from "./is-browser";

declare global {
  interface Window {
    env: {
      SUPABASE_URL: string;
      SUPABASE_ANON_PUBLIC: string;
      MAPTILER_TOKEN: string;
      MICROSOFT_CLARITY_ID: string;
      CRISP_WEBSITE_ID: string;
    };
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE: string;
      SERVER_URL: string;
      SUPABASE_ANON_PUBLIC: string;
      SESSION_SECRET: string;
      MAPTILER_TOKEN: string;
      CRISP_WEBSITE_ID: string;
      MICROSOFT_CLARITY_ID: string;
    }
  }
}

type EnvOptions = {
  isSecret?: boolean;
  isRequired?: boolean;
};
function getEnv(
  name: string,
  { isRequired, isSecret }: EnvOptions = { isSecret: true, isRequired: true }
) {
  if (isBrowser && isSecret) return "";

  const source = (isBrowser ? window.env : process.env) ?? {};

  const value = source[name as keyof typeof source];

  if (!value && isRequired) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

/**
 * Server env
 */
export const SERVER_URL = getEnv("SERVER_URL");
export const SUPABASE_SERVICE_ROLE = getEnv("SUPABASE_SERVICE_ROLE");
export const SESSION_SECRET = getEnv("SESSION_SECRET");

/**
 * Shared envs
 */
export const NODE_ENV = getEnv("NODE_ENV", {
  isSecret: false,
  isRequired: false,
});
export const SUPABASE_URL = getEnv("SUPABASE_URL", { isSecret: false });
export const SUPABASE_ANON_PUBLIC = getEnv("SUPABASE_ANON_PUBLIC", {
  isSecret: false,
});
export const MAPTILER_TOKEN = getEnv("MAPTILER_TOKEN", {
  isSecret: false,
});
export const CRISP_WEBSITE_ID = getEnv("CRISP_WEBSITE_ID", {
  isSecret: false,
  isRequired: false,
});
export const MICROSOFT_CLARITY_ID = getEnv("MICROSOFT_CLARITY_ID", {
  isSecret: false,
  isRequired: false,
});

export function getBrowserEnv() {
  return {
    SUPABASE_URL,
    SUPABASE_ANON_PUBLIC,
    MAPTILER_TOKEN,
    CRISP_WEBSITE_ID,
    MICROSOFT_CLARITY_ID,
  };
}
