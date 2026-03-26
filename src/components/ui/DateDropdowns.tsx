/**
 * DateDropdowns — Substitui input type="date" por 3 dropdowns (Dia, Mês, Ano)
 * Valor: string no formato YYYY-MM-DD (compatível com Supabase/PostgreSQL)
 */

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface DateDropdownsProps {
  value: string | null | undefined
  onChange: (value: string) => void
  className?: string
  yearRange?: number // quantos anos para trás (default 100)
  futureYears?: number // quantos anos para frente (default 2)
  label?: string
  disabled?: boolean
}

export default function DateDropdowns({
  value, onChange, className = '', yearRange = 100, futureYears = 2, label, disabled,
}: DateDropdownsProps) {
  const parts = (value || '').split('-')
  const yyyy = parts[0] || ''
  const mm = parts[1] || ''
  const dd = parts[2] || ''

  const anoAtual = new Date().getFullYear()

  function setDate(d: string, m: string, y: string) {
    if (d && m && y) {
      onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    }
  }

  const selectClass = `border border-gray-200 rounded-xl px-2 sm:px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`

  return (
    <div className={className}>
      {label && <label className="text-xs font-medium text-gray-600 mb-1.5 block">{label}</label>}
      <div className="flex gap-2">
        <select value={dd} onChange={e => setDate(e.target.value, mm, yyyy)} disabled={disabled}
          className={`flex-1 ${selectClass}`}>
          <option value="">Dia</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
          ))}
        </select>
        <select value={mm} onChange={e => setDate(dd, e.target.value, yyyy)} disabled={disabled}
          className={`flex-1 ${selectClass}`}>
          <option value="">Mês</option>
          {MESES.map((m, i) => (
            <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>
        <select value={yyyy} onChange={e => setDate(dd, mm, e.target.value)} disabled={disabled}
          className={`flex-1 ${selectClass}`}>
          <option value="">Ano</option>
          {Array.from({ length: yearRange + futureYears }, (_, i) => anoAtual + futureYears - i).map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
