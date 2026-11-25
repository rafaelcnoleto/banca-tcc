export type ModalidadeBanca = 'PRESENCIAL' | 'REMOTA' | 'HIBRIDA';

export type StatusBanca =
  | 'SOLICITADA'
  | 'CONFIRMADA'
  | 'REALIZADA'
  | 'CANCELADA'
  | 'REAGENDADA';

export type ResultadoBanca = 'APROVADO' | 'APROVADO_COM_RESSALVAS' | 'REPROVADO';

export interface Banca {
  id: number;
  tccId: number;
  salaId: number | null;
  arquivoAvaliadoId: number;
  dataHoraInicio: string;
  duracaoMinutos: number;
  modalidade: ModalidadeBanca;
  linkRemoto?: string;
  status: StatusBanca;
  notaFinal?: number;
  resultado?: ResultadoBanca;
  prazoCorrecoes?: string;
  criadoEm: string;
}

export type NovaBanca = Omit<Banca, 'id' | 'notaFinal' | 'resultado'>;
