export type PapelMembro = 'PRESIDENTE' | 'AVALIADOR' | 'SUPLENTE';

export type StatusConvite = 'PENDENTE' | 'ACEITO' | 'RECUSADO';

export interface MembroBanca {
  id: number;
  bancaId: number;
  professorId: number;
  papel: PapelMembro;
  statusConvite: StatusConvite;
  respondidoEm?: string;
}

export type NovoMembroBanca = Omit<MembroBanca, 'id'>;
