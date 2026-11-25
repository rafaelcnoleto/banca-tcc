import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Alert, Layout } from '../components';
import { useAuth } from '../contexts/AuthContext';
import type { PerfilUsuario } from '../models';
import { AgendaBancas } from '../pages/AgendaBancas';
import { AtaDefesa } from '../pages/AtaDefesa';
import { AvaliacaoBanca } from '../pages/AvaliacaoBanca';
import { Disponibilidade } from '../pages/Disponibilidade';
import { Login } from '../pages/Login';
import { MeuTcc } from '../pages/MeuTcc';
import { MinhasBancas } from '../pages/MinhasBancas';
import { Notificacoes } from '../pages/Notificacoes';
import { Orientandos } from '../pages/Orientandos';
import { PainelInicial } from '../pages/PainelInicial';
import { Periodos } from '../pages/Periodos';
import { Salas } from '../pages/Salas';
import { SolicitarBanca } from '../pages/SolicitarBanca';
import { UsuariosProfessores } from '../pages/UsuariosProfessores';

interface RotaProtegidaProps {
  perfisPermitidos?: PerfilUsuario[];
  children: ReactNode;
}

const RotaProtegida = ({ perfisPermitidos, children }: RotaProtegidaProps) => {
  const { sessao, periodoAtivo, naoLidas, sair } = useAuth();
  const location = useLocation();

  if (!sessao) {
    return <Navigate to="/login" replace />;
  }

  const permitido =
    !perfisPermitidos || perfisPermitidos.includes(sessao.usuario.perfil);

  return (
    <Layout
      usuarioNome={sessao.usuario.nome}
      perfil={sessao.usuario.perfil}
      periodoDescricao={periodoAtivo?.descricao ?? '2026-2'}
      naoLidas={naoLidas}
      activePath={location.pathname}
      onSair={sair}
    >
      {permitido ? (
        children
      ) : (
        <Alert variant="danger" title="Acesso restrito">
          Seu perfil ({sessao.usuario.perfil}) não tem permissão para acessar esta funcionalidade.
        </Alert>
      )}
    </Layout>
  );
};

export const AppRoutes = () => {
  const { sessao } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={sessao ? <Navigate to="/inicio" replace /> : <Login />}
      />

      <Route
        path="/inicio"
        element={
          <RotaProtegida>
            <PainelInicial />
          </RotaProtegida>
        }
      />

      {/* Fluxo do Aluno */}
      <Route
        path="/meu-tcc"
        element={
          <RotaProtegida perfisPermitidos={['ALUNO']}>
            <MeuTcc />
          </RotaProtegida>
        }
      />
      <Route
        path="/solicitar-banca"
        element={
          <RotaProtegida perfisPermitidos={['ALUNO']}>
            <SolicitarBanca />
          </RotaProtegida>
        }
      />

      {/* Fluxo do Professor */}
      <Route
        path="/orientandos"
        element={
          <RotaProtegida perfisPermitidos={['PROFESSOR']}>
            <Orientandos />
          </RotaProtegida>
        }
      />
      <Route
        path="/minhas-bancas"
        element={
          <RotaProtegida perfisPermitidos={['PROFESSOR']}>
            <MinhasBancas />
          </RotaProtegida>
        }
      />
      <Route
        path="/disponibilidade"
        element={
          <RotaProtegida perfisPermitidos={['PROFESSOR']}>
            <Disponibilidade />
          </RotaProtegida>
        }
      />
      <Route
        path="/bancas/:id/avaliacao"
        element={
          <RotaProtegida perfisPermitidos={['PROFESSOR', 'COORDENADOR']}>
            <AvaliacaoBanca />
          </RotaProtegida>
        }
      />

      {/* Fluxo do Coordenador */}
      <Route
        path="/agenda-bancas"
        element={
          <RotaProtegida perfisPermitidos={['COORDENADOR']}>
            <AgendaBancas />
          </RotaProtegida>
        }
      />
      <Route
        path="/salas"
        element={
          <RotaProtegida perfisPermitidos={['COORDENADOR']}>
            <Salas />
          </RotaProtegida>
        }
      />
      <Route
        path="/periodos"
        element={
          <RotaProtegida perfisPermitidos={['COORDENADOR']}>
            <Periodos />
          </RotaProtegida>
        }
      />
      <Route
        path="/usuarios"
        element={
          <RotaProtegida perfisPermitidos={['COORDENADOR']}>
            <UsuariosProfessores />
          </RotaProtegida>
        }
      />

      {/* Recursos compartilhados */}
      <Route
        path="/bancas/:id/ata"
        element={
          <RotaProtegida>
            <AtaDefesa />
          </RotaProtegida>
        }
      />
      <Route
        path="/notificacoes"
        element={
          <RotaProtegida>
            <Notificacoes />
          </RotaProtegida>
        }
      />

      <Route
        path="/"
        element={<Navigate to={sessao ? '/inicio' : '/login'} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={sessao ? '/inicio' : '/login'} replace />}
      />
    </Routes>
  );
};
