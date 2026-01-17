# CFO - Guarani Escalas

Sistema de gestão militar para controle de escalas de serviço, efetivo e otimização por IA.

## Como Executar Localmente

**Pré-requisitos:** Node.js instalado.

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure as variáveis de ambiente no arquivo `.env.local`:
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Deploy na Vercel

Este projeto está configurado para deploy automático na Vercel.

1. Conecte seu repositório GitHub à Vercel.
2. No painel da Vercel, adicione as seguintes **Environment Variables**:
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. A Vercel detectará automaticamente o Vite e usará o comando `npm run build`.

---
*Desenvolvido para gestão militar eficiente.*
