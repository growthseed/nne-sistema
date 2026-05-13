import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineSearch, HiOutlineMenu, HiOutlineX, HiOutlineExternalLink,
  HiOutlineChevronDown,
} from 'react-icons/hi'

interface CategoriaNav {
  id: string
  slug: string
  nome: string
  cor: string | null
}

const SITE_UNIAO = 'https://unne.asdmr.org.br'

export default function DownloadsShell() {
  const [categorias, setCategorias] = useState<CategoriaNav[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [catMenuOpen, setCatMenuOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { loadNav() }, [])
  useEffect(() => { setMobileOpen(false); setCatMenuOpen(false) }, [location.pathname])

  async function loadNav() {
    const { data } = await supabase
      .from('downloads_categorias')
      .select('id, slug, nome, cor')
      .eq('ativo', true).eq('publico', true)
      .order('ordem')
    setCategorias((data || []) as CategoriaNav[])
  }

  function submitBusca(e: React.FormEvent) {
    e.preventDefault()
    if (busca.trim()) navigate(`/downloads?q=${encodeURIComponent(busca.trim())}`)
  }

  return (
    <div className="min-h-screen bg-stone-50 text-gray-900 flex flex-col downloads-shell">
      {/* Top thin bar — institutional link */}
      <div className="hidden md:block bg-gray-900 text-white/70 text-[11px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-7 flex items-center justify-between">
          <span className="tracking-wide">União Norte Nordeste Brasileira · IASD&nbsp;Movimento de Reforma</span>
          <div className="flex items-center gap-4">
            <a href={SITE_UNIAO} target="_blank" rel="noopener noreferrer" className="hover:text-white inline-flex items-center gap-1">
              unne.asdmr.org.br <HiOutlineExternalLink className="w-3 h-3" />
            </a>
            <Link to="/" className="hover:text-white">Painel NNE</Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 sm:h-20 flex items-center justify-between gap-4">
            {/* Logo wordmark + downloads badge */}
            <Link to="/downloads" className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0">
              <img
                src="/img/logo-nne.png"
                alt="União Norte Nordeste"
                className="h-7 sm:h-9 w-auto object-contain"
              />
              <span className="hidden sm:inline-block h-7 w-px bg-gray-200" />
              <span className="hidden sm:inline-flex items-baseline gap-2">
                <span className="font-serif text-xl text-gray-900 leading-none">Downloads</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-primary-700 font-bold">
                  beta
                </span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              <DesktopLink to="/downloads" end>Início</DesktopLink>
              <div className="relative">
                <button
                  onClick={() => setCatMenuOpen(o => !o)}
                  onBlur={() => setTimeout(() => setCatMenuOpen(false), 150)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 inline-flex items-center gap-1"
                >
                  Categorias <HiOutlineChevronDown className={`w-3.5 h-3.5 transition-transform ${catMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {catMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 max-h-[70vh] overflow-y-auto">
                    {categorias.length === 0 ? (
                      <p className="px-4 py-2 text-xs text-gray-400">Sem categorias publicadas</p>
                    ) : categorias.map(c => (
                      <Link
                        key={c.id}
                        to={`/downloads/${c.slug}`}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: c.cor || '#047857' }}
                        />
                        {c.nome}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <a
                href={SITE_UNIAO}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
              >
                Site da União <HiOutlineExternalLink className="w-3.5 h-3.5" />
              </a>
            </nav>

            {/* Search desktop */}
            <form onSubmit={submitBusca} className="hidden md:flex relative w-72">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar materiais..."
                className="w-full pl-10 pr-3 py-2 text-sm bg-stone-100 border border-transparent rounded-full focus:border-primary-500 focus:bg-white focus:outline-none transition-colors"
              />
            </form>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 -mr-2 text-gray-700"
              aria-label="Menu"
            >
              {mobileOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="lg:hidden pb-4 border-t border-gray-100 pt-3 space-y-1">
              <form onSubmit={submitBusca} className="relative mb-3">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar materiais..."
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-stone-100 border border-transparent rounded-full focus:border-primary-500 focus:bg-white focus:outline-none"
                />
              </form>
              <MobileLink to="/downloads" end>Início</MobileLink>
              {categorias.length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-3 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Categorias</div>
                  {categorias.map(c => (
                    <MobileLink key={c.id} to={`/downloads/${c.slug}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.cor || '#047857' }} />
                      {c.nome}
                    </MobileLink>
                  ))}
                </>
              )}
              <div className="pt-3 border-t border-gray-100 mt-2 space-y-1">
                <a
                  href={SITE_UNIAO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  Site da União <HiOutlineExternalLink className="w-3.5 h-3.5" />
                </a>
                <Link to="/" className="block px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
                  Painel NNE →
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/img/logo-nne.png"
                alt="União Norte Nordeste"
                className="h-9 w-auto object-contain brightness-0 invert"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Biblioteca de materiais oficiais da União Norte Nordeste Brasileira da Igreja Adventista do Sétimo Dia Movimento de Reforma. Manuais, lições, cartilhas e recursos para o ministério.
            </p>
            <a
              href={SITE_UNIAO}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary-300 hover:text-primary-200 font-medium"
            >
              unne.asdmr.org.br <HiOutlineExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3">Categorias</h4>
            <ul className="space-y-2 text-sm">
              {categorias.slice(0, 6).map(c => (
                <li key={c.id}>
                  <Link to={`/downloads/${c.slug}`} className="hover:text-white">{c.nome}</Link>
                </li>
              ))}
              {categorias.length > 6 && (
                <li>
                  <Link to="/downloads" className="text-primary-300 hover:text-primary-200">
                    Ver todas →
                  </Link>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3">Institucional</h4>
            <ul className="space-y-2 text-sm">
              <li><a href={SITE_UNIAO} target="_blank" rel="noopener noreferrer" className="hover:text-white">Site da União</a></li>
              <li><Link to="/" className="hover:text-white">Painel administrativo</Link></li>
              <li><Link to="/portal/inicio" className="hover:text-white">Portal de estudos</Link></li>
              <li><Link to="/diretorio" className="hover:text-white">Diretório de igrejas</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs text-gray-500 flex flex-col sm:flex-row gap-2 justify-between">
            <p>© {new Date().getFullYear()} União Norte Nordeste Brasileira · IASD Movimento de Reforma</p>
            <p>Material de uso interno e ministerial.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function DesktopLink({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive ? 'text-primary-700' : 'text-gray-700 hover:text-primary-700'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function MobileLink({
  to, end, children,
}: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg ${
          isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
