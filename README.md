# Extensão Chrome — Bibliofilia / Cartosoft OS

Extensão **Manifest V3** para importar a Ordem de Serviço aberta no CartosoftWeb
diretamente no Bibliofilia, sem esperar o intervalo de importação por período.

Repositório privado / uso interno. Sem licença open-source.

## O que faz (MVP)

- Detecta a página `…/ordem-de-servico/editar/{codigoOs}` no CartosoftWeb
- Exibe um botão flutuante (FAB) arrastável
- Ao clicar, importa **essa OS** no Bibliofilia via API (`import-by-codigo`)
- Vínculo por código de pairing gerado no Admin do Bibliofilia (Bearer token)

Arquitetura pronta para plugar depois: `generateProtocol`, `printReceipt`
(veja `actions/registry.js` e slots em `actions/importOs.js`).

## Instalação (TI / registradores)

### Opção A — Carregar sem compactação (recomendado no MVP)

1. No Chrome, abra `chrome://extensions`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta deste repositório (a que contém `manifest.json`)
5. Confirme que a extensão **Bibliofilia — Cartosoft OS** aparece na lista

### Opção B — Pacote `.zip`

```bash
npm run pack
# gera dist/bibliofilia-chrome-extension-v1.0.0.zip
```

1. Extraia o zip em uma pasta local
2. Em `chrome://extensions`, use **Carregar sem compactação** apontando para a pasta extraída
   (Chrome não instala zip diretamente fora da Web Store)

Também é possível baixar o zip pelo **Admin do Bibliofilia** → Integrações →
**Extensão Chrome** (endpoint `GET /api/chrome-extension/download`).

## Vincular ao Bibliofilia (pairing)

1. Faça login no dashboard administrativo do Bibliofilia
2. Abra **Admin** → **Extensão Chrome** → **Gerar vínculo**
3. Copie o código de 8 caracteres (válido por poucos minutos)
4. Clique no ícone da extensão no Chrome → cole o código → **Vincular**
5. Escolha o ambiente da API se necessário (Produção / Dev / Local)

O token fica em `chrome.storage.local` e as chamadas usam `Authorization: Bearer …`.

## Uso diário

1. No CartosoftWeb, abra ou salve uma OS
   (`…/ordem-de-servico/editar/AUR2600013230`)
2. Clique no FAB **B** (arraste para reposicionar; a posição é lembrada)
3. Aguarde o feedback: loading → sucesso / erro
4. A OS aparece na lista **OS do Cartosoft** do Bibliofilia

## Estrutura

```
manifest.json
shared/          # config, mensagens, parsing de URL
content/         # FAB + content script (DOM)
background/      # service worker (API / auth)
actions/         # registry + importOs (+ slots futuros)
popup/           # UI de vínculo e ambiente
icons/
scripts/pack.sh
tests/
```

## Desenvolvimento

```bash
# testes do parser de URL
npm test

# gerar zip
npm run pack
```

Após editar arquivos, em `chrome://extensions` use **Atualizar** na extensão.

## Permissões

- `storage` — token, ambiente, posição do FAB
- Hosts: CartosoftWeb (`*.recivil.com.br`) + APIs Bibliofilia (prod/dev/local)

## Suporte

Problemas de vínculo ou importação: verificar ambiente da API no popup,
código de pairing não expirado, e se o backend consegue sessão Cartosoft
(CNS / auto-connect da serventia).

## Empacote e auto-update

```bash
# gera keys/extension.pem + identity (uma vez)
bash scripts/generate-key.sh

# gera dist/*.zip e dist/*.crx com key + update_url
bash scripts/pack.sh
```

- `update_url` aponta para `https://backend-goby.onrender.com/api/chrome-extension/updates.xml`
- Instalações **unpacked** não atualizam sozinhas; use o `.crx` ou política
  `ExtensionInstallForcelist` = `<extensionId>;<updateUrl>`
- O popup da extensão compara a versão local com `GET /chrome-extension/meta`

Nunca versionar `keys/extension.pem`. O arquivo `keys/extension-identity.json` (ID + chave pública) pode ser commitado.
