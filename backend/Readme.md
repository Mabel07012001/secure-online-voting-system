# Backend - Sistema de Votação Online

## Como rodar

1. Instalar dependências:
   npm install

2. Iniciar servidor:
   node server.js

3. Abrir no navegador:
   http://localhost:5000

## Rotas

- GET  /                  → Testar servidor
- POST /api/register      → Registar eleitor
- POST /api/login         → Login
- GET  /api/candidates    → Listar candidatos
- POST /api/vote          → Votar
- GET  /api/results       → Resultados
- GET  /api/stats         → Estatísticas