const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const url = `${BASE_URL}${path}`;
  try {
    const resp = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Erro ${resp.status} ao acessar ${path}: ${text || resp.statusText}`);
    }

    if (resp.status === 204) {
      return undefined as T;
    }

    const contentLength = resp.headers.get('content-length');
    if (contentLength === '0') {
      return undefined as T;
    }

    return (await resp.json()) as T;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        'Não foi possível conectar ao servidor JSON Server (porta 3001). Execute "npm run api" em um terminal separado.'
      );
    }
    throw err;
  }
};

export const semId = <T extends object>(obj: T): Omit<T, 'id'> => {
  const copia = { ...obj } as T & { id?: number };
  delete copia.id;
  return copia;
};
