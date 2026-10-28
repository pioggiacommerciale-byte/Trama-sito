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
