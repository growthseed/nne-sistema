import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import CadastroPage from '@/pages/cadastro/CadastroPage'
import CadastroPublicoPage from '@/pages/cadastro/CadastroPublicoPage'
import CadastroDashboardPage from '@/pages/cadastro/CadastroDashboardPage'
import MembrosPage from '@/pages/membros/MembrosPage'
import CartaoMembroPage from '@/pages/membros/CartaoMembroPage'
import FamiliasPage from '@/pages/membros/FamiliasPage'
import SecretariaPage from '@/pages/secretaria/SecretariaPage'
import ContagemMensalPage from '@/pages/secretaria/ContagemMensalPage'
import TransferenciasPage from '@/pages/secretaria/TransferenciasPage'
import UnioesPage from '@/pages/organizacao/UnioesPage'
import AssociacoesPage from '@/pages/organizacao/AssociacoesPage'
import IgrejasPage from '@/pages/organizacao/IgrejasPage'
import FinanceiroPage from '@/pages/financeiro/FinanceiroPage'
import LancamentosPage from '@/pages/financeiro/LancamentosPage'
import ReceitaCampoPage from '@/pages/financeiro/ReceitaCampoPage'
import ClassesPage from '@/pages/escola-sabatina/ClassesPage'
import ClassesBatismaisPage from '@/pages/escola-sabatina/ClassesBatismaisPage'
import PresencaPage from '@/pages/escola-sabatina/PresencaPage'
import MissoesDashboardPage from '@/pages/missoes/MissoesDashboardPage'
import RelatorioMissionarioPage from '@/pages/missoes/RelatorioMissionarioPage'
import MeuPainelMissionarioPage from '@/pages/missoes/MeuPainelMissionarioPage'
import InventarioMissionariosPage from '@/pages/missoes/InventarioMissionariosPage'
import DetalheMissionarioPage from '@/pages/missoes/DetalheMissionarioPage'
import MetasKPIsPage from '@/pages/missoes/MetasKPIsPage'
import PlanejadorVisitasPage from '@/pages/missoes/PlanejadorVisitasPage'
import RelatorioCampoPage from '@/pages/missoes/RelatorioCampoPage'
import DiagnosticoPage from '@/pages/missoes/DiagnosticoPage'
import IBGEPage from '@/pages/IBGEPage'
import MapasPage from '@/pages/MapasPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import RelatoriosPage from '@/pages/RelatoriosPage'
import ConfiguracoesPage from '@/pages/ConfiguracoesPage'
import ValidarCartaoPage from '@/pages/ValidarCartaoPage'
import DiretorioIgrejasPage from '@/pages/DiretorioIgrejasPage'

export default function App() {
  return (
    <Routes>
      {/* Public routes - no auth required */}
      <Route path="/formulario" element={<CadastroPublicoPage />} />
      <Route path="/validar-cartao" element={<ValidarCartaoPage />} />
      <Route path="/diretorio" element={<DiretorioIgrejasPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="cadastro" element={<CadastroPage />} />
        <Route path="cadastro/dashboard" element={<CadastroDashboardPage />} />
        <Route path="membros" element={<MembrosPage />} />
        <Route path="membros/cartao" element={<CartaoMembroPage />} />
        <Route path="membros/familias" element={<FamiliasPage />} />
        <Route path="secretaria">
          <Route index element={<SecretariaPage />} />
          <Route path="contagem" element={<ContagemMensalPage />} />
          <Route path="transferencias" element={<TransferenciasPage />} />
        </Route>
        <Route path="organizacao">
          <Route path="unioes" element={<UnioesPage />} />
          <Route path="associacoes" element={<AssociacoesPage />} />
          <Route path="igrejas" element={<IgrejasPage />} />
        </Route>
        <Route path="financeiro">
          <Route index element={<FinanceiroPage />} />
          <Route path="lancamentos" element={<LancamentosPage />} />
          <Route path="receita-campo" element={<ReceitaCampoPage />} />
        </Route>
        <Route path="escola-sabatina">
          <Route index element={<ClassesPage />} />
          <Route path="batismais" element={<ClassesBatismaisPage />} />
          <Route path="presenca" element={<PresencaPage />} />
        </Route>
        <Route path="missoes">
          <Route index element={<MissoesDashboardPage />} />
          <Route path="relatorio" element={<RelatorioMissionarioPage />} />
          <Route path="meu-painel" element={<MeuPainelMissionarioPage />} />
          <Route path="inventario" element={<InventarioMissionariosPage />} />
          <Route path="missionario/:id" element={<DetalheMissionarioPage />} />
          <Route path="metas" element={<MetasKPIsPage />} />
          <Route path="planejador-visitas" element={<PlanejadorVisitasPage />} />
          <Route path="relatorio-campo" element={<RelatorioCampoPage />} />
          <Route path="diagnostico" element={<DiagnosticoPage />} />
        </Route>
        <Route path="mapas" element={<MapasPage />} />
        <Route path="ibge" element={<IBGEPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
      </Route>
    </Routes>
  )
}
