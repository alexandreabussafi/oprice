# Guia de Deploy e Rollback

Bem-vindo ao manual de implementação (Deploy) e reversão de versões (Rollback) do sistema OpCapex (Oprice), hospedado na plataforma Vercel e versionado no GitHub.

Este guia é para você sempre saber os passos exatos de envio de novas versões e como agir caso aconteça algum problema em produção (erro crítico) e seja necessário voltar para a versão anterior que estava funcionando.

---

## 🚀 1. Procedimento de Deploy (Atualizar o Sistema)

Como a plataforma está conectada diretamente ao repositório do GitHub, a Vercel possui integração contínua (CI/CD). Isso significa que toda vez que você enviar novos arquivos para a branch `main`, a Vercel vai baixar, iniciar a montagem (*build*), e colocar a nova versão online automaticamente.

### Passo a Passo:
Abra o seu terminal no VSCode, na pasta raiz do projeto, e execute os comandos em ordem:

1. **Adicionar os arquivos modificados:**
   ```bash
   git add .
   ```
   *(Isso avisa ao Git para preparar "todas" as suas edições locais para o commit).*

2. **Registrar a alteração (Commit):**
   ```bash
   git commit -m "feat: Adicionado novas funcionalidades de XYZ"
   ```
   *(Substitua a mensagem entre aspas por um resumo curto e claro das modificações. Isso ajuda muito a achar essa atualização depois, se precisar de um Rollback).*

3. **Enviar para o GitHub (Push):**
   ```bash
   git push origin main
   ```
   *(Esse comando é o que engatilha o Deploy. O código sai da sua máquina, vai para a nuvem da Microsoft (GitHub), e o GitHub avisa a Vercel).*

### Acompanhando o Deploy:
* Acesse o Dashboard da **Vercel** (`vercel.com`).
* Entre no seu projeto `oprice` (ou `opcapex`).
* Na aba **Deployments**, você verá a sua atualização carregando e mudando para o status `Ready` em alguns segundos ou minutos. Quando ficar verdinho, a versão está online para os usuários!

---

## ↩️ 2. Procedimento de Rollback (Voltar Versão)

Caso você faça um Deploy e um *Bug* muito feio entre em produção travando algo para os usuários, nós precisamos fazer um Rollback.

Existem **duas** excelentes formas de fazer isso. Escolha a que preferir de acordo com o nível da urgência:

### Opção A: Rollback Instantâneo via Painel Vercel (Recomendado para Emergências 🚨)
Essa é a opção mais rápida. Ela não altera os arquivos na sua máquina nem no GitHub, ela simplesmente avisa à Vercel para carregar a versão antiga do site, sem precisar baixar código ou dar `build` tudo de novo. O site conserta na hora!

1. Acesse `vercel.com` e abra o seu projeto.
2. Vá até a aba **Deployments**.
3. Na lista, vão aparecer os deploys mais recentes ordenados por tempo. O primeiro (marcado de azul) geralmente é a *"Current Production"*. 
4. Olhe para a versão **imediatamente abaixo** (que era a que estava funcionando antes de você quebrar).
5. Clique nos **Três Pontinhos (•••)** no direito do bloco dessa versão.
6. Clique em **Promote to Production** (ou, dependendo de como estiver configurado, clique em **Assign Custom Domains** ou **Rollback**).
7. Confirme a ação. Em **dois segundos**, a plataforma volta para a versão saudável.

*(⚠️ Importante: O site voltou ao normal, mas o que causou o problema ainda está no código na sua branch `main`, no GitHub e na sua máquina. Portanto, após isso, volte para o código, conserte o erro localmente e faça um novo passo de Deploy nº 1 para corrigir).*

### Opção B: Rollback pelo Código (Git Revert)
Essa é a maneira oficial do programador. Se você não tem acesso à Vercel no momento, mas tem pelo VSCode, você comanda ao Git para "desfazer" as alterações do último envio.

1. No terminal do VSCode, liste e veja o "hash" (código) dos últimos submits:
   ```bash
   git log --oneline
   ```
   (Aperte a letra `q` para sair de dentro dessa lista do git log).

2. Reverter os envios na máquina:
   O jeito mais simples, caso queira ignorar as alterações que acabou de fazer, é reverter o último commit que foi efetuado, ou o próprio commit do GitHub caso você esteja fora de sincronia. Mas um "Desfazer Código" básico do último commit é:
   
   ```bash
   git revert HEAD
   ```
   Ele vai pedir uma mensagem extra, e então você aceita salvar isso (salvar como novo commit desfazendo o ultimo código).

3. Enviei a "desfeita" de volta pro GitHub:
   ```bash
   git push origin main
   ```
   *Nesse momento, o GitHub atualizado avisa a Vercel, e ela começa a rodar um novo Build com o código antigo por cima de novo. Demora aqueles minutinhos, e o site volta a funcionar*.
