import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { STATUS_COLORS } from '@/lib/missoes-constants'
import { useCargoLabels, useStatusLabels } from '@/hooks/useCargoLabels'
import type { CargoMinisterial, StatusMissionario } from '@/types'
import TermoCompromissoDisplay from '@/components/missoes/TermoCompromissoDisplay'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  FiArrowLeft,
  FiPrinter,
  FiDownload,
  FiUsers,
  FiDollarSign,
  FiTrendingUp,
  FiMapPin,
} from 'react-icons/fi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

// ── Types ──────────────────────────────────────────────────

interface CampoIgreja {
  igreja_id: string
  funcao: string
  principal: boolean
  igreja_nome: string
  cidade: string | null
  estado: string | null
  endereco: string | null
  endereco_bairro: string | null
  endereco_cep: string | null
  telefone: string | null
  total_membros: number
  total_interessados: number
  dizimos: number
  ofertas: number
  total_arrecadado: number
}

interface DadosFicha {
  missionario: {
    id: string
    nome: string
    cargo_ministerial: CargoMinisterial
    status: StatusMissionario
    foto_url?: string
    data_nascimento?: string
    data_ordenacao?: string
    data_admissao?: string
    telefone_ministerial?: string
    formacao_teologica?: string
    celular?: string
    email_pessoal?: string
    endereco_cidade?: string
    endereco_uf?: string
    associacao_nome: string
    associacao_sigla: string
  }
  campo: CampoIgreja[]
  financeiro: {
    dizimos: number
    ofertas: number
    total: number
  }
  membros: {
    total: number
    interessados: number
    batismos_ano: number
    classes_ativas: number
    alunos_classe: number
  }
  historico: {
    mes: number
    ano: number
    total_membros: number
    total_dizimos: number
    total_batismos: number
  }[]
}

// ── Component ──────────────────────────────────────────────

