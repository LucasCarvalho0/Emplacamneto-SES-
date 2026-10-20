# EMPLACAMENTO SESÉ

Sistema de controle de emplacamento de veículos: importação da OS em Excel, distribuição por operador,
leitura de **código de barras** pelo celular e conclusão validada no servidor, sem duplicidade e com histórico.

Next.js 15 (App Router), TypeScript, Tailwind, Prisma, PostgreSQL, PWA.

## Como rodar

Pré-requisitos: Node 20.9 ou superior e um PostgreSQL (local, Supabase, Neon ou Railway).

```bash
npm install
cp .env.example .env          # preencha DATABASE_URL e os dados do primeiro administrador
npx prisma migrate dev --name init   # cria o banco e a pasta prisma/migrations (versionar no Git)
npm run db:seed               # cria o primeiro administrador
npm run dev                   # http://localhost:3000
```

- Administrativo: `/login` (e-mail e senha).
- Operador: `/operador/login` (matrícula e senha). Cadastre os operadores em **Operadores**; o sistema gera uma
  senha temporária que o operador troca no primeiro acesso.

## Fluxo de uso

1. **Importar OS**: envie o `.xlsx`. O sistema lê as abas pelos nomes das colunas, mostra o que encontrou e você
   escolhe as abas e confirma a data. **Abas ocultas vêm desmarcadas.**
2. **Chaves**: cada veículo guarda *retira a chave / não retira* (coluna RETIRAR CHAVE, ou o nome da aba) e
   *2 chaves / 1 chave* (coluna "2 CHAVES NO VEICULO"). Como essa coluna costuma vir vazia, na tela da OS você
   marca os veículos e define 1 ou 2 chaves. Dashboard, distribuição e lista do operador separam por esses campos.
3. **Distribuir**: escolha operador, quantidade e filtro de chaves. Cada envio cria um lote.
4. **Operador**: abre o app, lê o código de barras do chassi (ou digita), confere o veículo, digita a placa
   instalada e confirma. O servidor recusa qualquer divergência.
5. **Finalizar lote** e receber mais veículos; redistribuição de pendentes quando um operador é desativado.

## Recuperação de senha

- **Administrador:** `/esqueci-senha` envia um link válido por 30 minutos (uso único, máximo de 3 pedidos por hora).
  Configure `APP_URL`, `SMTP_URL` e `MAIL_FROM` no `.env`. Sem SMTP, em desenvolvimento o link aparece no terminal.
  Ao redefinir, todas as sessões da conta são encerradas.
- **Operador:** não tem e-mail; o administrativo gera uma senha temporária em **Operadores**.

## Regras de segurança implementadas

- Senhas com Argon2id; sessão em cookie `httpOnly` (o banco guarda só o hash do token); limite de 5 tentativas
  por conta e 30 por IP em 15 minutos; mensagem de erro igual para conta inexistente, inativa ou senha errada.
- Perfil e situação da conta são lidos do banco a cada requisição. O operador é sempre o da sessão.
- Conclusão em transação: atualização condicional do veículo + restrições únicas (`Plating.vehicleId` e
  `Plating.vin`). Dois operadores confirmando juntos: só um conclui.
- A conclusão exige VIN idêntico ao autorizado **e** placa digitada idêntica à autorizada.
- Importação recusa VIN/placa duplicados, marca como bloqueado o veículo sem placa/placa inválida, o já emplacado
  e o pendente em outra OS. Arquivo repetido (mesmo hash) é recusado.
- Auditoria de login, importação, distribuição, conclusão, e registro de toda leitura recusada.
- Service worker não guarda páginas nem `/api`; sem internet, o app avisa e nada é registrado.

## Testes

```bash
npm run test               # regras de VIN, placa, chaves e leitura da planilha real (sem banco)
npm run typecheck && npm run lint
DATABASE_URL_TEST=... npm run test:integration   # concorrência de conclusão (banco de teste)
```

## Implantação (Vercel)

1. Suba o projeto no GitHub e importe na Vercel.
2. Variável `DATABASE_URL` (use a URL com *pooler* do provedor).
3. Rode `npx prisma migrate deploy` contra o banco de produção e `npm run db:seed` uma vez.
4. A câmera só funciona em **HTTPS**. A Vercel já fornece. No celular, abra `/operador`, e use
   "Adicionar à tela inicial" para instalar o PWA.

## Pontos para validar em ambiente real

- Leitura do código de barras nos aparelhos da empresa (etiquetas amassadas ou rasgadas podem falhar; há digitação).
- Turnos dos gráficos: `src/lib/time.ts` (`SHIFTS`).
- O filtro de turno vale para os gráficos de produção; o de vaga busca por trecho da vaga. A planilha não tem coluna
  de pátio, então não há filtro de pátio.
