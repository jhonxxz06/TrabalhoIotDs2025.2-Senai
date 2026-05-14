# 🔒 Plano de Segurança — Redução de Exposição no DevTools

> **Objetivo:** Remover ou suprimir todos os `console.log`, `console.warn` e `console.error` que
> expõem informações sensíveis no DevTools do navegador (Ctrl+Shift+I), como URLs de API,
> tokens, rotas internas, dados de login e payloads do MQTT.

---

## Status Geral

| Tarefa | Status |
|--------|--------|
| MT-01  | ✅ Concluída |
| MT-02  | ✅ Concluída |
| MT-03  | ✅ Concluída |
| MT-04  | ✅ Concluída |
| MT-05  | ✅ Concluída |
| MT-06  | ✅ Concluída |

---

## MT-01 — Criar utilitário centralizado de logging seguro

**Arquivo:** `frontend/teste-mcp/src/utils/logger.js` *(novo)*

**Problema:** Não existe nenhum mecanismo de controle de logs. Qualquer `console.log` inserido
por qualquer developer vai direto para o DevTools do usuário final em produção.

**Solução:** Criar um módulo `logger.js` que:
- Em **desenvolvimento** (`NODE_ENV === 'development'`): imprime normalmente.
- Em **produção** (`NODE_ENV === 'production'`): silencia completamente todos os logs.
- Exporta funções `logger.log()`, `logger.warn()`, `logger.error()` para uso em todo o projeto.

**Risco eliminado:** Base para todas as tarefas seguintes.

**Status:** ✅ Concluída — arquivo criado em `src/utils/logger.js`

---

## MT-02 — Limpar logs sensíveis em `services/socket.js`

**Arquivo:** `frontend/teste-mcp/src/services/socket.js`

**Problema:** Os seguintes logs expõem o `socket.id` e outras informações de conexão:
```
linha 19: console.log('[Socket] conectado', socket.id);
linha 23: console.warn('[Socket] connect_error', err...);
linha 27: console.log('[Socket] desconectado', reason);
```

**Solução:** Substituir pelos equivalentes do `logger.js`.

**Status:** ✅ Concluída — `socket.id` removido dos logs; `console.*` substituídos por `logger`

---

## MT-03 — Limpar logs sensíveis em `services/api.js`

**Arquivo:** `frontend/teste-mcp/src/services/api.js`

**Problema:** Os seguintes logs expõem status HTTP, corpos de resposta completos e possíveis
dados de autenticação:
```
linha 31: console.error('Erro na resposta:', { status, message, data });
linha 37: console.error('Erro ao parsear JSON:', err, 'Status:', ..., 'Text:', ...);
```
O segundo log chega a fazer `response.text()`, potencialmente imprimindo o HTML/JSON cru
do servidor, o que pode revelar stack traces do backend.

**Solução:**
- Substituir pelo `logger` centralizado.
- No `console.error` da linha 31: omitir o campo `data` completo (manter apenas `status` e `message`).
- No `console.error` da linha 37: omitir o texto bruto da resposta.

**Status:** ✅ Concluída — `data` completo e texto cru do servidor removidos dos logs; `console.*` substituídos por `logger`

---

## MT-04 — Limpar logs de depuração em `App.js`

**Arquivo:** `frontend/teste-mcp/src/App.js`

**Problema:** Há uma concentração grave de logs neste arquivo. As principais categorias de risco:

1. **Logs de dados MQTT / Excel** (linhas 340–349, 365–366, 393, 446–447):
   Imprimem `response.data[0]` completo — timestamps, payloads de sensores, estruturas internas.

2. **Logs de fluxo de autenticação** (linhas 82, 212):
   Informam quando o socket é inicializado junto ao login, correlacionando eventos.

3. **Logs de logout** (linhas 282, 293):
   Expõem o estado de navegação interno (`PAGES.LOGIN`).

4. **Logs de erros com objetos** (linhas 84, 102, 115, 127, 149, 176, 306, 318, 329, 356, 388, 470, 483, 503, 523):
   Alguns fazem `console.error('...', err)` imprimindo o objeto de erro completo com stacktrace.

**Solução:**
- Substituir todos pelos equivalentes do `logger`.
- Nas linhas 340–349: **remover completamente** os logs de dados de sensores (são dados de negócio, não de debug).
- Nos `console.error` que recebem `err` como segundo argumento: passar apenas `err.message`.

**Status:** ✅ Concluída — 22 pontos corrigidos: dados MQTT, fluxo de auth/logout, erros de dispositivos e CSV removidos/substituídos por `logger`

---

## MT-05 — Limpar logs em componentes (DashboardPage, AdminDashboardPage, TableWidget, GraphEditorModal)

**Arquivos:**
- `src/components/DashboardPage/DashboardPage.js`
- `src/components/AdminDashboardPage/AdminDashboardPage.js`
- `src/components/TableWidget/TableWidget.js`
- `src/components/GraphEditorModal/GraphEditorModal.js`
- `src/components/AdminHeader/AdminHeader.js`
- `src/components/LoginPage/LoginPage.js`
- `src/components/RegisterPage/RegisterPage.js`

**Problema:** Os logs nesses arquivos expõem:
- **DashboardPage:** ID do dispositivo no WebSocket (linha 51, 91), payloads MQTT em tempo real (linha 58).
- **TableWidget:** URL completa da rota de excedências com query params (linha 116), resposta completa da API (linha 119), valores de thresholds (linha 90, 98, 103).
- **GraphEditorModal:** Estrutura interna dos widgets e datasets (linhas 180, 203, 204, 215, 228, 241, 269, 270).
- **AdminHeader/LoginPage/RegisterPage:** Logs de erro com objetos completos.

**Solução:** Substituir todos pelos equivalentes do `logger`. Remover logs que expõem payloads
de dados de negócio (dados de sensores, IDs de dispositivos, estruturas de widgets).

**Status:** ✅ Concluída — todos os 7 componentes atualizados com `logger`; URLs de API, IDs de dispositivos, payloads e dados internos removidos do console

---

## MT-06 — Verificação final e validação

**Objetivo:** Confirmar que nenhum log sensível sobrou no código do frontend.

**Ações:**
1. Executar busca global por `console.log`, `console.warn`, `console.error` nos arquivos `src/`.
2. Confirmar que apenas o arquivo `logger.js` utiliza os métodos nativos do `console`.
3. Verificar no navegador (modo produção/build) que o DevTools não exibe mais informações sensíveis.
4. Verificar que o modo desenvolvimento ainda exibe logs úteis para o time de dev.

**Status:** ✅ Concluída — varredura global passou. `console.*` encontrado apenas em `logger.js` (autorizado) e `test-api.js` (script de teste, fora do bundle).

---

## Notas de Segurança

> [!NOTE]
> O arquivo `src/test-api.js` também contém vários `console.log/error`, mas **não é importado
> em nenhuma parte da aplicação** — é um script utilitário de teste manual. Será mantido como
> está, mas deve ser excluído do build de produção (`.gitignore` ou remoção manual).

> [!WARNING]
> Estas alterações **não afetam a segurança do backend**. Logs no servidor Node.js são
> separados e visíveis apenas em ambientes controlados. O foco aqui é o **client-side**.

> [!CAUTION]
> Após a conclusão, nunca usar `console.log/warn/error` diretamente nos arquivos do frontend.
> Sempre usar `logger.log/warn/error` para que o controle de produção seja respeitado.
