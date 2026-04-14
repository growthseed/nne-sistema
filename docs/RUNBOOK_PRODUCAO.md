# Runbook de Produção — NNE Sistema

**Projeto:** NNE Sistema (União Norte Nordeste)  
**Stack:** React 18 + Vite 5 + Supabase + Vercel  
**Última atualização:** 2026-04-13

---

## 1. Checklist Pré-Deploy

Antes de enviar qualquer build para produção:

- [ ] `npm run build` passa sem erros TypeScript
- [ ] Variáveis de ambiente conferidas (ver seção 6)
- [ ] Migration SQL revisada e aprovada
- [ ] Nenhuma credencial ou `.env` no commit
- [ ] Branch principal atualizado (`git pull origin main`)
- [ ] PR revisado e aprovado por pelo menos 1 pessoa
- [ ] Testar os 3 fluxos críticos localmente:
  - Cadastro público (`/formulario`)
  - Escola Bíblica (`/eb/:classeId`)
  - Admin usuários (`/configuracoes` → usuário → permissões)

---

## 2. Comandos de Build Local

```bash
# Instalar dependências
npm install

# Build de produção
npm run build

# Preview local do build
npm run preview

# Verificar tipos TypeScript
npx tsc --noEmit
```

---

## 3. Verificação Pós-Deploy

Após deploy no Vercel:

1. **Acesso básico:** Acessar `https://nne.sistema` e fazer login como admin
2. **Dashboard:** Verificar se KPIs carregam (sem erro 4xx no console)
3. **Cadastro público:** Acessar `/formulario` e navegar até o Turnstile (não precisa submeter)
4. **Escola Bíblica:** Acessar `/portal/login` e verificar redirect correto
5. **Audit trail:** Fazer uma alteração de papel num usuário de teste e verificar tabela `auditoria` no Supabase
6. **Sessão expirada:** Invalidar sessão manualmente (Supabase Dashboard → Auth → Usuários → Logout) e verificar redirecionamento com banner

```bash
# Verificar logs do Vercel (se CLI instalado)
vercel logs --follow
```

---

## 4. Rollback Rápido

### Via Vercel Dashboard
1. Acessar Vercel Dashboard → Projeto NNE Sistema
2. Deployments → selecionar deploy anterior estável
3. Clicar em "..." → **Promote to Production**
4. Confirmar — rollback completo em < 60s

### Via CLI
```bash
vercel rollback [deployment-url]
```

### Migration Rollback (Supabase)
Supabase **não tem rollback automático** de migrations. Para reverter:
1. Criar nova migration com `DROP TABLE` ou `ALTER TABLE` inverso
2. Aplicar via Supabase Dashboard → SQL Editor

---

## 5. Modo de Emergência

Se o sistema estiver fora do ar ou inacessível:

### Passo 1 — Verificar Status
- Verificar [status.supabase.com](https://status.supabase.com) para incidentes no Supabase
- Verificar [vercel-status.com](https://www.vercel-status.com) para incidentes no Vercel
- Verificar console do browser por erros de CORS ou 5xx

### Passo 2 — Isolar o problema
```
Sintoma                         → Causa provável
─────────────────────────────────────────────────
Tela branca, sem erros JS       → Build corrompido → Rollback Vercel
Erro 401/403 em todas as rotas  → RLS ou JWT expirado → verificar Supabase
Dados não aparecem              → RLS muito restritiva → checar políticas
Erro de CORS                    → Variável VITE_SUPABASE_URL incorreta
"Supabase not configured"       → Env var faltando na Vercel
```

### Passo 3 — Comunicar
- Notificar usuários afetados via WhatsApp/email
- Registrar incidente em ClickUp com: hora de início, causa, ação tomada, hora de resolução

---

## 6. Checklist de Segurança

### Variáveis de Ambiente (Vercel)
Verificar que todas existem e têm valor correto:

| Variável                  | Descrição                         | Obrigatória |
|---------------------------|-----------------------------------|-------------|
| `VITE_SUPABASE_URL`       | URL do projeto Supabase           | Sim         |
| `VITE_SUPABASE_ANON_KEY`  | Chave pública (anon) do Supabase  | Sim         |
| `VITE_TURNSTILE_SITE_KEY` | Site key do Cloudflare Turnstile  | Opcional*   |

*Sem `VITE_TURNSTILE_SITE_KEY` o CAPTCHA é desabilitado silenciosamente nos formulários públicos.

### Supabase RLS
Conferir antes de qualquer migration que altera tabelas críticas:

```sql
-- Listar todas as políticas ativas
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado nas tabelas sensíveis
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('usuarios', 'pessoas', 'dados_financeiros', 'auditoria');
```

### Audit Trail
Verificar se ações administrativas estão sendo registradas:

```sql
-- Últimas 20 ações de auditoria
SELECT created_at, action, payload, actor_id
FROM auditoria
ORDER BY created_at DESC
LIMIT 20;
```

### Senhas e Chaves
- **Nunca** commitar `.env` ou `.env.local`
- Rotacionar Supabase service key se houver suspeita de vazamento
- Revogar e regenerar Turnstile secret key em caso de abuso

---

## Contatos de Emergência

| Recurso      | Onde acessar                                  |
|--------------|-----------------------------------------------|
| Supabase     | dashboard.supabase.com → projeto nne          |
| Vercel       | vercel.com → NNE Sistema                      |
| Cloudflare   | dash.cloudflare.com → Turnstile               |
| Repositório  | github.com → NNE Sistema                      |
