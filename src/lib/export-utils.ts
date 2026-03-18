import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportColumn {
  header: string
  key: string
  width?: number
}

export function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
) {
  const headers = columns.map(c => c.header)
  const rows = data.map(row => columns.map(c => row[c.key] ?? ''))

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Set column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width || 20 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToPDF(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string
) {
  const doc = new jsPDF({ orientation: 'landscape' })

  if (title) {
    doc.setFontSize(16)
    doc.text(title, 14, 15)
    doc.setFontSize(10)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22)
  }

  const head = [columns.map(c => c.header)]
  const body = data.map(row => columns.map(c => String(row[c.key] ?? '')))

  autoTable(doc, {
    head,
    body,
    startY: title ? 28 : 14,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 57, 153], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  })

  doc.save(`${filename}.pdf`)
}

export const MEMBROS_COLUMNS: ExportColumn[] = [
  { header: 'Nome', key: 'nome', width: 30 },
  { header: 'Tipo', key: 'tipo', width: 12 },
  { header: 'Situação', key: 'situacao', width: 12 },
  { header: 'Sexo', key: 'sexo', width: 10 },
  { header: 'Nascimento', key: 'data_nascimento', width: 12 },
  { header: 'Celular', key: 'celular', width: 15 },
  { header: 'Email', key: 'email', width: 25 },
  { header: 'Cidade', key: 'endereco_cidade', width: 18 },
  { header: 'UF', key: 'endereco_estado', width: 5 },
  { header: 'Cargo', key: 'cargo', width: 15 },
  { header: 'Igreja', key: 'igreja_nome', width: 25 },
]
