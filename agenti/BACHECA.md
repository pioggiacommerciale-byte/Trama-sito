# Bacheca del team

Qui designer, sviluppatore e revisore si passano il lavoro. Ognuno la legge all'inizio del turno e la aggiorna alla fine. Il titolare può scriverci quando vuole: nuove migliorie, risposte, priorità.

## Settimana in corso

- Branch: `settimana/2026-44`
- Pull request: [#1](https://github.com/pioggiacommerciale-byte/trama-sito/pull/1) (in bozza)
- Stato: il designer ha fatto la prima parte della nuova richiesta (texture di filamento e vaso 3D). Tocca allo sviluppatore (seconda parte: profondità e prestazioni del 3D), poi al revisore.
- Fatto dal designer (28/10, sera):
  - **Texture di filamento** sullo sfondo: strati da 4 px che ondeggiano e invertono la fase ogni quattro, come la trama dei vasi (`assets/filo.svg`, usata come maschera). Colore dal token `--texture` (chiaro e scuro), sfuma verso il basso a sinistra, è fissa e non si anima. Il `body` ora è trasparente e le fasce `.alt` lasciano trasparire appena la texture.
  - **Vaso 3D in apertura**, in WebGL scritto a mano (circa 300 righe in `main.js`, nessuna libreria). Stessa forma e stessa texture "trama" del disegno 2D, 150 strati con solco e cresta. Si stampa strato per strato con lo strato in corso in bronzo, poi ruota piano, guarda verso il mouse e si gira trascinando col dito (scorrimento verticale della pagina invariato). "Ristampa" funziona ancora. Movimento ridotto: vaso intero e fermo. Senza WebGL (o se la scheda grafica si ferma) torna il disegno 2D di prima.
  - **Perché niente three.js**: il titolare l'aveva autorizzato, ma pesa circa 600 KB e da questa sessione cdnjs non era raggiungibile, quindi non potevo provarlo né calcolarne l'impronta (SRI). Con WebGL diretto il vaso pesa pochi KB, si prova qui ed è più leggero sui telefoni. Se il titolare preferisce comunque three.js si può passare dopo.
- Lasciato allo sviluppatore:
  - prestazioni del 3D (già fatti: meno dettaglio e densità 1,5 sotto i 600 px, pausa quando il vaso è fuori schermo): manca il ripiego al 2D su telefoni lenti; da provare su un telefono vero;
  - profondità leggera nel resto della pagina (vedi lista);
  - su 400 px la riga "900 strati · 180 mm · modalità vaso" va a capo sotto il vaso: c'era già prima, da sistemare se lo ritieni utile.
- Esito della revisione precedente: nessun problema trovato sulle animazioni allo scorrimento, favicon e meta tag (vedi registro).

## Lista migliorie

Una riga per miglioria, la prima in alto è la più importante. Tra parentesi quadre il ruolo che la prende.

- [x] [designer] **Nuova priorità del titolare (28/10, sera)**: sito più futuristico e minimale, più accattivante ma sempre professionale.
  - Sfondo con la texture di un filamento: **il titolare lascia la scelta al designer** (che filamento, quanto visibile). Deve restare discreta, dietro ai contenuti, leggibile in chiaro e scuro.
  - **Vaso 3D vero in apertura** che ruota e segue il mouse o il dito. Il titolare **autorizza una libreria 3D** (per esempio three.js da cdnjs, versione fissa): è l'unica eccezione alla regola "niente librerie".
  - Restano fissi: nome, logo, caratteri, accento bronzo, testi. Movimento ridotto: tutto fermo e visibile.
  - Fatto: texture di filamento e vaso 3D in WebGL senza librerie (vedi "Settimana in corso").
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
- 2026-10-28 · designer · Texture di filamento sullo sfondo e vaso 3D in apertura (WebGL senza librerie, ripiego 2D), PR #1 di nuovo in bozza.
