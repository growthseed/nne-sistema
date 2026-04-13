import { lazy, type ReactElement } from 'react'
import type { RouteObject } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { RequireAccess } from '@/components/auth/RouteGuards'
import type { AccessRuleKey } from '@/lib/access'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const CadastroPage = lazy(() => import('@/pages/cadastro/CadastroPage'))
const CadastroDashboardPage = lazy(() => import('@/pages/cadastro/CadastroDashboardPage'))
const MembrosPage = lazy(() => import('@/pages/membros/MembrosPage'))
const MembroDetalhePage = lazy(() => import('@/pages/membros/MembroDetalhePage'))
const CartaoMembroPage = lazy(() => import('@/pages/membros/CartaoMembroPage'))
const FamiliasPage = lazy(() => import('@/pages/membros/FamiliasPage'))
const SecretariaPage = lazy(() => import('@/pages/secretaria/SecretariaPage'))
const ContagemMensalPage = lazy(() => import('@/pages/secretaria/ContagemMensalPage'))
const TransferenciasPage = lazy(() => import('@/pages/secretaria/TransferenciasPage'))
const AniversariantesPage = lazy(() => import('@/pages/secretaria/AniversariantesPage'))
const FunilConversaoPage = lazy(() => import('@/pages/secretaria/FunilConversaoPage'))
const SaudeMembrosPage = lazy(() => import('@/pages/secretaria/SaudeMembrosPage'))
const ClassesBiblicasPage = lazy(() => import('@/pages/secretaria/ClassesBiblicasPage'))
const SegmentacaoPage = lazy(() => import('@/pages/secretaria/SegmentacaoPage'))
const QualidadeDadosPage = lazy(() => import('@/pages/secretaria/QualidadeDadosPage'))
const UnioesPage = lazy(() => import('@/pages/organizacao/UnioesPage'))
const AssociacoesPage = lazy(() => import('@/pages/organizacao/AssociacoesPage'))
const IgrejasPage = lazy(() => import('@/pages/organizacao/IgrejasPage'))
const FinanceiroPage = lazy(() => import('@/pages/financeiro/FinanceiroPage'))
const LancamentosPage = lazy(() => import('@/pages/financeiro/LancamentosPage'))
const ReceitaCampoPage = lazy(() => import('@/pages/financeiro/ReceitaCampoPage'))
const ClassesPage = lazy(() => import('@/pages/escola-sabatina/ClassesPage'))
const PresencaPage = lazy(() => import('@/pages/escola-sabatina/PresencaPage'))
const MissoesDashboardPage = lazy(() => import('@/pages/missoes/MissoesDashboardPage'))
const RelatorioMissionarioPage = lazy(() => import('@/pages/missoes/RelatorioMissionarioPage'))
const MeuPainelMissionarioPage = lazy(() => import('@/pages/missoes/MeuPainelMissionarioPage'))
const InventarioMissionariosPage = lazy(() => import('@/pages/missoes/InventarioMissionariosPage'))
const DetalheMissionarioPage = lazy(() => import('@/pages/missoes/DetalheMissionarioPage'))
const FichaCampoPage = lazy(() => import('@/pages/missoes/FichaCampoPage'))
const MetasKPIsPage = lazy(() => import('@/pages/missoes/MetasKPIsPage'))
const PlanejadorVisitasPage = lazy(() => import('@/pages/missoes/PlanejadorVisitasPage'))
const RelatorioCampoPage = lazy(() => import('@/pages/missoes/RelatorioCampoPage'))
const DiagnosticoPage = lazy(() => import('@/pages/missoes/DiagnosticoPage'))
const PainelGeralMissionariosPage = lazy(() => import('@/pages/missoes/PainelGeralMissionariosPage'))
const IBGEPage = lazy(() => import('@/pages/IBGEPage'))
const MapasPage = lazy(() => import('@/pages/MapasPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const RelatoriosPage = lazy(() => import('@/pages/RelatoriosPage'))
const ConfiguracoesPage = lazy(() => import('@/pages/ConfiguracoesPage'))
const UsuarioDetalhePage = lazy(() => import('@/pages/admin/UsuarioDetalhePage'))
const EscolaBiblicaPage = lazy(() => import('@/pages/escola-sabatina/EscolaBiblicaPage'))
const EBDashboardPage = lazy(() => import('@/pages/escola-biblica/EBDashboardPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function withAccess(accessKey: AccessRuleKey, element: ReactElement) {
  return <RequireAccess accessKey={accessKey}>{element}</RequireAccess>
}

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: withAccess('dashboard', <Dashboard />) },
      {
        path: 'cadastro',
        element: withAccess('cadastro', <CadastroPage />),
      },
      {
        path: 'cadastro/dashboard',
        element: withAccess('cadastro_dashboard', <CadastroDashboardPage />),
      },
      {
        path: 'missoes',
        children: [
          {
            index: true,
            element: withAccess('missoes', <MissoesDashboardPage />),
          },
          {
            path: 'inventario',
            element: withAccess('missoes_inventario', <InventarioMissionariosPage />),
          },
          {
            path: 'missionario/:id',
            element: withAccess('missoes_detalhe', <DetalheMissionarioPage />),
          },
          {
            path: 'obreiro/:id',
            element: withAccess('missoes_ficha_campo', <FichaCampoPage />),
          },
          {
            path: 'relatorio',
            element: withAccess('missoes_relatorio', <RelatorioMissionarioPage />),
          },
          {
            path: 'meu-painel',
            element: withAccess('missoes_meu_painel', <MeuPainelMissionarioPage />),
          },
          {
            path: 'metas',
            element: withAccess('missoes_metas', <MetasKPIsPage />),
          },
          {
            path: 'planejador-visitas',
            element: withAccess('missoes_planejador', <PlanejadorVisitasPage />),
          },
          {
            path: 'relatorio-campo',
            element: withAccess('missoes_relatorio_campo', <RelatorioCampoPage />),
          },
          {
            path: 'diagnostico',
            element: withAccess('missoes_diagnostico', <DiagnosticoPage />),
          },
          {
            path: 'painel-geral',
            element: withAccess('missoes_painel_geral', <PainelGeralMissionariosPage />),
          },
        ],
      },
      {
        path: 'membros',
        element: withAccess('membros', <MembrosPage />),
      },
      {
        path: 'membros/:id',
        element: withAccess('membro_detalhe', <MembroDetalhePage />),
      },
      {
        path: 'membros/cartao',
        element: withAccess('membro_cartao', <CartaoMembroPage />),
      },
      {
        path: 'membros/familias',
        element: withAccess('familias', <FamiliasPage />),
      },
      {
        path: 'secretaria',
        children: [
          {
            index: true,
            element: withAccess('secretaria', <SecretariaPage />),
          },
          {
            path: 'contagem',
            element: withAccess('secretaria_contagem', <ContagemMensalPage />),
          },
          {
            path: 'transferencias',
            element: withAccess('secretaria_transferencias', <TransferenciasPage />),
          },
          {
            path: 'aniversariantes',
            element: withAccess('secretaria_aniversariantes', <AniversariantesPage />),
          },
          {
            path: 'funil',
            element: withAccess('secretaria_funil', <FunilConversaoPage />),
          },
          {
            path: 'saude',
            element: withAccess('secretaria_saude', <SaudeMembrosPage />),
          },
          {
            path: 'classes-biblicas',
            element: withAccess('secretaria_classes_biblicas', <ClassesBiblicasPage />),
          },
          {
            path: 'segmentacao',
            element: withAccess('secretaria_segmentacao', <SegmentacaoPage />),
          },
          {
            path: 'qualidade-dados',
            element: withAccess('secretaria_qualidade_dados', <QualidadeDadosPage />),
          },
        ],
      },
      {
        path: 'organizacao',
        children: [
          {
            path: 'unioes',
            element: withAccess('organizacao_unioes', <UnioesPage />),
          },
          {
            path: 'associacoes',
            element: withAccess('organizacao_associacoes', <AssociacoesPage />),
          },
          {
            path: 'igrejas',
            element: withAccess('organizacao_igrejas', <IgrejasPage />),
          },
        ],
      },
      {
        path: 'financeiro',
        children: [
          {
            index: true,
            element: withAccess('financeiro', <FinanceiroPage />),
          },
          {
            path: 'lancamentos',
            element: withAccess('financeiro_lancamentos', <LancamentosPage />),
          },
          {
            path: 'receita-campo',
            element: withAccess('financeiro_receita_campo', <ReceitaCampoPage />),
          },
        ],
      },
      {
        path: 'escola-biblica',
        children: [
          {
            index: true,
            element: withAccess('escola_biblica', <EBDashboardPage key="painel" />),
          },
          {
            path: 'conteudo',
            element: withAccess('escola_biblica_conteudo', <EscolaBiblicaPage />),
          },
          {
            path: 'professores',
            element: withAccess('escola_biblica_professores', <EBDashboardPage key="prof" />),
          },
        ],
      },
      {
        path: 'escola-sabatina',
        children: [
          {
            index: true,
            element: withAccess('escola_sabatina', <ClassesPage />),
          },
          {
            path: 'presenca',
            element: withAccess('escola_sabatina_presenca', <PresencaPage />),
          },
        ],
      },
      {
        path: 'mapas',
        element: withAccess('mapas', <MapasPage />),
      },
      {
        path: 'ibge',
        element: withAccess('ibge', <IBGEPage />),
      },
      {
        path: 'relatorios',
        element: withAccess('relatorios', <RelatoriosPage />),
      },
      {
        path: 'analytics',
        element: withAccess('analytics', <AnalyticsPage />),
      },
      {
        path: 'configuracoes',
        element: withAccess('configuracoes', <ConfiguracoesPage />),
      },
      {
        path: 'configuracoes/usuario/:id',
        element: withAccess('configuracoes_usuario', <UsuarioDetalhePage />),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]
