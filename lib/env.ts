/**
 * Punto único de lectura de variables de entorno del servidor.
 *
 * Lanza un error explícito y temprano si falta una variable obligatoria, en
 * vez de fallar más adelante con un error críptico de MongoDB/S3/JWT.
 */

interface GetEnvOptions {
  fallback?: string;
}

function getEnv(name: string, { fallback }: GetEnvOptions = {}): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(
      `Falta la variable de entorno "${name}". Copia .env.example a .env.local y complétala.`
    );
  }
  return value;
}

export const env = {
  mongodbUri: () => getEnv("MONGODB_URI"),
  mongodbDb: () => getEnv("MONGODB_DB"),

  rustfsEndpoint: () => getEnv("RUSTFS_ENDPOINT"),
  rustfsAccessKey: () => getEnv("RUSTFS_ACCESS_KEY"),
  rustfsSecretKey: () => getEnv("RUSTFS_SECRET_KEY"),
  rustfsBucket: () => getEnv("RUSTFS_BUCKET"),
  rustfsRegion: () => getEnv("RUSTFS_REGION", { fallback: "us-east-1" }),

  jwtSecret: () => getEnv("JWT_SECRET"),
  jwtExpiresIn: () => getEnv("JWT_EXPIRES_IN", { fallback: "7d" }),

  appUrl: () => getEnv("NEXT_PUBLIC_APP_URL", { fallback: "http://localhost:3000" }),
};
