import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Input, Modal } from '../../components';
import { useAuth } from '../../contexts/AuthContext';

interface CredencialTeste {
  rotulo: string;
  subtitulo: string;
  email: string;
  senha: string;
}

const CREDENCIAIS_TESTE: CredencialTeste[] = [
  {
    rotulo: 'Mariana (Aluna)',
    subtitulo: 'TCC APTO_BANCA · solicitar banca',
    email: 'mariana@univ.edu.br',
    senha: '123',
  },
  {
    rotulo: 'Pedro (Aluno)',
    subtitulo: 'PDF pré-banca PENDENTE',
    email: 'pedro@univ.edu.br',
    senha: '123',
  },
  {
    rotulo: 'Lucas (Aluno)',
    subtitulo: 'Sem TCC cadastrado',
    email: 'lucas@univ.edu.br',
    senha: '123',
  },
  {
    rotulo: 'Prof. Carlos (Professor)',
    subtitulo: 'Orientador + Avaliador pendente',
    email: 'carlos@univ.edu.br',
    senha: '123',
  },
  {
    rotulo: 'Profa. Marta (Professor)',
    subtitulo: 'Presidente / Avaliadora',
    email: 'marta@univ.edu.br',
    senha: '123',
  },
  {
    rotulo: 'Profa. Helena (Coord.)',
    subtitulo: 'Agenda, conflito de sala e CRUDs',
    email: 'helena@univ.edu.br',
    senha: '123',
  },
];

export const Login = () => {
  const { entrar, carregandoSessao } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('mariana@univ.edu.br');
  const [senha, setSenha] = useState('123');
  const [lembrar, setLembrar] = useState(true);
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [modalEsqueci, setModalEsqueci] = useState(false);

  const validar = (): boolean => {
    const novosErros: { email?: string; senha?: string } = {};
    if (!email.trim()) {
      novosErros.email = 'Informe o e-mail institucional.';
    } else if (!email.includes('@')) {
      novosErros.email = 'Informe um e-mail válido.';
    }
    if (!senha.trim()) {
      novosErros.senha = 'Informe a senha.';
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const autenticar = async (emailAlvo: string, senhaAlvo: string) => {
    setErroGeral(null);
    try {
      await entrar(emailAlvo, senhaAlvo);
      navigate('/inicio', { replace: true });
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Erro ao autenticar.');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validar()) return;
    await autenticar(email, senha);
  };

  return (
    <div className="btcc-login-wrapper row g-0">
      <div className="col-lg-6 btcc-login-hero">
        <div className="mx-auto" style={{ maxWidth: '460px' }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-mortarboard-fill fs-2" aria-hidden="true" />
            <h1 className="h2 fw-bold mb-0">BancaTCC</h1>
          </div>
          <p className="fs-5 text-white-50 mb-4">
            Agende sua banca de TCC, envie o PDF e acompanhe a avaliação em um só lugar.
          </p>
          <ul className="list-unstyled d-flex flex-column gap-2 text-white-50">
            <li className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle" aria-hidden="true" />
              <span>Envio versionado do PDF</span>
            </li>
            <li className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle" aria-hidden="true" />
              <span>Agendamento com checagem de conflitos</span>
            </li>
            <li className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle" aria-hidden="true" />
              <span>Avaliação e ata digitais</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="col-lg-6 btcc-login-panel">
        <div className="w-100 d-flex flex-column align-items-center gap-3">
          <div className="btcc-login-card">
            <h2 className="h4 fw-bold mb-1">Entrar</h2>
            <p className="text-muted small mb-4">Use seu e-mail institucional</p>

            {erroGeral && (
              <Alert variant="danger" onClose={() => setErroGeral(null)}>
                {erroGeral}
              </Alert>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              <Input
                id="login-email"
                label="E-mail"
                type="email"
                value={email}
                onChange={(val) => setEmail(val)}
                placeholder="nome@univ.edu.br"
                error={erros.email}
                required
              />
              <Input
                id="login-senha"
                label="Senha"
                type="password"
                value={senha}
                onChange={(val) => setSenha(val)}
                placeholder="••••••••"
                error={erros.senha}
                required
              />

              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="form-check">
                  <input
                    id="lembrar-me"
                    type="checkbox"
                    className="form-check-input"
                    checked={lembrar}
                    onChange={(e) => setLembrar(e.target.checked)}
                  />
                  <label htmlFor="lembrar-me" className="form-check-label small text-muted">
                    Lembrar-me
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={() => setModalEsqueci(true)}
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-100 py-2 fw-semibold"
                disabled={carregandoSessao}
              >
                {carregandoSessao ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </div>

          <div className="btcc-login-card py-3 px-3">
            <div className="small fw-semibold text-secondary mb-2">
              Acesso rápido para demonstração (senha: <code>123</code>)
            </div>
            <div className="row g-2">
              {CREDENCIAIS_TESTE.map((cred) => (
                <div className="col-sm-6" key={cred.email}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm w-100 text-start"
                    disabled={carregandoSessao}
                    onClick={() => {
                      setEmail(cred.email);
                      setSenha(cred.senha);
                      void autenticar(cred.email, cred.senha);
                    }}
                  >
                    <div className="fw-semibold text-dark">{cred.rotulo}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {cred.subtitulo}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={modalEsqueci}
        title="Recuperação de senha (ambiente simulado)"
        onClose={() => setModalEsqueci(false)}
        footer={
          <Button variant="primary" onClick={() => setModalEsqueci(false)}>
            Entendi
          </Button>
        }
      >
        <p className="mb-2">
          Neste protótipo acadêmico a autenticação é simulada diretamente sobre a coleção{' '}
          <code>/usuarios</code> do JSON Server.
        </p>
        <p className="mb-0 text-muted small">
          Para todos os usuários de teste pré-cadastrados em <code>db.json</code>, utilize a senha{' '}
          <strong>123</strong> ou clique nos atalhos de acesso rápido abaixo do formulário.
        </p>
      </Modal>
    </div>
  );
};
