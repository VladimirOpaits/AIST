# Инструкции по запуску

## Требования

- Node.js 18+ 
- npm или yarn
- Backend FastAPI сервер (должен быть запущен отдельно)

## Установка

1. **Клонируйте репозиторий**
```bash
git clone <your-repo>
cd <project-name>
```

2. **Установите зависимости**
```bash
npm install
```

3. **Настройте переменные окружения**

Создайте файл `.env` в корне проекта:
```bash
cp .env.example .env
```

Отредактируйте `.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```

## Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:8080`

## Сборка для production

```bash
npm run build
```

Собранные файлы будут в папке `dist/`

## Структура API endpoints

Backend должен предоставлять следующие endpoints:

### Загрузка документов
```
POST /upload-pdf
Content-Type: multipart/form-data
Body: { file: File }
Response: { doc_id: string }
```

### Получение документа
```
GET /get-document?doc_id={id}
Response: {
  doc_id: string,
  metadata: DocumentMetadata,
  chunks: Chunk[]
}
```

### Получение всех документов
```
GET /documents
Response: Document[]
```

### Векторный поиск
```
GET /query?q={query}
Response: {
  answer: string,
  source_nodes: SourceNode[],
  query: string
}
```

### LLM запрос
```
GET /query-llm?q={query}
Response: {
  answer: string,
  source_nodes: SourceNode[],
  query: string
}
```

### Удаление документа
```
DELETE /delete-document?doc_id={id}
Response: 200 OK
```

## Типы данных

Все TypeScript типы определены в `src/types/rag.ts`

### Document
```typescript
interface Document {
  doc_id: string;
  metadata: DocumentMetadata;
  chunks: Chunk[];
}
```

### Chunk
```typescript
interface Chunk {
  chunk_id: string;
  text: string;
  summary?: string;
  metadata: Record<string, any>;
}
```

### SourceNode
```typescript
interface SourceNode {
  chunk_id: string;
  text: string;
  summary?: string;
  score: number;
  metadata: Record<string, any>;
}
```

## CORS настройка

Убедитесь, что ваш FastAPI backend разрешает CORS:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Ошибка подключения к API
- Проверьте что backend запущен
- Проверьте `VITE_API_BASE_URL` в `.env`
- Проверьте CORS настройки

### Файлы не загружаются
- Проверьте размер файла (может быть ограничение на backend)
- Проверьте формат файла (должен быть PDF или TXT)

### Чанки не отображаются
- Проверьте формат ответа от `/get-document`
- Убедитесь что backend возвращает массив chunks

## Дополнительные команды

```bash
# Проверка типов
npm run type-check

# Линтинг
npm run lint

# Форматирование
npm run format
```

## Рекомендации по развертыванию

1. **Vercel / Netlify**
   - Добавьте переменную окружения `VITE_API_BASE_URL`
   - Build command: `npm run build`
   - Output directory: `dist`

2. **Docker**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   
   FROM nginx:alpine
   COPY --from=0 /app/dist /usr/share/nginx/html
   EXPOSE 80
   ```

3. **Nginx reverse proxy**
   ```nginx
   location /api {
       proxy_pass http://backend:8000;
   }
   
   location / {
       root /var/www/html;
       try_files $uri /index.html;
   }
   ```
