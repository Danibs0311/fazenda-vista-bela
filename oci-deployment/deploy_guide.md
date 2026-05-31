# Guia de Deploy Fazenda Vista Bela - OCI (Oracle Cloud Infrastructure)

Este guia descreve como configurar a sua máquina virtual **Always Free (Ampere ARM)** na OCI e colocar o sistema de gestão no ar de forma totalmente visual e profissional.

Recomendamos fortemente a **Rota A (Coolify)** pela extrema facilidade de gerenciar banco de dados, n8n e fazer deploys automáticos via Git.

---

## 🌟 Rota A: Coolify (Recomendado - 100% Visual & Git-Push)

O Coolify transforma sua VM em uma "Vercel / Heroku" própria e gratuita.

### Passo 1: Acessar a VM via PowerShell
Abra o **PowerShell** no seu computador Windows e acesse o terminal do Linux (Ubuntu) usando sua chave de acesso:
```powershell
ssh -i "C:\Caminho\Para\Sua\chave_privada.key" ubuntu@SEU_IP_PUBLICO
```

### Passo 2: Instalar o Coolify (Comando Único)
Já dentro do terminal do Linux, copie e cole este comando oficial do Coolify:
```bash
# Baixar e rodar o instalador oficial
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```
*Aguarde a conclusão da instalação (leva cerca de 3 a 5 minutos).*

### Passo 3: Acessar o Painel Visual
1. Abra seu navegador no computador e acesse: `http://SEU_IP_PUBLICO:8000`
2. Crie a sua conta administrativa (primeiro acesso) com seu e-mail e uma senha segura.
3. **Pronto!** Você está no painel do Coolify.

### Passo 4: Subir o Banco de Dados e o n8n
No painel do Coolify:
1. Clique em **Sources** (Fontes) ou **Create New Project** (Criar Novo Projeto).
2. Selecione **Services** (Serviços) na lista de novos recursos.
3. Escolha **n8n** na lista de aplicativos com um clique. O Coolify vai baixar, configurar e colocar o n8n no ar imediatamente com HTTPS automático!
4. Repita o processo e escolha **PostgreSQL** para o seu banco de dados.

### Passo 5: Conectar o GitHub para Deploys do React (Git-Push)
1. No Coolify, vá em **Sources** -> **Add New Source** -> **GitHub App**.
2. Conecte sua conta do GitHub e autorize o repositório `fazenda-vista-bela---gestao-de-colheita`.
3. Crie um novo recurso no projeto selecionando **Public/Private Repository** (Repositório).
4. Selecione o repositório do seu projeto. O Coolify vai detectar automaticamente que é um projeto React/Vite.
5. Em **Build Command**, coloque `npm run build` e em **Publish Directory**, coloque `dist`.
6. Clique em **Deploy**!

> **O SEGREDO:** A partir deste momento, toda vez que você rodar um `git push origin main` do seu computador local, o Coolify vai detectar, compilar e atualizar o seu site no servidor automaticamente de graça!

---

## 🛠️ Rota B: Docker Compose Manual (Alternativa via Terminal)

Caso você prefira não usar o Coolify e queira configurar tudo no terminal clássico usando os arquivos `docker-compose.yml` e `nginx.conf` que criamos na pasta local `oci-deployment/`:

### Passo 1: Instalar o Docker na VM
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
exit
```
*(Reconecte o SSH após o exit para aplicar as permissões)*

### Passo 2: Compilar e Enviar os arquivos pelo Windows
No seu PowerShell local (no computador):
```powershell
# 1. Compilar o React
npm run build

# 2. Enviar a pasta de deployment
scp -i "C:\Caminho\chave.key" -r "c:\Users\danie\OneDrive\Área de Trabalho\fazenda-vista-bela---gestão-de-colheita\oci-deployment" ubuntu@SEU_IP_PUBLICO:/home/ubuntu/

# 3. Enviar a pasta compilada
scp -i "C:\Caminho\chave.key" -r "c:\Users\danie\OneDrive\Área de Trabalho\fazenda-vista-bela---gestão-de-colheita\dist" ubuntu@SEU_IP_PUBLICO:/home/ubuntu/dist
```

### Passo 3: Iniciar na VM
No terminal SSH do Linux:
```bash
cd /home/ubuntu/oci-deployment
mv /home/ubuntu/dist ./dist
docker compose up -d

# Injetar o banco de dados
docker cp ../supabase_schema.sql oci-db:/tmp/schema.sql
docker exec -it oci-db psql -U postgres -d postgres -f /tmp/schema.sql
```

---

## 🛑 Comandos Úteis do Servidor:

* **Ver se os containers estão rodando:** `docker ps`
* **Reiniciar tudo:** `docker compose restart` (Rota B) ou clique em Restart no painel do Coolify (Rota A).
