import { useFormContext } from 'react-hook-form'

export default function Step0LGPD() {
  const { register, formState: { errors } } = useFormContext()

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-3">
        <p className="font-semibold">Lei Geral de Proteção de Dados (LGPD)</p>
        <p>
          Em conformidade com a Lei nº 13.709/2018 (LGPD), informamos que os dados pessoais
          coletados neste cadastro serão utilizados exclusivamente para fins de gestão
          eclesiástica e administrativa da igreja.
        </p>
        <p>
          Seus dados serão armazenados de forma segura e não serão compartilhados com
          terceiros sem o seu consentimento prévio, exceto quando exigido por lei.
        </p>
        <p>
          Você poderá, a qualquer momento, solicitar acesso, correção ou exclusão dos
          seus dados pessoais junto à secretaria da igreja.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          {...register('lgpd_consentimento')}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">
          Declaro que li e concordo com os termos de uso e política de privacidade
          referentes ao tratamento dos meus dados pessoais.
        </span>
      </label>
      {errors.lgpd_consentimento && (
        <p className="text-sm text-red-600">{errors.lgpd_consentimento.message as string}</p>
      )}
    </div>
  )
}