export default function FichaCampoPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { labels: CARGO_LABELS } = useCargoLabels()
  const { labels: STATUS_LABELS } = useStatusLabels()
  const fichaRef = useRef<HTMLDivElement>(null)
  const [dados, setDados] = useState<DadosFicha | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && profile) carregarFicha(id)
  }, [id, profile])

  async function carregarFicha(missionarioId: string) {
    setLoading(true)
    try {
      // 1. Missionary + association
      const { data: miss, error: e1 } = await supabase
        .from('missionarios')
        .select('*, usuario:usuarios(nome), associacao:associacoes(nome, sigla)')
        .eq('id', missionarioId)
        .single()
      if (e1) throw e1

      const usuario = miss.usuario as any
      const assoc = miss.associacao as any
      const nome = miss.nome || usuario?.nome || 'Sem nome'

      // 2. Get churches from igrejas_responsavel array
      const anoAtual = new Date().getFullYear()
      const igrejaIds: string[] = miss.igrejas_responsavel || []
      const campo: CampoIgreja[] = []

      if (igrejaIds.length > 0) {
        const { data: igrejas } = await supabase
          .from('igrejas')
          .select('id, nome, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, telefone, membros_ativos, interessados')
          .in('id', igrejaIds)

        // Also try junction table for function info
        const { data: vinculos } = await supabase
          .from('missionario_igrejas')
          .select('igreja_id, funcao, principal')
          .eq('missionario_id', missionarioId)

        const vinculoMap = new Map((vinculos || []).map(v => [v.igreja_id, v]))

        // Get member counts and financial data per church
        for (const ig of igrejas || []) {
          // Use pre-populated counts from igrejas table
          const membrosCount = (ig as any).membros_ativos || 0
          const intCount = (ig as any).interessados || 0

          // Financial data per church (current year)
          let igDizimos = 0
          let igOfertas = 0
          const { data: igFins } = await supabase
            .from('dados_financeiros')
            .select('receita_dizimos, receita_oferta_regular, receita_oferta_especial, receita_oferta_missoes, receita_primicia')
            .eq('igreja_id', ig.id)
            .eq('ano', anoAtual)
          for (const f of igFins || []) {
            igDizimos += f.receita_dizimos || 0
            igOfertas += (f.receita_oferta_regular || 0) + (f.receita_oferta_especial || 0) + (f.receita_oferta_missoes || 0) + (f.receita_primicia || 0)
          }

          const vinculo = vinculoMap.get(ig.id)
          const endRua = [ig.endereco_rua, ig.endereco_numero].filter(Boolean).join(', ')
          campo.push({
            igreja_id: ig.id,
            funcao: vinculo?.funcao || 'Pastor',
            principal: vinculo?.principal || false,
            igreja_nome: ig.nome,
            cidade: ig.endereco_cidade,
            estado: ig.endereco_estado,
            endereco: endRua || null,
            endereco_bairro: ig.endereco_bairro,
            endereco_cep: ig.endereco_cep,
            telefone: ig.telefone,
            total_membros: membrosCount || 0,
            total_interessados: intCount || 0,
            dizimos: igDizimos,
            ofertas: igOfertas,
            total_arrecadado: igDizimos + igOfertas,
          })
        }
      }

      // 3. Financial data for this missionary's churches (current year) - aggregate
      let dizimos = 0
      let ofertas = 0
      if (igrejaIds.length > 0) {
        const { data: fins } = await supabase
          .from('dados_financeiros')
          .select('receita_dizimos, receita_oferta_regular, receita_oferta_especial')
          .in('igreja_id', igrejaIds)
          .eq('ano', anoAtual)
        for (const f of fins || []) {
          dizimos += f.receita_dizimos || 0
          ofertas += (f.receita_oferta_regular || 0) + (f.receita_oferta_especial || 0)
        }
      }

      // 4. Member aggregate stats
      const totalMembros = campo.reduce((s, c) => s + c.total_membros, 0)
      const totalInteressados = campo.reduce((s, c) => s + c.total_interessados, 0)

      // Baptismal classes
      let classesAtivas = 0
      let alunosClasse = 0
      if (igrejaIds.length > 0) {
        const { data: classes } = await supabase
          .from('classes_batismais')
          .select('alunos')
          .in('igreja_id', igrejaIds)
          .eq('status', 'ativa')
        for (const c of classes || []) {
          classesAtivas += 1
          alunosClasse += (c.alunos as string[])?.length || 0
        }
      }

      // Baptisms this year from contagem_mensal
      let batismosAno = 0
      if (igrejaIds.length > 0) {
        const { data: contagens } = await supabase
          .from('contagem_mensal')
          .select('batismos')
          .in('igreja_id', igrejaIds)
          .eq('ano', anoAtual)
        for (const c of contagens || []) {
          batismosAno += c.batismos || 0
        }
      }

      // 5. Historical snapshots (if any)
      const { data: snapshots } = await supabase
        .from('missionario_snapshots')
        .select('mes, ano, total_membros, total_dizimos, total_batismos')
        .eq('missionario_id', missionarioId)
        .order('ano', { ascending: true })
        .order('mes', { ascending: true })
        .limit(12)

      setDados({
        missionario: {
          id: miss.id,
          nome,
          cargo_ministerial: miss.cargo_ministerial,
          status: miss.status,
          foto_url: miss.foto_url,
          data_nascimento: miss.data_nascimento,
          data_ordenacao: miss.data_ordenacao,
          data_admissao: miss.data_admissao,
          telefone_ministerial: miss.telefone_ministerial,
          formacao_teologica: miss.formacao_teologica,
          celular: miss.celular,
          email_pessoal: miss.email_pessoal,
          endereco_cidade: miss.endereco_cidade,
          endereco_uf: miss.endereco_uf,
          associacao_nome: assoc?.nome || 'Sem Associacao',
          associacao_sigla: assoc?.sigla || '',
        },
        campo,
        financeiro: { dizimos, ofertas, total: dizimos + ofertas },
        membros: {
          total: totalMembros,
          interessados: totalInteressados,
          batismos_ano: batismosAno,
          classes_ativas: classesAtivas,
          alunos_classe: alunosClasse,
        },
        historico: snapshots || [],
      })
    } catch (err) {
      console.error('Erro ao carregar ficha:', err)
    } finally {
      setLoading(false)
    }
  }

  async function gerarPDF() {
    if (!fichaRef.current) return

    // Scroll to top to avoid html2canvas viewport issues
    window.scrollTo(0, 0)

    // Wait a moment for scroll and any rendering to settle
    await new Promise(resolve => setTimeout(resolve, 300))

    const element = fichaRef.current
    const elementHeight = element.scrollHeight
    const elementWidth = element.scrollWidth

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollY: 0,
      scrollX: 0,
      windowWidth: elementWidth,
      windowHeight: elementHeight,
      height: elementHeight,
      width: elementWidth,
      // Ensure the entire element is captured regardless of viewport
      onclone: (clonedDoc: Document) => {
        const clonedEl = clonedDoc.querySelector('[data-ficha-ref]') as HTMLElement
        if (clonedEl) {
          clonedEl.style.overflow = 'visible'
          clonedEl.style.height = 'auto'
        }
        // Force all images to be visible in the clone
        const images = clonedDoc.querySelectorAll('img')
        images.forEach(img => {
          img.style.display = 'inline-block'
          img.crossOrigin = 'anonymous'
        })
        // Ensure hidden fallback divs are properly handled
        const hiddenDivs = clonedDoc.querySelectorAll('.hidden')
        hiddenDivs.forEach(div => {
          // Keep hidden elements hidden
          ;(div as HTMLElement).style.display = 'none'
        })
      }
    })

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfPageHeight = pdf.internal.pageSize.getHeight()
    const margin = 5 // mm margin

    const usableWidth = pdfWidth - margin * 2
    const imgTotalHeight = (canvas.height * usableWidth) / canvas.width

    if (imgTotalHeight <= pdfPageHeight - margin * 2) {
      // Content fits on a single page
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        margin,
        margin,
        usableWidth,
        imgTotalHeight
      )
    } else {
      // Multi-page: slice the canvas into page-sized chunks
      const usablePageHeight = pdfPageHeight - margin * 2
      // How many canvas pixels correspond to one PDF page height
      const pixelsPerPage = (usablePageHeight / usableWidth) * canvas.width
      let yOffset = 0
      let pageNum = 0

      while (yOffset < canvas.height) {
        if (pageNum > 0) pdf.addPage()

        const sliceH = Math.min(canvas.height - yOffset, pixelsPerPage)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = sliceH

        const ctx = sliceCanvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(
          canvas,
          0, yOffset,              // source x, y
          canvas.width, sliceH,    // source width, height
          0, 0,                    // dest x, y
          canvas.width, sliceH     // dest width, height
        )

        const sliceImgHeight = (sliceH * usableWidth) / canvas.width
        pdf.addImage(
          sliceCanvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          margin,
          margin,
          usableWidth,
          sliceImgHeight
        )

        yOffset += sliceH
        pageNum++
      }
    }

    const safeName = dados?.missionario.nome.replace(/\s+/g, '-') || 'obreiro'
    pdf.save(`ficha-campo-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">Carregando ficha de campo...</span>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="text-center py-20">
        <FiUsers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Obreiro nao encontrado</p>
        <Link to="/missoes/inventario" className="text-green-600 hover:underline text-sm mt-2 inline-block">
          Voltar ao Inventario
        </Link>
      </div>
    )
  }

  const { missionario: m, campo, financeiro, membros, historico } = dados
  const totalMembros = campo.reduce((s, c) => s + c.total_membros, 0)

  const idade = m.data_nascimento
    ? Math.floor((Date.now() - new Date(m.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  // Chart data
  const mesesLabels = historico.map(h => `${h.mes}/${h.ano}`)
  const dadosMembros = historico.map(h => h.total_membros)
  const dadosDizimos = historico.map(h => Number(h.total_dizimos))
  const dadosBatismos = historico.map(h => h.total_batismos)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/missoes/inventario"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm"
        >
          <FiArrowLeft size={16} /> Voltar a Ficha de Campo
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <FiPrinter size={16} /> Imprimir
          </button>
          <button
            onClick={gerarPDF}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <FiDownload size={16} /> Baixar PDF
          </button>
        </div>
      </div>

      {/* === FICHA COMPLETA (captured by html2canvas) === */}
      <div ref={fichaRef} data-ficha-ref className="bg-white rounded-xl border p-8 space-y-8 print:p-4 print:border-0">

        {/* === HEADER UNINORTE === */}
        <div className="border-b-2 pb-6" style={{ borderColor: '#006D43' }}>
          {/* Institutional header */}
          <div className="text-center mb-4">
            <img
              src="/img/logo-nne.png"
              alt="Logo NNE"
              className="mx-auto mb-2 h-16 w-auto object-contain"
              onError={(e) => {
                // Fallback to circle with text if logo not found
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <div className="hidden inline-flex items-center justify-center w-14 h-14 rounded-full mb-2" style={{ backgroundColor: '#006D43' }}>
              <span className="text-white font-bold text-xl">NNE</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#006D43' }}>
              Igreja Adventista do Sétimo Dia — Movimento de Reforma
            </p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">União Norte Nordeste Brasileira</p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex-1 max-w-[80px] h-[2px]" style={{ backgroundColor: '#006D43' }} />
              <p className="text-base font-bold tracking-wide" style={{ color: '#006D43' }}>
                FICHA DE CAMPO DO OBREIRO
              </p>
              <div className="flex-1 max-w-[80px] h-[2px]" style={{ backgroundColor: '#006D43' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Quadriênio {new Date().getFullYear()} — {new Date().getFullYear() + 3}
            </p>
          </div>

          {/* Missionary info with photo */}
          <div className="flex items-start gap-5 mt-4">
            {/* Missionary photo */}
            <div className="shrink-0">
              {m.foto_url ? (
                <img
                  src={m.foto_url}
                  alt={m.nome}
                  className="w-24 h-24 rounded-full object-cover border-4 border-green-100 shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-green-100 shadow-sm" style={{ backgroundColor: '#006D43' }}>
                  <span className="text-2xl font-bold text-white">
                    {m.nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')}
                  </span>
                </div>
              )}
            </div>

            {/* Name and details */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{m.nome}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  {CARGO_LABELS[m.cargo_ministerial] || m.cargo_ministerial}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {m.associacao_nome} {m.associacao_sigla && `(${m.associacao_sigla})`}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[m.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[m.status] || m.status}
                </span>
              </div>
              {(m.endereco_cidade || m.celular || m.email_pessoal) && (
                <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                  {m.endereco_cidade && <p>Residencia: {m.endereco_cidade}{m.endereco_uf ? ` - ${m.endereco_uf}` : ''}</p>}
                  {m.celular && <p>Celular: {m.celular}</p>}
                  {m.email_pessoal && <p>Email: {m.email_pessoal}</p>}
                </div>
              )}
            </div>

            {/* Emission info */}
            <div className="text-right text-sm text-gray-400 shrink-0 ml-4">
              <p>Emitida em {new Date().toLocaleDateString('pt-BR')}</p>
              {idade && <p>Idade: {idade} anos</p>}
              {m.data_ordenacao && (
                <p>Ordenacao: {new Date(m.data_ordenacao).toLocaleDateString('pt-BR')}</p>
              )}
              {m.data_admissao && (
                <p>Admissao: {new Date(m.data_admissao).toLocaleDateString('pt-BR')}</p>
              )}
              {m.formacao_teologica && <p>Formacao: {m.formacao_teologica}</p>}
            </div>
          </div>
        </div>

        {/* === SECTION B: CAMPO TERRITORIAL === */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiMapPin className="text-green-600" size={18} /> Campo Territorial
          </h2>
          {campo.length === 0 ? (
            <p className="text-gray-400 text-sm italic">Nenhuma igreja vinculada a este obreiro.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead style={{ backgroundColor: '#006D43' }}>
                  <tr>
                    <th className="text-left px-3 py-2.5 text-white font-medium">#</th>
                    <th className="text-left px-3 py-2.5 text-white font-medium">Igreja / Campo</th>
                    <th className="text-left px-3 py-2.5 text-white font-medium">Cidade/UF</th>
                    <th className="text-left px-3 py-2.5 text-white font-medium">Endereco</th>
                    <th className="text-left px-3 py-2.5 text-white font-medium">Funcao</th>
                    <th className="text-right px-3 py-2.5 text-white font-medium">Membros</th>
                    <th className="text-right px-3 py-2.5 text-white font-medium">Interess.</th>
                    <th className="text-right px-3 py-2.5 text-white font-medium">Dizimos</th>
                    <th className="text-right px-3 py-2.5 text-white font-medium">Ofertas</th>
                    <th className="text-right px-3 py-2.5 text-white font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campo.map((c, i) => {
                    const endParts = [c.endereco, c.endereco_bairro].filter(Boolean)
                    const endStr = endParts.length > 0
                      ? endParts.join(', ') + (c.endereco_cep ? ` - ${c.endereco_cep}` : '')
                      : '—'
                    return (
                      <tr key={c.igreja_id} className={c.principal ? 'bg-green-50/50' : ''}>
                        <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">
                          {c.igreja_nome}
                          {c.principal && <span className="ml-1 text-xs text-green-600">(Sede)</span>}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {c.cidade || '—'}{c.estado ? `/${c.estado}` : ''}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 max-w-[180px] truncate" title={endStr}>
                          {endStr}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{c.funcao}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{c.total_membros}</td>
                        <td className="px-3 py-2.5 text-right text-blue-600">{c.total_interessados}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {c.dizimos > 0 ? c.dizimos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {c.ofertas > 0 ? c.ofertas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                          {c.total_arrecadado > 0 ? c.total_arrecadado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-300" style={{ backgroundColor: '#f0fdf4' }}>
                  <tr>
                    <td colSpan={5} className="px-3 py-3 font-bold text-gray-700">
                      Total do Campo ({campo.length} {campo.length === 1 ? 'igreja' : 'igrejas'}):
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-lg text-green-700">{totalMembros}</td>
                    <td className="px-3 py-3 text-right font-bold text-blue-700">
                      {campo.reduce((s, c) => s + c.total_interessados, 0)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-gray-800">
                      {campo.reduce((s, c) => s + c.dizimos, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-gray-800">
                      {campo.reduce((s, c) => s + c.ofertas, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-lg text-emerald-700">
                      {campo.reduce((s, c) => s + c.total_arrecadado, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* === SECTION C: CONSOLIDADO FINANCEIRO === */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiDollarSign className="text-emerald-600" size={18} /> Consolidado Financeiro
            <span className="text-sm font-normal text-gray-400 ml-2">Ano {new Date().getFullYear()}</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Dizimos', valor: financeiro.dizimos, cor: 'green' },
              { label: 'Ofertas', valor: financeiro.ofertas, cor: 'blue' },
              { label: 'Total Arrecadado', valor: financeiro.total, cor: 'emerald' },
            ].map(item => (
              <div key={item.label} className="border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* === SECTION D: DADOS ECLESIASTICOS === */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiUsers className="text-blue-600" size={18} /> Dados dos Membros da Regiao
          </h2>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Membros Ativos', valor: membros.total },
              { label: 'Interessados', valor: membros.interessados },
              { label: 'Candidatos (Classe)', valor: membros.alunos_classe },
              { label: 'Batismos no Ano', valor: membros.batismos_ano },
              { label: 'Classes Ativas', valor: membros.classes_ativas },
            ].map(item => (
              <div key={item.label} className="border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{item.valor}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* === SECTION E: EVOLUTION CHARTS === */}
        {historico.length > 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-purple-600" size={18} /> Evolucao do Campo
              <span className="text-sm font-normal text-gray-400 ml-2">
                Ultimos {historico.length} meses
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-xl p-4">
                <p className="text-sm font-medium text-gray-600 mb-3">Evolucao de Membros</p>
                <Line
                  data={{
                    labels: mesesLabels,
                    datasets: [{
                      label: 'Membros',
                      data: dadosMembros,
                      borderColor: '#006D43',
                      backgroundColor: 'rgba(0,109,67,0.1)',
                      fill: true,
                      tension: 0.4,
                    }],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: false } },
                  }}
                />
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-sm font-medium text-gray-600 mb-3">Evolucao de Dizimos (R$)</p>
                <Bar
                  data={{
                    labels: mesesLabels,
                    datasets: [{
                      label: 'Dizimos',
                      data: dadosDizimos,
                      backgroundColor: 'rgba(16,185,129,0.7)',
                      borderColor: '#10b981',
                      borderWidth: 1,
                    }],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </div>
              <div className="border rounded-xl p-4 col-span-2">
                <p className="text-sm font-medium text-gray-600 mb-3">Batismos por Mes</p>
                <Bar
                  data={{
                    labels: mesesLabels,
                    datasets: [{
                      label: 'Batismos',
                      data: dadosBatismos,
                      backgroundColor: 'rgba(139,92,246,0.7)',
                      borderColor: '#8b5cf6',
                      borderWidth: 1,
                    }],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {historico.length <= 1 && (
          <div className="border border-dashed rounded-xl p-8 text-center text-gray-400">
            <FiTrendingUp size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Historico em construcao</p>
            <p className="text-sm mt-1">
              Os graficos de evolucao aparecerao conforme os dados mensais forem registrados no sistema.
            </p>
          </div>
        )}

        {/* === TERMO DE COMPROMISSO MISSIONÁRIO (dinâmico do banco) === */}
        <div className="mt-10 pt-6 border-t">
          <TermoCompromissoDisplay missionarioNome={m.nome} />
        </div>

        {/* === LOCAL E DATA === */}
        <div className="mt-8">
          <div className="flex items-end gap-2">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Local e Data:</span>
            <span className="flex-1 border-b-2 border-gray-300 min-h-[24px]">&nbsp;</span>
            <span className="text-sm text-gray-400 whitespace-nowrap">,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>

        {/* === SIGNATURE FOOTER (for print/PDF) === */}
        <div className="mt-10 pt-4">
          <div className="grid grid-cols-2 gap-12">
            {/* Assinatura do Missionário */}
            <div className="text-center">
              <div className="mt-20 mb-1 mx-8 border-t-2 border-gray-500" />
              <p className="font-bold text-gray-900 text-sm">{m.nome}</p>
              <p className="text-xs text-gray-500">
                {CARGO_LABELS[m.cargo_ministerial] || m.cargo_ministerial}
              </p>
              <p className="text-xs text-gray-400">{m.associacao_nome} ({m.associacao_sigla})</p>
            </div>
            {/* Assinatura do Representante da União */}
            <div className="text-center">
              <div className="mt-20 mb-1 mx-8 border-t-2 border-gray-500" />
              <p className="font-bold text-gray-900 text-sm">Representante da União</p>
              <p className="text-xs text-gray-500">União Norte Nordeste Brasileira</p>
              <p className="text-xs text-gray-400">IASD — Movimento de Reforma</p>
            </div>
          </div>

          {/* Segunda linha de assinaturas */}
          <div className="grid grid-cols-2 gap-12 mt-6">
            {/* Assinatura do Presidente da Associação */}
            <div className="text-center">
              <div className="mt-16 mb-1 mx-8 border-t-2 border-gray-500" />
              <p className="font-bold text-gray-900 text-sm">Presidente da {m.associacao_sigla || 'Associação'}</p>
              <p className="text-xs text-gray-500">{m.associacao_nome}</p>
            </div>
            {/* Assinatura do Secretário da Associação */}
            <div className="text-center">
              <div className="mt-16 mb-1 mx-8 border-t-2 border-gray-500" />
              <p className="font-bold text-gray-900 text-sm">Secretário da {m.associacao_sigla || 'Associação'}</p>
              <p className="text-xs text-gray-500">{m.associacao_nome}</p>
            </div>
          </div>

          {/* Rodapé institucional */}
          <div className="mt-10 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div>
                <p className="font-medium text-gray-500">Igreja Adventista do Sétimo Dia — Movimento de Reforma</p>
                <p>União Norte Nordeste Brasileira · NNE Sistema</p>
              </div>
              <div className="text-right">
                <p>Documento emitido em{' '}
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p>Quadriênio {new Date().getFullYear()} — {new Date().getFullYear() + 3}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
