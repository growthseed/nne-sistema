import { Link } from 'react-router-dom'
import {
  HiOutlineAcademicCap, HiOutlineBookOpen, HiOutlineUserGroup,
  HiOutlineClipboardCheck, HiOutlineStar,
  HiOutlineArrowRight, HiOutlineGlobe,
} from 'react-icons/hi'

const MODULES = [
  {
    id: 'principios_fe',
    title: 'Princípios de Fé',
    subtitle: '37 Pontos Doutrinários',
    description: 'Estudo completo dos princípios que fundamentam nossa fé.',
    image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&h=400&fit=crop',
    points: 37,
    color: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'crencas_fundamentais',
    title: 'Crenças Fundamentais',
    subtitle: '25 Temas Essenciais',
    description: 'Os temas centrais da fé reformista para crescimento espiritual.',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&h=400&fit=crop',
    points: 25,
    color: 'from-purple-600 to-pink-600',
  },
]

const FEATURES = [
  { icon: HiOutlineBookOpen, title: 'Conteúdo Completo', desc: 'Estude pontos doutrinários com textos, vídeos e referências bíblicas' },
  { icon: HiOutlineClipboardCheck, title: 'Questionários Interativos', desc: 'Responda perguntas e receba gabarito instantâneo com explicações' },
  { icon: HiOutlineUserGroup, title: 'Turmas Online', desc: 'Participe de turmas com professor, chamada e acompanhamento' },
  { icon: HiOutlineStar, title: 'Compromissos de Fé', desc: 'Registre seus compromissos a cada ponto doutrinário estudado' },
  { icon: HiOutlineBookOpen, title: 'Certificado Digital', desc: 'Receba seu certificado ao concluir cada módulo de estudo' },
  { icon: HiOutlineGlobe, title: 'Acesso de Qualquer Lugar', desc: 'Estude pelo celular, tablet ou computador a qualquer hora' },
]

const TESTIMONIALS = [
  { name: 'Maria S.', text: 'Os questionários me ajudaram a fixar os pontos doutrinários de uma forma que nunca consegui só lendo.', role: 'Aluna - PF' },
  { name: 'João P.', text: 'A praticidade de estudar pelo celular no meu tempo fez toda a diferença na minha preparação.', role: 'Aluno - CF' },
  { name: 'Pastor Carlos', text: 'Consigo acompanhar o progresso de cada aluno e saber exatamente quem precisa de mais atenção.', role: 'Professor' },
]

export default function PortalLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <HiOutlineAcademicCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">Escola Bíblica</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/portal/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5">
              Entrar
            </Link>
            <Link to="/portal/login" className="text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-xl transition-colors">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-700 via-green-600 to-emerald-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTR2LTJoNHptMC0zMHYyaC00VjRoNHpNNiAzNHYySDJ2LTJoNHptMC0zMHYySDJWNGg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-white/5" />

        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur text-white text-xs font-medium px-3 py-1 rounded-full mb-6">
                <HiOutlineBookOpen className="w-3.5 h-3.5" />
                Plataforma de Estudos Bíblicos
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Estude a Palavra de Deus de forma <span className="text-green-200">interativa</span>
              </h1>
              <p className="text-green-100 mt-4 text-base sm:text-lg leading-relaxed max-w-xl">
                Acesse os módulos de Princípios de Fé e Crenças Fundamentais com questionários
                interativos, acompanhamento do professor e certificado de conclusão.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link to="/portal/login"
                  className="inline-flex items-center justify-center gap-2 bg-white text-green-700 font-semibold px-6 py-3.5 rounded-xl hover:bg-green-50 transition-colors shadow-lg text-sm">
                  Começar a estudar
                  <HiOutlineArrowRight className="w-4 h-4" />
                </Link>
                <a href="#modulos"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white font-medium px-6 py-3.5 rounded-xl hover:bg-white/20 transition-colors text-sm">
                  Ver módulos
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 text-green-100 text-sm">
                <span className="flex items-center gap-1.5"><HiOutlineBookOpen className="w-4 h-4" /> 62 pontos</span>
                <span className="flex items-center gap-1.5"><HiOutlineClipboardCheck className="w-4 h-4" /> 428 perguntas</span>
                <span className="flex items-center gap-1.5"><HiOutlineUserGroup className="w-4 h-4" /> 100% gratuito</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&h=500&fit=crop"
                alt="Estudo bíblico"
                className="rounded-2xl shadow-2xl shadow-black/20 rotate-2 hover:rotate-0 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Módulos de Estudo</h2>
            <p className="text-gray-500 mt-2 max-w-lg mx-auto">Escolha o módulo que deseja estudar e comece sua jornada de conhecimento bíblico</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MODULES.map(m => (
              <div key={m.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 group">
                <div className="relative h-52 overflow-hidden">
                  <img src={m.image} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5">
                    <span className={`inline-block bg-gradient-to-r ${m.color} text-white text-xs font-medium px-3 py-1 rounded-full mb-2`}>
                      {m.points} pontos
                    </span>
                    <h3 className="text-xl font-bold text-white">{m.title}</h3>
                    <p className="text-white/80 text-sm">{m.subtitle}</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-600 leading-relaxed">{m.description}</p>
                  <Link to="/portal/login"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700">
                    Acessar módulo <HiOutlineArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Tudo que você precisa para estudar</h2>
            <p className="text-gray-500 mt-2">Uma plataforma completa para o seu crescimento espiritual</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">O que dizem nossos alunos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm">
                <p className="text-sm text-gray-600 leading-relaxed italic">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-white/5" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold">Comece sua jornada hoje</h2>
              <p className="text-green-100 mt-3 max-w-md mx-auto text-sm sm:text-base">
                Crie sua conta gratuita e acesse todos os módulos, questionários e turmas da Escola Bíblica.
              </p>
              <Link to="/portal/login"
                className="inline-flex items-center gap-2 bg-white text-green-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-green-50 transition-colors shadow-lg mt-6 text-sm">
                Criar conta gratuita
                <HiOutlineArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <HiOutlineAcademicCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-700">Escola Bíblica NNE</span>
          </div>
          <p className="text-xs text-gray-400">
            Igreja Adventista do Sétimo Dia — Movimento de Reforma
          </p>
          <p className="text-xs text-gray-300 mt-1">
            União Norte Nordeste Brasileira
          </p>
        </div>
      </footer>
    </div>
  )
}
