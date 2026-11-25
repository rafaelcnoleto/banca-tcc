import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'light'
  | 'dark';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const MAPA_STATUS_VARIANT: Record<string, BadgeVariant> = {
  // Status TCC
  EM_ANDAMENTO: 'secondary',
  APTO_BANCA: 'warning',
  AGENDADO: 'primary',
  APROVADO: 'success',
  APROVADO_COM_RESSALVAS: 'warning',
  REPROVADO: 'danger',
  CONCLUIDO: 'success',
  // Status Arquivo
  PENDENTE: 'warning',
  APROVADO_ORIENTADOR: 'success',
  REJEITADO: 'danger',
  PUBLICADO: 'primary',
  // Status Banca
  SOLICITADA: 'warning',
  CONFIRMADA: 'primary',
  REALIZADA: 'success',
  CANCELADA: 'secondary',
  REAGENDADA: 'info',
  // Papéis e convites
  PRESIDENTE: 'primary',
  AVALIADOR: 'secondary',
  SUPLENTE: 'light',
  ACEITO: 'success',
  RECUSADO: 'danger',
};

export const resolverVarianteStatus = (status: string): BadgeVariant =>
  MAPA_STATUS_VARIANT[status] ?? 'secondary';

export const Badge = ({ children, variant = 'secondary', className = '' }: BadgeProps) => {
  const textoEscuro = variant === 'light' || variant === 'warning' ? 'text-dark' : '';
  return (
    <span className={`badge text-bg-${variant} ${textoEscuro} ${className}`.trim()}>
      {children}
    </span>
  );
};
