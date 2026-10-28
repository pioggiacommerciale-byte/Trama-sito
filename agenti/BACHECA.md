# Bacheca del team

Qui designer, sviluppatore e revisore si passano il lavoro. Ognuno la legge all'inizio del turno e la aggiorna alla fine. Il titolare può scriverci quando vuole: nuove migliorie, risposte, priorità.

## Settimana in corso

- Branch: `settimana/2026-44`
- Pull request: [#1](https://github.com/pioggiacommerciale-byte/trama-sito/pull/1) (di nuovo in bozza)
- Stato: riaperta dal titolare per una nuova richiesta (sito più futuristico, texture di filamento, effetti 3D): tocca al designer, poi sviluppatore e revisore
- Esito della revisione: nessun problema trovato. Controllati a 400 px e 1280 px, tema chiaro e scuro, movimento ridotto: nessuno scorrimento orizzontale, nessun errore nella console (a parte i font esterni non raggiungibili dal test), tutte le sezioni visibili a fine scorrimento. Favicon e `theme-color` usano gli stessi valori dei token. Resta utile una prova a mano su un iPhone vero.
- Lasciato al revisore: controllare l'apertura (titolo e sottotitolo ora visibili da subito, si spostano solo di 8 px), la comparsa delle sezioni, la favicon nuova (T chiara su fondo scuro con una linea bronzo, `assets/favicon.svg`) e i meta tag di condivisione in `index.html`.
- Note dello sviluppatore:
  - Safari e Firefox non erano disponibili per la prova: ho simulato in Chromium il loro ripiego (senza `animation-timeline`). Barra dei passi e comparsa funzionano. Una prova a mano su un iPhone vero resta utile.
  - Il vaso che si stampa in apertura è pesante su telefono lento (fotogrammi da 200-500 ms con CPU 6x): non blocca più il titolo, ma è un candidato per una miglioria futura (meno strati disegnati su schermi piccoli).
  - Open Graph senza `og:url` e `og:image`: servono il dominio e un'immagine, aspettano il titolare.

## Lista migliorie

Una riga per miglioria, la prima in alto è la più importante. Tra parentesi quadre il ruolo che la prende.

- [ ] [designer] **Nuova priorità del titolare (28/10, sera)**: sito più futuristico e minimale, più accattivante ma sempre professionale.
  - Sfondo con la texture di un filamento: **il titolare lascia la scelta al designer** (che filamento, quanto visibile). Deve restare discreta, dietro ai contenuti, leggibile in chiaro e scuro.
  - **Vaso 3D vero in apertura** che ruota e segue il mouse o il dito. Il titolare **autorizza una libreria 3D** (per esempio three.js da cdnjs, versione fissa): è l'unica eccezione alla regola "niente librerie".
  - Restano fissi: nome, logo, caratteri, accento bronzo, testi. Movimento ridotto: tutto fermo e visibile.
- [ ] [sviluppatore] **Stessa richiesta, seconda parte**: profondità leggera nel resto della pagina (livelli che scorrono a velocità diverse, schede che si inclinano un poco al passaggio). Poi prestazioni del 3D su telefono: meno dettaglio su schermi piccoli, pausa quando il vaso è fuori schermo, ripiego statico se WebGL non c'è o il telefono è lento.
- [x] [designer] **Priorità del titolare (28/10)**: animazioni mentre si scorre la pagina. Le sezioni devono comparire e sfumare con effetti di transizione curati; bottoni e link cliccabili con un effetto al passaggio del mouse (e al tocco su telefono). Obiettivo: un sito dall'aspetto professionale, non vistoso. Partire da ciò che esiste in `assets/styles.css` (sezione "movimento") e rispettare il movimento ridotto.
- [ ] [designer] Menu su telefono: sotto gli 860 px i link alle sezioni spariscono. Proporre un menu compatto.
- [x] [sviluppatore] Favicon con la T di Trama e meta tag per la condivisione (Open Graph). Mancano `og:url` e `og:image`, in attesa del dominio.
- [ ] [designer] Sezione Forme: preparare lo spazio per le foto vere (formato, didascalie), senza inventare foto.
- [ ] [sviluppatore] Dati strutturati di base per Google: solo nome e descrizione, niente indirizzi o telefoni finché il titolare non li conferma.
- [ ] [revisore] Controllo completo di contrasto e testi del sito attuale.

## Domande per il titolare

- Quali contatti mostrare: email, WhatsApp, Instagram? (vedi `BRIEF.md`)
- Per l'anteprima quando il sito viene condiviso (WhatsApp, social): qual è il dominio del sito, e c'è una foto di un lavoro vero da usare come immagine?

## Registro

- 2026-10-28 · setup · Prima versione del sito e ruoli del team (designer, sviluppatore, revisore).
- 2026-10-28 · designer · Animazioni allo scorrimento e effetti al passaggio/tocco su bottoni e link (branch settimana/2026-44, PR in bozza).
- 2026-10-28 · sviluppatore · Corretta la dissolvenza in uscita al caricamento, titolo d'apertura visibile da subito (LCP), favicon e meta Open Graph.
- 2026-10-28 · revisore · Revisione della settimana 2026-44: tutto a posto, nessuna correzione necessaria, pull request #1 segnata pronta.
- 2026-10-28 · titolare · Nuova richiesta: sito più futuristico e minimale, sfondo con texture di filamento, vaso 3D in apertura (libreria 3D autorizzata) e profondità leggera nel resto.
