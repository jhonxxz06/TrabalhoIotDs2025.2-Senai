# 🔄 Guia de Migração: SQLite → PostgreSQL (Neon.tech)

## ✅ Tarefas Concluídas

Seu backend foi preparado para usar PostgreSQL. As seguintes mudanças foram feitas:

1. ✅ Instalação do driver `pg` (PostgreSQL)
2. ✅ Reescrita de `src/config/database.js` para usar PostgreSQL
3. ✅ Atualização de todos os modelos (User, Device, Widget, AccessRequest) para async/await
4. ✅ Atualização de todos os controladores para usar `await`
5. ✅ Atualização do `seed.js` para async/await
6. ✅ Atualização do `mqtt.service.js` para async/await
7. ✅ Criação do arquivo `.env` com template

## 📋 Próximas Etapas

### 1. **Configurar a Connection String do Neon.tech**

Edite o arquivo `.env` e substitua:

```bash
DATABASE_URL=postgresql://user:password@host/databasename?sslmode=require
```

Por sua connection string do Neon.tech. Você pode obtê-la em:
1. Acesse [neon.tech](https://console.neon.tech)
2. Selecione seu projeto
3. Clique em "Connection String" ou "Quick connect"
4. Copie a URL (geralmente começa com `postgresql://`)

**Exemplo de URL do Neon:**
```
postgresql://neondb_owner:AbCd1234@ep-random-name.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2. **Testar a Conexão**

Inicie o servidor para testar se a conexão funciona:

```bash
npm start
```

Você deve ver uma mensagem similar a:
```
✅ Conectado ao banco PostgreSQL com sucesso
✅ Tabelas criadas/verificadas com sucesso
🚀 Servidor rodando em http://localhost:3001
```

### 3. **Fazer Seed de Usuários (Opcional)**

Para criar um usuário administrador de teste:

```bash
npm run seed
```

Isso criará um usuário com:
- Email: `admin@teste.com`
- Senha: `admin123`
- Role: `admin`

### 4. **Remover dados do SQLite (Opcional)**

Se quiser liberar espaço, pode deletar o arquivo `database/database.sqlite`:

```bash
rm database/database.sqlite
```

## 🔍 Alterações Técnicas Realizadas

### database.js
- Substituído `sql.js` (SQLite em memória) por `pg` (PostgreSQL pool)
- Implementado pool de conexões com suporte a SSL
- Adicionado suporte a variáveis de ambiente
- Placeholder SQL mudou de `?` para `$1, $2, ...`

### Modelos
- Todos os métodos agora são `async` e retornam Promises
- Todas as chamadas a banco agora usam `await`

### Controllers
- Adicionado `await` em todas as chamadas aos modelos

### MQTT Service
- `saveData()`, `getData()`, `getLatestFromDb()` agora são async
- Melhorias na query de excedências (usando operadores JSONB do PostgreSQL)

## ⚠️ Diferenças SQL

### SQLite → PostgreSQL

| Aspecto | SQLite | PostgreSQL |
|---------|--------|------------|
| Placeholder | `?` | `$1, $2, ...` |
| JSON | `json_extract()` | `->` ou `->>'` |
| Auto-increment | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL` |
| Timestamp | `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |

## 🐛 Troubleshooting

### Erro: `CONNECTION REFUSED`
- Verifique se a connection string está correta
- Verifique se o banco está ativo no Neon.tech
- Teste a conexão com: `psql <CONNECTION_STRING>`

### Erro: `RELATION DOES NOT EXIST`
- As tabelas serão criadas automaticamente na primeira inicialização
- Se não forem, rode manualmente:
  ```bash
  npm run seed
  ```

### Erro: `SYNTAX ERROR IN SQL`
- Verifique se não há querys com `?` (SQLite) em vez de `$1` (PostgreSQL)
- O sistema foi atualizado, mas verifique se há código customizado

## 📚 Recursos Úteis

- [Documentação Neon.tech](https://neon.tech/docs)
- [Node.js pg driver](https://node-postgres.com/)
- [Comparação SQLite vs PostgreSQL](https://www.postgresql.org/about/newsitem/1595/)

## ✨ Próximos Passos (Opcional)

### Melhorias Recomendadas

1. **Variáveis de Ambiente**
   - Adicione `JWT_SECRET` com uma chave segura
   - Configure diferentes ambientes (dev, test, prod)

2. **Migrations**
   - Considere usar `db-migrate` ou `knex.js` para gerenciar schema
   - Isso facilita versionamento de banco de dados

3. **Backup**
   - Configure backups automáticos no painel do Neon.tech
   - Considere exportar dados regularmente

---

**Dúvidas?** Verifique os logs do servidor para mensagens de erro detalhadas.
