import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TermoCompromissoContent } from '@/types'

// Default content (fallback if database is empty)
const DEFAULT_TERMO: TermoCompromissoContent = {
  lema: 'Em busca da Excelência',
  citacao: 'A maior lição que os obreiros têm a aprender é a de sua própria insuficiência e a necessidade de se entregarem inteiramente a Deus. A religião de Cristo não consiste apenas no perdão dos pecados; significa a renovação do coração e a conformação da vida com a vontade de Deus. [...] A fidelidade nas pequenas coisas, o desempenho dos deveres comuns da vida, requerem esforço e determinação tanto quanto as maiores empresas.',
  citacao_ref: 'Ellen G. White, Obreiros Evangélicos, pág. 273.',
  declaracao_intro: 'diante de Deus e da liderança desta União, aceito o solene chamado para servir como missionário durante o quadriênio 2026-2029. Compreendo que o serviço ao Mestre exige esmero, minudência e uma busca constante pela excelência. Inspirado pelo compromisso de nunca me acomodar, assumo como meu lema pessoal: "EU POSSO FAZER MELHOR".',
  declaracao_corpo: 'Pelo presente termo, comprometo-me voluntariamente a pautar meu ministério sob as seguintes diretrizes fundamentais:',
  diretrizes: [
    'Evangelismo Relacional e Cuidado Atencioso: Dedicar-me-ei ao pastoreio individualizado, realizando o envio de mensagens semanais de instrução e encorajamento a todos os membros, interessados e aniversariantes da minha área de atuação, zelando para que cada alma se sinta assistida.',
    'Edificação Coletiva pelo Curso Bíblico: Assumo o compromisso de realizar o Curso Bíblico com toda a igreja, integrando membros e interessados em um estudo profundo e sistemático da verdade presente, fortalecendo a unidade doutrinária.',
    'Classe Bíblica Batismal Efetiva: Manterei a Classe Bíblica Batismal em funcionamento contínuo e ininterrupto, garantindo que seja um ambiente produtivo de preparo espiritual e doutrinário para os novos conversos.',
    'Operosidade e Frutificação (Alvo Batismal): Empenhar-me-ei, sob a guia do Espírito Santo, para que o trabalho resulte em frutos visíveis para o Reino de Deus, realizando no mínimo um batismo por trimestre.',
    'Acompanhamento de Relatórios Estatísticos: Dedicarei tempo para apreciar mensalmente os relatórios estatísticos de secretaria e minhas contas com Deus (MCCD).',
  ],
  declaracao_final: 'Ao assinar este compromisso, declaro minha total submissão às diretrizes da União Norte Nordeste dos Adventistas do Sétimo Dia — Movimento de Reforma, reconhecendo que a fidelidade nos pequenos deveres é o que compõe a grande obra da eternidade.',
}

// Cache to avoid multiple fetches
let cachedTermo: TermoCompromissoContent | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60000 // 1 minute

