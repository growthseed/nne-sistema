import { useFormContext } from 'react-hook-form'
import { useState } from 'react'

export default function Step11Observacoes() {
  const { register, setValue } = useFormContext()
  const [preview, setPreview] = useState<string | null>(null)

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setValue('foto', file)
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="label-field">Observações</label>
        <textarea
          {...register('observacoes')}
          className="input-field min-h-[120px] resize-y"
          placeholder="Informações adicionais, necessidades especiais, etc."
        />
      </div>

      <div>
        <label className="label-field">Foto do Membro</label>
        <div className="flex items-center gap-4">
          {preview && (
            <img src={preview} alt="Preview" className="w-20 h-20 rounded-lg object-cover border" />
          )}
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {preview ? 'Trocar Foto' : 'Selecionar Foto'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFoto}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-1">Formatos: JPG, PNG. Tamanho máximo: 5MB</p>
      </div>
    </div>
  )
}
