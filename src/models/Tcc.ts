export type StatusTcc =
  | 'EM_ANDAMENTO'
  | 'APTO_BANCA'
  | 'AGENDADO'
  | 'APROVADO'
  | 'APROVADO_COM_RESSALVAS'
  | 'REPROVADO'
  | 'CONCLUIDO';

export interface Tcc {
  id: number;
  alunoId: number;
  orientadorId: number;
  coorientadorId: number | null;
  periodoId: number;
  titulo: string;
  resumo: string;
  palavrasChave: string;
  status: StatusTcc;
  criadoEm: string;
}

export type NovoTcc = Omit<Tcc, 'id'>;