export function useTermoCompromisso() {
  const [termo, setTermo] = useState<TermoCompromissoContent>(cachedTermo || DEFAULT_TERMO)
  const [loading, setLoading] = useState(!cachedTermo)

  useEffect(() => {
    if (cachedTermo && Date.now() - cacheTimestamp < CACHE_TTL) {
      setTermo(cachedTermo)
      setLoading(false)
      return
    }

    async function fetchTermo() {
      try {
        const { data, error } = await supabase
          .from('documento_templates')
          .select('conteudo')
          .eq('tipo', 'termo_compromisso')
          .eq('ativo', true)
          .single()

        if (!error && data?.conteudo) {
          const parsed = JSON.parse(data.conteudo) as TermoCompromissoContent
          cachedTermo = parsed
          cacheTimestamp = Date.now()
          setTermo(parsed)
        }
      } catch (err) {
        console.warn('Erro ao buscar termo de compromisso, usando padrão:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTermo()
  }, [])

  return { termo, loading }
}

// Invalidate cache (call after saving)
export function invalidateTermoCache() {
  cachedTermo = null
  cacheTimestamp = 0
}

export { DEFAULT_TERMO }

interface TermoCompromissoDisplayProps {
  missionarioNome?: string
  /** If true, render inline styles for PDF (html2canvas) */
  forPdf?: boolean
}

/**
 * Displays the Termo de Compromisso from the database.
 * Supports both online view (Tailwind classes) and PDF view (inline styles).
 */
export default function TermoCompromissoDisplay({ missionarioNome, forPdf = false }: TermoCompromissoDisplayProps) {
  const { termo, loading } = useTermoCompromisso()

  if (loading) {
    return <div className="text-center text-gray-400 py-4">Carregando termo...</div>
  }

  // ── PDF version (inline styles for html2canvas) ──
  if (forPdf) {
    return (
      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #006D43' }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', textAlign: 'center', margin: '0 0 4px 0' }}>
          TERMO DE COMPROMISSO MISSIONÁRIO
        </p>
        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', textAlign: 'center', margin: '0 0 2px 0' }}>
          (QUADRIÊNIO 2026-2029)
        </p>
        <p style={{ fontSize: '10px', color: '#666', textAlign: 'center', margin: '0 0 2px 0' }}>
          União Norte Nordeste dos Adventistas do Sétimo Dia — Movimento de Reforma
        </p>
        <p style={{ fontSize: '11px', fontWeight: 'bold', fontStyle: 'italic', color: '#333', textAlign: 'center', margin: '0 0 12px 0' }}>
          &ldquo;{termo.lema}&rdquo;
        </p>

        {/* Citação */}
        <div style={{ backgroundColor: '#f8f8f8', borderLeft: '3px solid #999', padding: '10px 12px', marginBottom: '12px', borderRadius: '0 4px 4px 0' }}>
          <p style={{ fontSize: '9px', color: '#555', lineHeight: '1.5', fontStyle: 'italic', margin: 0, textAlign: 'justify' }}>
            &ldquo;{termo.citacao}&rdquo;
          </p>
          <p style={{ fontSize: '9px', color: '#777', margin: '4px 0 0 0', textAlign: 'right', fontWeight: 'bold' }}>
            — {termo.citacao_ref}
          </p>
        </div>

        {/* Declaração */}
        <p style={{ fontSize: '10px', color: '#333', lineHeight: '1.6', textAlign: 'justify', margin: '0 0 8px 0' }}>
          Eu, <strong style={{ textDecoration: 'underline' }}>{missionarioNome || '_______________'}</strong>, {termo.declaracao_intro}
        </p>

        <p style={{ fontSize: '10px', color: '#333', lineHeight: '1.6', textAlign: 'justify', margin: '0 0 8px 0' }}>
          {termo.declaracao_corpo}
        </p>

        {/* Diretrizes */}
        <div style={{ margin: '0 0 8px 8px' }}>
          {termo.diretrizes.map((d, i) => (
            <p key={i} style={{ fontSize: '10px', color: '#333', lineHeight: '1.6', textAlign: 'justify', margin: '0 0 6px 0' }}>
              <strong>{i + 1}. {d.split(':')[0]}:</strong>{d.includes(':') ? d.substring(d.indexOf(':') + 1) : ''}
            </p>
          ))}
        </div>

        <p style={{ fontSize: '10px', color: '#333', lineHeight: '1.6', textAlign: 'justify', margin: '0 0 16px 0' }}>
          {termo.declaracao_final}
        </p>
      </div>
    )
  }

  // ── Online version (Tailwind classes) ──
  return (
    <div className="card border-t-4 border-green-600">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">TERMO DE COMPROMISSO MISSIONÁRIO</h3>
        <p className="text-sm font-semibold text-gray-500">(QUADRIÊNIO 2026-2029)</p>
        <p className="text-xs text-gray-400">União Norte Nordeste dos Adventistas do Sétimo Dia — Movimento de Reforma</p>
        <p className="text-sm font-bold italic text-gray-700 mt-1">&ldquo;{termo.lema}&rdquo;</p>
      </div>

      {/* Citação */}
      <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4 rounded-r">
        <p className="text-sm text-gray-600 italic leading-relaxed text-justify">
          &ldquo;{termo.citacao}&rdquo;
        </p>
        <p className="text-xs text-gray-500 mt-2 text-right font-semibold">
          — {termo.citacao_ref}
        </p>
      </div>

      {/* Declaração */}
      <p className="text-sm text-gray-700 leading-relaxed text-justify mb-3">
        Eu, <strong className="underline">{missionarioNome || '_______________'}</strong>, {termo.declaracao_intro}
      </p>

      <p className="text-sm text-gray-700 leading-relaxed text-justify mb-3">
        {termo.declaracao_corpo}
      </p>

      {/* Diretrizes */}
      <div className="space-y-3 mb-4 ml-2">
        {termo.diretrizes.map((d, i) => {
          const colonIdx = d.indexOf(':')
          const title = colonIdx > -1 ? d.substring(0, colonIdx) : d
          const body = colonIdx > -1 ? d.substring(colonIdx + 1) : ''
          return (
            <p key={i} className="text-sm text-gray-700 leading-relaxed text-justify">
              <strong>{i + 1}. {title}:</strong>{body}
            </p>
          )
        })}
      </div>

      <p className="text-sm text-gray-700 leading-relaxed text-justify">
        {termo.declaracao_final}
      </p>
    </div>
  )
}
