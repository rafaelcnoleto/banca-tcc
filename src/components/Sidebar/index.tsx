import { Link } from 'react-router-dom';
import type { PerfilUsuario } from '../../models';
import { Nav, type NavItem } from '../Nav';

export interface SidebarProps {
  perfil: PerfilUsuario;
  activePath: string;
  naoLidas?: number;
}

const ITENS_POR_PERFIL: Record<PerfilUsuario, NavItem[]> = {
  ALUNO: [
    { to: '/inicio', label: 'Início', icon: 'bi-house-door' },
    { to: '/meu-tcc', label: 'Meu TCC / PDF', icon: 'bi-file-earmark-pdf' },
    { to: '/solicitar-banca', label: 'Solicitar banca', icon: 'bi-calendar-event' },
    { to: '/notificacoes', label: 'Notificações', icon: 'bi-bell' },
  ],
  PROFESSOR: [
    { to: '/inicio', label: 'Início', icon: 'bi-house-door' },
    { to: '/orientandos', label: 'Orientandos', icon: 'bi-people' },
    { to: '/minhas-bancas', label: 'Minhas bancas', icon: 'bi-clipboard-check' },
    { to: '/disponibilidade', label: 'Disponibilidade', icon: 'bi-clock' },
    { to: '/notificacoes', label: 'Notificações', icon: 'bi-bell' },
  ],
  COORDENADOR: [
    { to: '/inicio', label: 'Início', icon: 'bi-house-door' },
    { to: '/agenda-bancas', label: 'Agenda de bancas', icon: 'bi-calendar3' },
    { to: '/salas', label: 'Salas', icon: 'bi-door-open' },
    { to: '/periodos', label: 'Períodos letivos', icon: 'bi-calendar-range' },
    { to: '/usuarios', label: 'Usuários', icon: 'bi-people' },
    { to: '/notificacoes', label: 'Notificações', icon: 'bi-bell' },
  ],
};

export const Sidebar = ({ perfil, activePath, naoLidas = 0 }: SidebarProps) => {
  const itens = ITENS_POR_PERFIL[perfil].map((item) =>
    item.to === '/notificacoes' ? { ...item, badgeCount: naoLidas } : item
  );

  return (
    <aside className="btcc-sidebar no-print">
      <Link to="/inicio" className="btcc-sidebar-brand">
        <i className="bi bi-mortarboard-fill" aria-hidden="true" />
        <span>BancaTCC</span>
      </Link>

      <Nav items={itens} activePath={activePath} vertical />

      <div className="btcc-sidebar-footer">v1.0 · Sistema de Bancas</div>
    </aside>
  );
};
