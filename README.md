# Clean Air — Sistema de Monitoramento IoT

Clean Air é uma plataforma de monitoramento ambiental em tempo real baseada em IoT. O sistema coleta dados de sensores físicos conectados a microcontroladores (ESP32 / Arduino), transmite as leituras via protocolo MQTT e exibe as informações em um dashboard web configurável — permitindo que administradores gerenciem dispositivos e usuários enquanto colaboradores visualizam gráficos e exportam relatórios.

---

## Visão Geral da Arquitetura

```
[Sensores] ──► [ESP32 / Arduino] ──MQTT──► [Backend Node.js] ──► [Banco PostgreSQL]
                                                   │
                                             [Socket.IO]
                                                   │
                                          [Frontend React.js]
```

### Camada de Hardware

| Componente | Função |
|---|---|
| **ESP32** | Microcontrolador principal com Wi-Fi integrado; publica leituras no broker MQTT |
| **Arduino** | Alternativa compatível; pode ser combinado com shield ESP8266/ESP32 |
| **Sensores** | Qualquer sensor que produza leituras numéricas é compatível (ex: temperatura, umidade, qualidade do ar, CO₂, material particulado). Exemplos: DHT11/DHT22, MQ-135, MQ-7, PMS5003, SGP30 |

Os dispositivos publicam payloads JSON em tópicos MQTT configurados via painel administrativo. Exemplo de payload:

```json
{
  "temperature": 25.4,
  "humidity": 60.2,
  "co2": 412,
  "pm25": 8.3
}
```

### Camada de Software

| Componente | Tecnologia |
|---|---|
| **Backend** | Node.js + Express, MQTT.js, Socket.IO, PostgreSQL |
| **Frontend** | React.js, Chart.js |
| **Autenticação** | JWT (JSON Web Tokens) |
| **Documentação de API** | Swagger / OpenAPI |

---

## Documentação

| Documento | Descrição |
|---|---|
| [Plano de Implantação](documentacoes/Plano%20de%20Implantacao.pdf) | Passo a passo para implantar o sistema em produção (infraestrutura, variáveis de ambiente, banco de dados, deploy do backend e frontend) |
| [Manual de Utilização](documentacoes/Manual%20de%20utiliza%C3%A7%C3%A3o%20Clean%20Air.pdf) | Guia completo de uso da plataforma para usuários e administradores |
| [Plano de Manutenção](documentacoes/Plano%20de%20Manuten%C3%A7%C3%A3o%20Clean%20Air.pdf) | Procedimentos de manutenção preventiva e corretiva |
| [Diagrama de Casos de Uso](documentacoes/Diagrama%20de%20Casos%20de%20uso.png) | Levantamento dos casos de uso do sistema |
| [Diagrama de Classes](documentacoes/Diagrama%20de%20Classes.png) | Estrutura orientada a objetos do domínio |
| [Modelo Lógico do Banco](documentacoes/Modelo%20L%C3%B3gico%20-%20Banco%20de%20Dados.png) | Esquema relacional do banco de dados |
| [Fluxograma](documentacoes/Fluxograma%20-%20Clean%20Air.pdf) | Fluxo de navegação e processos do sistema |
| [Protótipo Figma](documentacoes/Prot%C3%B3tipo%20Figma%20-%20Clean%20Air.pdf) | Mockups e protótipos de interface |
| [Plano de Projetos e Modelo de Negócio](documentacoes/Plano%20de%20projetos%20e%20Modelo%20de%20neg%C3%B3cio.pdf) | Escopo, cronograma e modelo de negócio |

---

## API

A documentação interativa da API REST está disponível via Swagger:

**[https://clean-air-cloud-database.onrender.com/api/docs/](https://clean-air-cloud-database.onrender.com/api/docs/)**

Principais grupos de endpoints:

- `POST /api/auth/login` — autenticação
- `POST /api/auth/register` — cadastro de usuário
- `GET /api/devices` — dispositivos disponíveis para o usuário
- `GET /api/devices/:id/data` — leituras do dispositivo para gráficos
- `GET /api/devices/:id/export` — exportar dados em CSV/Excel
- `GET /api/admin/users` — gestão de usuários (admin)
- `POST /api/admin/devices` — cadastrar dispositivo (admin)
- `GET /api/health` — verificação de saúde do serviço

---

## Como Implantar

Consulte o **[Plano de Implantação](documentacoes/Plano%20de%20Implantacao.pdf)** para o guia completo. Em resumo:

1. **Banco de dados** — provisione uma instância PostgreSQL e execute os scripts de migração em `backend/src/scripts/`.
2. **Backend** — configure o arquivo `.env` com as variáveis de conexão (banco, broker MQTT, JWT secret, frontend origin) e execute `npm start` na pasta `backend/`.
3. **Frontend** — configure `REACT_APP_API_URL` com a URL do backend e execute `npm run build` na pasta `frontend/teste-mcp/`.
4. **Hardware** — grave o firmware no ESP32/Arduino com o broker MQTT, porta e tópico definidos no painel administrativo do sistema.

---

## Como Usar

Consulte o **[Manual de Utilização](documentacoes/Manual%20de%20utiliza%C3%A7%C3%A3o%20Clean%20Air.pdf)** para instruções detalhadas. Fluxo básico:

**Usuário**
1. Cadastre-se na plataforma e aguarde aprovação do administrador.
2. Após aprovação, acesse a lista de dispositivos disponíveis para você.
3. Clique em um dispositivo para visualizar seu dashboard com gráficos em tempo real.
4. Exporte os dados em Excel pelo botão disponível em cada gráfico.

**Administrador**
1. Faça login com uma conta de administrador.
2. Gerencie usuários: aprove ou rejeite requisições de acesso pelo sino de notificações.
3. Cadastre dispositivos informando nome, broker MQTT, porta e tópico.
4. Configure widgets de gráficos (linha, barra, pizza, rosca) via editor JSON no dashboard.

---

## Suporte

Encontrou um problema, tem uma dúvida ou quer reportar uma falha?

**E-mail:** [contato.cleanair.suporte@gmail.com](mailto:contato.cleanair.suporte@gmail.com)

Ao entrar em contato, informe:
- Descrição detalhada do problema
- Passos para reproduzir (se aplicável)
- Versão do sistema / ambiente (navegador, dispositivo)
- Prints ou logs de erro (se disponíveis)

---

*Projeto desenvolvido no SENAI — Curso de Desenvolvimento de Sistemas*
