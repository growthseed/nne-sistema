import { z } from 'zod'

// Step 0: LGPD
export const step0Schema = z.object({
  lgpd_consentimento: z.literal(true, {
    errorMap: () => ({ message: 'Você precisa aceitar os termos para continuar' }),
  }),
})

// Step 1: Dados Pessoais
export const step1Schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  sexo: z.enum(['M', 'F'], { errorMap: () => ({ message: 'Selecione o sexo' }) }),
  estado_civil: z.string().min(1, 'Estado civil é obrigatório'),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  nacionalidade: z.string().min(1, 'Nacionalidade é obrigatória'),
  naturalidade: z.string().min(1, 'Naturalidade é obrigatória'),
})

// Step 2: Contato
export const step2Schema = z.object({
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  celular: z.string().optional(),
})

// Step 3: Endereço
export const step3Schema = z.object({
  cep: z.string().min(8, 'CEP inválido'),
  endereco: z.string().min(1, 'Endereço é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(2, 'Estado é obrigatório'),
})

// Step 4: Profissão / Escolaridade
export const step4Schema = z.object({
  profissao: z.string().min(1, 'Profissão é obrigatória'),
  escolaridade: z.string().min(1, 'Escolaridade é obrigatória'),
})

// Step 5: Dados Eclesiásticos
export const step5Schema = z.object({
  data_batismo: z.string().optional(),
  forma_recepcao: z.string().min(1, 'Forma de recepção é obrigatória'),
  data_recepcao: z.string().min(1, 'Data de recepção é obrigatória'),
  igreja_id: z.string().min(1, 'Igreja é obrigatória'),
})

// Step 6: Família
export const step6Schema = z.object({
  familia_id: z.string().optional(),
  parentesco: z.string().optional(),
  conjuge_nome: z.string().optional(),
})

// Step 7: Cargos e Departamentos
export const step7Schema = z.object({
  cargo: z.string().optional(),
  departamento: z.string().optional(),
})

// Step 8: Observações e Foto (final step)
export const step8Schema = z.object({
  observacoes: z.string().optional(),
  foto: z.any().optional(),
})

export const stepSchemas = [
  step0Schema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  step8Schema,
]

export const stepTitles = [
  'Consentimento LGPD',
  'Dados Pessoais',
  'Contato',
  'Endereço',
  'Profissão',
  'Dados Eclesiásticos',
  'Família',
  'Cargos',
  'Observações e Foto',
]

export type FullFormData = z.infer<typeof step0Schema> &
  z.infer<typeof step1Schema> &
  z.infer<typeof step2Schema> &
  z.infer<typeof step3Schema> &
  z.infer<typeof step4Schema> &
  z.infer<typeof step5Schema> &
  z.infer<typeof step6Schema> &
  z.infer<typeof step7Schema> &
  z.infer<typeof step8Schema>
