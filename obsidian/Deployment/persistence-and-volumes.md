# Persistência de Dados e Volumes (Easypanel & Docker)

## 1. Por que os dados se perdiam antes?
Containers Docker por padrão têm **sistema de arquivos efêmero (stateless)**. 
Toda vez que você:
1. Fazia um `git push` pelo script `subir-github.bat`;
2. O webhook do Easypanel ou rebuild do Docker criava um container novo;
3. O container anterior era descartado (`docker rm`), e com ele qualquer arquivo criado durante a execução (como `api_keys.json` e as configurações em memória).

## 2. A Nova Arquitetura de Persistência
1. **Sem Banco de Dados Externo nem Novos Microserviços**:
   - **Não precisa criar banco de dados** (MySQL, PostgreSQL, Redis, MongoDB, etc.).
   - **Não precisa criar nenhum outro microserviço**.
   - Os serviços na VPS continuam sendo estritamente os mesmos 2: **Backend** e **Frontend**.
2. **Diretório Centralizado (`DATA_DIR`)**:
   - Tanto as chaves de API (`api_keys.json`) quanto as configurações do sistema (`settings.json`) agora ficam no diretório definido por `DATA_DIR` (padrão em Docker: `/app/data`).
3. **Escrita Atômica**:
   - As escritas são feitas primeiro em um arquivo `.tmp` e renomeadas via `renameSync`, eliminando o risco de corrupção caso o servidor caia durante um write.
4. **Painel Admin com Edição de Configurações**:
   - Em `/ryuk-adm` existe agora a aba "Configurações do Sistema" para alterar `ADMIN_SECRET`, timeouts e concorrências, gravando imediatamente no disco persistente.
5. **Volume Declarado no Dockerfile**:
   - O `Dockerfile` possui `VOLUME ["/app/data"]` e `ENV DATA_DIR=/app/data`.

---

## 3. Como Configurar no Easypanel (Passo a Passo)

Para que os dados sobrevivam a **qualquer** atualização de código no Easypanel:

1. Acesse o seu painel **Easypanel**.
2. Abra o projeto e clique no serviço do **backend** (ex: `ryuk-backend`).
3. Vá para a aba **Mounts** (ou **Volumes**).
4. Clique em **Add Mount** / **Create Volume**:
   - **Type**: `Volume`
   - **Name**: `ryuk_data` (ou qualquer nome de sua preferência)
   - **Mount Path**: `/app/data`
5. Clique em **Save** e faça um **Deploy** (ou Redploy).

> [!IMPORTANT]
> Uma vez montado o volume em `/app/data`, **nunca mais** as suas chaves de API ou configurações serão apagadas quando o Easypanel rebuildar ou reiniciar o container!

---

## 4. Como Rodar com Docker Compose (VPS)

Se você utiliza `docker-compose` diretamente na VPS:

```bash
docker compose up -d --build
```

O arquivo `docker-compose.yml` na raiz já está configurado com o volume nomeado `ryuk_data`:
```yaml
services:
  backend:
    volumes:
      - ryuk_data:/app/data
volumes:
  ryuk_data:
    name: ryuk_data
```

---

## 5. Como Rodar com Docker CLI Puro (Manual)

Se rodar com comando `docker run` avulso, sempre inclua a flag `-v`:

```bash
# 1. Cria o volume persistente se não existir
docker volume create ryuk_data

# 2. Executa o backend com o volume montado
docker run -d \
  --name ryuk-backend \
  -p 3000:3000 \
  -v ryuk_data:/app/data \
  -e ADMIN_SECRET=sua_senha_aqui \
  ryuk-backend
```
