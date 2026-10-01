# Forma Studio

Configurador web paramétrico para modelos positivos de jarras, vasos, copos e gatos cerâmicos. Ajuste dimensões e espessura da parede, inspecione a forma em 3D e exporte o modelo em STL.

## Desenvolvimento

Requer Node.js 20.19+ ou 22.12+.

```sh
npm install
npm run dev
```

## Alças e objetos

Todas as formas aceitam seis tipos de alça (clássica, argola, pérolas, trançada, cauda de gato e pata) e um objeto aplicado (pássaro, abelha, borboleta, libélula, gatinho, campânula, copo-de-leite, flor, peixe ou orelhas na borda). Na aba **Meia peça**, alças e objetos de perfil ficam no plano de corte, então cada metade do molde guarda metade deles.

## Limite da impressora

O app respeita a mesa da Bambu Lab A1 (256 × 256 × 256 mm, com 2 mm de folga em cada borda). Ajustes que ultrapassem a mesa são recusados com aviso, e ao trocar de forma ou de aba a peça é reduzida para caber. Na aba Meia peça o limite vale para a placa (e para a contenção, se ela for impressa). Para outra impressora, edite `src/printer.ts`.

## Orçamento

O painel mostra o valor estimado enquanto a peça é montada, para dois produtos: arquivo STL e matriz impressa (material e tempo calculados a partir da área real da malha). Os preços de exemplo ficam em `src/pricing.ts`; troque pelos seus custos. Com `VITE_WHATSAPP_NUMBER` preenchido, o botão abre o WhatsApp com o resumo do pedido. Esse cálculo é só uma estimativa no navegador: antes de cobrar, o valor precisa ser recalculado em um servidor.

## Texturas

A seção **Texturas e efeitos** traz uma galeria com miniaturas (texturas, formas, flores, silhuetas florais, arabescos, animais e bichos) e permite enviar uma imagem própria: as áreas escuras viram relevo. É possível ajustar tamanho, profundidade, faixa de altura, repetir ou aplicar um motivo único, e escolher relevo ou gravado.

## Login com Google

1. No Google Cloud Console, crie um **OAuth Client ID** do tipo *Web application*.
2. Em *Authorized JavaScript origins*, adicione `http://localhost:5173` (e o domínio de produção).
3. Copie `.env.example` para `.env` e preencha `VITE_GOOGLE_CLIENT_ID`; reinicie `npm run dev`.

O login é feito só no navegador (Google Identity Services): o perfil é lido do token para exibição e o token não é validado. Para proteger recursos ou dados por usuário, valide o token em um backend.

## Produção

```sh
npm run build
npm run preview
```

O STL é gerado em escala milimétrica (formato binário) e já inclui a retração da argila (padrão 12%): as medidas do painel são da peça queimada. A aba **Peça completa** exporta o modelo positivo; a aba **Meia peça** exporta apenas metade da peça (cortada no plano da alça) sobre uma placa com quatro chaves de encaixe e reservatório de barbotina, pronta para imprimir com a placa na mesa. Nessa aba também é possível exportar as paredes de contenção em STL separado e ver a estimativa de gesso e água por metade do molde (valores aproximados; confira a proporção indicada pelo fabricante do gesso).