# Trama — sito

Sito vetrina di Trama, stampa 3D su misura.

## Com'è fatto

Sito statico, senza strumenti di build:

- `index.html` — tutte le sezioni della home
- `assets/styles.css` — colori (token chiaro/scuro), caratteri, impaginazione, animazioni allo scorrimento
- `assets/main.js` — il vaso che si stampa in apertura, le forme del generatore, il primo piano della trama, il modulo contatti
- `BRIEF.md` — regole del marchio e del sito: **da leggere prima di ogni modifica**

## Sezioni della home

1. Apertura: chi siamo e un solo invito all'azione ("Raccontaci la tua idea")
2. Fascia: "Non serve un file 3D"
3. Cosa realizziamo: vasi e lampade, bomboniere, statuette, pezzi unici
4. Come funziona: tre passi
5. Forme: anteprime del generatore (diventerà il catalogo)
6. Il dettaglio: texture scritte nel G-code
7. Domande frequenti
8. Contatti

## Vederlo in locale

Apri `index.html` nel browser, oppure da questa cartella:

```
python3 -m http.server 8000
```

e vai su http://localhost:8000.

## Il team di agenti

Tre agenti migliorano il sito un passo alla volta, a turni, e si passano il lavoro tramite `agenti/BACHECA.md`:

| Ruolo | File | Turno |
| --- | --- | --- |
| Designer | `.claude/agents/designer.md` | apre la settimana: una miglioria visiva, branch `settimana/AAAA-SS`, pull request in bozza |
| Sviluppatore | `.claude/agents/sviluppatore.md` | a metà settimana: completa, rifinisce, una miglioria tecnica |
| Revisore | `.claude/agents/revisore.md` | chiude la settimana: controlla, corregge i dettagli, riepilogo per il titolare |

Nessun agente scrive su `main`: ogni settimana arriva una pull request che il titolare approva o rifiuta.

I ruoli sono adattati da [wshobson/agents](https://github.com/wshobson/agents) (licenza MIT). Gli originali sono in `agenti/originali/`.
