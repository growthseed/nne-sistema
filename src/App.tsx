import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import CadastroPage from '@/pages/cadastro/CadastroPage'
import CadastroPublicoPage from '@/pages/cadastro/CadastroPublicoPage'
import CadastroDashboardPage from '@/pages/cadastro/CadastroDashboardPage'
import MembrosPage from '@/pages/membros/MembrosPage'
import MembroDetalhePage from '@/pages/membros/MembroDetalhePage'
import CartaoMembroPage from '@/pages/membros/CartaoMembroPage'
import FamiliasPage from '@/pages/membros/FamiliasPage'
import SecretariaPage from '@/pages/secretaria/SecretariaPage'
import ContagemMensalPage from '@/pages/secretaria/ContagemMensalPage'
import TransferenciasPage from '@/pages/secretaria/TransferenciasPage'
import AniversariantesPage from '@/pages/secretaria/AniversariantesPage'
import FunilConversaoPage from '@/pages/secretaria/FunilConversaoPage'
import SaudeMembrosPage from '@/pages/secretaria/SaudeMembrosPage'
import ClassesBiblicasPage from '@/pages/secretaria/ClassesBiblicasPage'
import UnioesPage from '@/pages/organizacao/UnioesPage'
import AssociacoesPage from '@/pages/organizacao/AssociacoesPage'
import IgrejasPage from '@/pages/organizacao/IgrejasPage'
import FinanceiroPage from '@/pages/financeiro/FinanceiroPage'
import LancamentosPage from '@/pages/financeiro/LancamentosPage'
import ReceitaCampoPage from '@/pages/financeiro/ReceitaCampoPage'
import ClassesPage from '@/pages/escola-sabatina/ClassesPage'
// ClassesBatismaisPage removida
import PresencaPage from '@/pages/escola-sabatina/PresencaPage'
import MissoesDashboardPage from '@/pages/missoes/MissoesDashboardPage'
import RelatorioMissionarioPage from '@/pages/missoes/RelatorioMissionarioPage'
import MeuPainelMissionarioPage from '@/pages/missoes/MeuPainelMissionarioPage'
import InventarioMissionariosPage from '@/pages/missoes/InventarioMissionariosPage'
import DetalheMissionarioPage from '@/pages/missoes/DetalheMissionarioPage'
import FichaCampoPage from '@/pages/missoes/FichaCampoPage'
import MetasKPIsPage from '@/pages/missoes/MetasKPIsPage'
import PlanejadorVisitasPage from '@/pages/missoes/PlanejadorVisitasPage'
import RelatorioCampoPage from '@/pages/missoes/RelatorioCampoPage'
import DiagnosticoPage from '@/pages/missoes/DiagnosticoPage'
import PainelGeralMissionariosPage from '@/pages/missoes/PainelGeralMissionariosPage'
import IBGEPage from '@/pages/IBGEPage'
import MapasPage from '@/pages/MapasPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import RelatoriosPage from '@/pages/RelatoriosPage'
import ConfiguracoesPage from '@/pages/ConfiguracoesPage'
import QualidadeDadosPage from '@/pages/secretaria/QualidadeDadosPage'
// DuplicadosPage removida
import ValidarCartaoPage from '@/pages/ValidarCartaoPage'
import DiretorioIgrejasPage from '@/pages/DiretorioIgrejasPage'
import EBPublicPage from '@/pages/public/EBPublicPage'
import EscolaBiblicaPage from '@/pages/escola-sabatina/EscolaBiblicaPage'
import EBDashboardPage from '@/pages/escola-biblica/EBDashboardPage'
import PortalLoginPage from '@/pages/portal/PortalLoginPage'
import PortalDashboardPage from '@/pages/portal/PortalDashboardPage'
import PortalPerfilPage from '@/pages/portal/PortalPerfilPage'
import PortalForumPage from '@/pages/portal/PortalForumPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      {/* Public routes - no auth required */}
      <Route path="/formulario" element={<CadastroPublicoPage />} />
      <Route path="/validar-cartao" element={<ValidarCartaoPage />} />
      <Route path="/diretorio" element={<DiretorioIgrejasPage />} />
      <Route path="/eb/:classeId" element={<EBPublicPage />} />
      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route path="/portal" element={<PortalDashboardPage />} />
      <Route path="/portal/perfil" element={<PortalPerfilPage />} />
      <Route path="/portal/forum" element={<PortalForumPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="cadastro" element={<CadastroPage />} />
        <Route path="cadastro/dashboard" element={<CadastroDashboardPage />} />

        {/* Missões */}
        <Route path="missoes">
          <Route index element={<MissoesDashboardPage />} />
          <Route path="inventario" element={<InventarioMissionariosPage />} />
          <Route path="missionario/:id" element={<DetalheMissionarioPage />} />
          <Route path="obreiro/:id" element={<FichaCampoPage />} />
          <Route path="relatorio" element={<RelatorioMissionarioPage />} />
          <Route path="meu-painel" element={<MeuPainelMissionarioPage />} />
          <Route path="metas" element={<MetasKPIsPage />} />
          <Route path="planejador-visitas" element={<PlanejadorVisitasPage />} />
          <Route path="relatorio-campo" element={<RelatorioCampoPage />} />
          <Route path="diagnostico" element={<DiagnosticoPage />} />
          <Route path="painel-geral" element={<PainelGeralMissionariosPage />} />
          {/* escola-biblica movida para seção própria */}
        </Route>

        {/* Secretaria & Membros */}
        <Route path="membros" element={<MembrosPage />} />
        <Route path="membros/:id" element={<MembroDetalhePage />} />
        <Route path="membros/cartao" element={<CartaoMembroPage />} />
        <Route path="membros/familias" element={<FamiliasPage />} />
        <Route path="secretaria">
          <Route index element={<SecretariaPage />} />
          <Route path="contagem" element={<ContagemMensalPage />} />
          <Route path="transferencias" element={<TransferenciasPage />} />
          <Route path="aniversariantes" element={<AniversariantesPage />} />
          <Route path="funil" element={<FunilConversaoPage />} />
          <Route path="saude" element={<SaudeMembrosPage />} />
          <Route path="classes-biblicas" element={<ClassesBiblicasPage />} />
          <Route path="qualidade-dados" element={<QualidadeDadosPage />} />
          {/* duplicados removido */}
        </Route>

        {/* Organizacao */}
        <Route path="organizacao">
          <Route path="unioes" element={<UnioesPage />} />
          <Route path="associacoes" element={<AssociacoesPage />} />
          <Route path="igrejas" element={<IgrejasPage />} />
        </Route>

        {/* Financeiro */}
        <Route path="financeiro">
          <Route index element={<FinanceiroPage />} />
          <Route path="lancamentos" element={<LancamentosPage />} />
          <Route path="receita-campo" element={<ReceitaCampoPage />} />
        </Route>

        {/* Escola Bíblica (seção própria) */}
        <Route path="escola-biblica">
          <Route index element={<EBDashboardPage key="painel" />} />
          <Route path="conteudo" element={<EscolaBiblicaPage />} />
          <Route path="professores" element={<EBDashboardPage key="prof" />} />
          <Route path="nps" element={<EBDashboardPage key="nps" />} />
        </Route>

        {/* Escola Sabatina */}
        <Route path="escola-sabatina">
          <Route index element={<ClassesPage />} />
          <Route path="presenca" element={<PresencaPage />} />
        </Route>

        {/* Inteligencia */}
        <Route path="mapas" element={<MapasPage />} />
        <Route path="ibge" element={<IBGEPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />

        {/* Admin */}
        <Route path="configuracoes" element={<ConfiguracoesPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
