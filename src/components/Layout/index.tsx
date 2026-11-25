import type { ReactNode } from 'react';
import type { PerfilUsuario } from '../../models';
import { Navbar } from '../Navbar';
import { Sidebar } from '../Sidebar';

export interface LayoutProps {
  usuarioNome: string;
  perfil: PerfilUsuario;
  periodoDescricao: string;
  naoLidas: number;
  activePath: string;
  onSair: () => void;
  children: ReactNode;
}

export const Layout = ({
  usuarioNome,
  perfil,
  periodoDescricao,
  naoLidas,
  activePath,
  onSair,
  children,
}: LayoutProps) => {
  return (
    <div className="btcc-app-shell">
      <Sidebar perfil={perfil} activePath={activePath} naoLidas={naoLidas} />
      <div className="btcc-main-wrapper">
        <Navbar
          usuarioNome={usuarioNome}
          perfil={perfil}
          periodoDescricao={periodoDescricao}
          naoLidas={naoLidas}
          onSair={onSair}
        />
        <main className="btcc-content">
          <div className="container-fluid px-0">{children}</div>
        </main>
      </div>
    </div>
  );
};
