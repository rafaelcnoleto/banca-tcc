export interface AtaBanca {
  id: number;
  bancaId: number;
  caminhoPdf: string;
  geradaEm: string;
  assinada: boolean;
}

export type NovaAtaBanca = Omit<AtaBanca, 'id'>;
