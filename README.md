# Ibeauty

Marketplace de serviços de beleza com agendamento e geolocalização.

Clientes encontram profissionais (manicure, cabelo, sobrancelha, estética etc.)
próximos a eles e marcam horário. Profissionais cadastram serviços, preços,
duração e horários disponíveis.

## Stack

- **Backend**: FastAPI (Python 3.12), SQLModel, SQLite
- **Frontend**: React + Vite + TypeScript, Leaflet (OpenStreetMap)
- **Auth**: JWT (email/senha). Google OAuth previsto para v2.

## Estrutura

```
ibeauty/
├── backend/     # API FastAPI
└── frontend/    # SPA React
```

## Rodando localmente

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

A primeira execução popula o banco com dados de exemplo (seed).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Por padrão o frontend aponta para `http://localhost:8000`. Em produção, defina
`VITE_API_BASE_URL`.

## Features (MVP)

- Cadastro/login de clientes e profissionais (email/senha, JWT)
- Profissionais cadastram serviços (nome, preço, duração) e horários de trabalho
- Busca de profissionais por proximidade (geolocalização do navegador)
- Mapa interativo com Leaflet + OpenStreetMap
- Agendamento de horários
- Dashboard do profissional com agenda
- Cliente vê seus próximos agendamentos
