export type TipoArquivoTcc = 'PRE_BANCA' | 'VERSAO_CORRIGIDA' | 'VERSAO_FINAL';

export type StatusArquivoTcc =
  | 'PENDENTE'
  | 'APROVADO_ORIENTADOR'
  | 'REJEITADO'
  | 'PUBLICADO';

export interface ArquivoTcc {
  id: number;
  tccId: number;
  enviadoPorId: number;
  tipo: TipoArquivoTcc;
  versao: number;
  nomeOriginal: string;
  caminhoStorage: string;
  mimeType: 'application/pdf';
  tamanhoBytes: number;
  hashSha256: string;
  enviadoEm: string;
  status: StatusArquivoTcc;
  observacao: string;
  conteudoBase64?: string;
}

export type NovoArquivoTcc = Omit<ArquivoTcc, 'id'>;
