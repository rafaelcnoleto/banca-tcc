import { Link } from 'react-router-dom';
import type { PerfilUsuario } from '../../models';

export interface NavbarProps {
  usuarioNome: string;
  perfil: PerfilUsuario;
  periodoDescricao: string;
  naoLidas: number;
  onSair: () => void;
}

const LABEL_PERFIL: Record<PerfilUsuario, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  COORDENADOR: 'Coordenador',
};

export const Navbar = ({
  usuarioNome,
  perfil,
  periodoDescricao,
  naoLidas,
  onSair,
}: NavbarProps) => {
  const inicial = usuarioNome.trim().charAt(0).toUpperCase() || 'U';

  return (
    <header className="btcc-topbar no-print">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Período letivo</span>
          <span className="badge text-bg-light border text-dark fw-semibold px-2 py-1">
            {periodoDescricao}
          </span>
        </div>

        <div className="d-flex align-items-center gap-3">
          <Link
            to="/notificacoes"
            className="btn btn-light btn-sm position-relative border-0 bg-transparent"
            title="Notificações"
          >
            <i className="bi bi-bell fs-5 text-secondary" aria-hidden="true" />
            {naoLidas > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {naoLidas}
              </span>
            )}
          </Link>

          <div className="d-flex align-items-center gap-2">
            <div className="text-end lh-sm">
              <div className="fw-semibold small text-dark">{usuarioNome}</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                {LABEL_PERFIL[perfil]}
              </div>
            </div>
            <div className="btcc-avatar" aria-hidden="true">
              {inicial}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onSair}
            title="Sair do sistema"
          >
            <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
};
