Testes locais rápidos

Para rodar localmente e simular o ambiente de produção:

1. Backend (na pasta `backend`):

```bash
npm install
# criar .env a partir de backend/.env.example e ajustar valores
node src/index.js
```

2. Frontend (na pasta `frontend/teste-mcp`):

```bash
npm install
npm run start
```

Verificações úteis:

- Health: `http://localhost:3001/api/health`
- Logs do backend devem mostrar: `WebSocket pronto` e, após abrir o frontend, `Cliente WebSocket conectado`.
- Configure `FRONTEND_ORIGIN` no backend para a URL do frontend (ex: `https://my-frontend.vercel.app`) para restringir CORS em produção.
