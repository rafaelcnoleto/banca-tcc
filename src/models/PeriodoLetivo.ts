export interface PeriodoLetivo {
  id: number;
  descricao: string;
  inicioAgendamento: string;
  fimAgendamento: string;
  prazoEnvioPreBanca: string;
  prazoEnvioVersaoFinal: string;
}

export type NovoPeriodoLetivo = Omit<PeriodoLetivo, 'id'>;
