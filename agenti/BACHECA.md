# Bacheca del team

Qui designer, sviluppatore e revisore si passano il lavoro. Ognuno la legge all'inizio del turno e la aggiorna alla fine. Il titolare può scriverci quando vuole: nuove migliorie, risposte, priorità.

## Settimana in corso

- Branch: `settimana/2026-44`
- Pull request: [#1](https://github.com/pioggiacommerciale-byte/trama-sito/pull/1) (pronta, in attesa del titolare)
- Stato: revisione finita (28/10, sera). Settimana chiusa: tocca al titolare approvare e unire.
- Fatto dal designer (28/10, sera):
  - **Texture di filamento** sullo sfondo: strati da 4 px che ondeggiano e invertono la fase ogni quattro, come la trama dei vasi (`assets/filo.svg`, usata come maschera). Colore dal token `--texture` (chiaro e scuro), sfuma verso il basso a sinistra, è fissa e non si anima. Il `body` ora è trasparente e le fasce `.alt` lasciano trasparire appena la texture.
  - **Vaso 3D in apertura**, in WebGL scritto a mano (circa 300 righe in `main.js`, nessuna libreria). Stessa forma e stessa texture "trama" del disegno 2D, 150 strati con solco e cresta. Si stampa strato per strato con lo strato in corso in bronzo, poi ruota piano, guarda verso il mouse e si gira trascinando col dito (scorrimento verticale della pagina invariato). "Ristampa" funziona ancora. Movimento ridotto: vaso intero e fermo. Senza WebGL (o se la scheda grafica si ferma) torna il disegno 2D di prima.
  - **Perché niente three.js**: il titolare l'aveva autorizzato, ma pesa circa 600 KB e da questa sessione cdnjs non era raggiungibile, quindi non potevo provarlo né calcolarne l'impronta (SRI). Con WebGL diretto il vaso pesa pochi KB, si prova qui ed è più leggero sui telefoni. Se il titolare preferisce comunque three.js si può passare dopo.
- Secondo turno del designer (28/10, fuori programma): la voce del 3D era già fatta, quindi ho preso la successiva, **menu su telefono**. Sotto gli 860 px c'è un bottone "Menu" (due linee che diventano una croce) che apre un pannello con i quattro link, grandi e facili da toccare. Si chiude toccando un link, con Esc o toccando fuori; `aria-expanded` aggiornato, il focus torna al bottone. Senza JavaScript i link restano visibili in una riga sotto il logo. Movimento ridotto: si apre senza animazione.
- Richiesta del titolare (28/10): alcuni testi erano troppo chiari. Scuriti i grigi dei testi secondari (`--ink-2`, `--ink-3`, `--inv-fg-2`; nel tema scuro schiariti) e attenuata un poco la texture. Ora tutti i testi secondari superano il contrasto AA (almeno 4,5:1) su sfondo, fasce alterne e riquadri: prima `--ink-3` nel tema chiaro era tra 3,5 e 3,9.
- Seconda richiesta del titolare (28/10): i testi secondari erano ancora troppo chiari. Ora sono quasi neri nel tema chiaro (`--ink-2` #283035, `--ink-3` #343D43, contrasto tra 8,8 e 11,8:1) e quasi bianchi nel tema scuro (#D0D7DB, #BCC5CB). Etichette in mono e didascalie delle forme a peso 500. La gerarchia ora la fanno dimensione e carattere più che il grigio: non schiarirli di nuovo senza chiedere al titolare.
- Terza segnalazione del titolare (foto da iPhone, tema scuro): il problema vero non erano i grigi ma lo **sfondo**. Avevo reso trasparente il `body` per la texture; l'anteprima (e qualunque pagina ospite) toglie il fondo di `html`, così in tema scuro i testi chiari finivano su fondo bianco. Corretto: fondo `var(--bg)` anche sul `body`, con `isolation: isolate` perché la texture resti sopra al fondo e sotto ai contenuti. Provato simulando l'ospite (fondo di html forzato a bianco): chiaro e scuro corretti.
- Lasciato allo sviluppatore (fatto, vedi sotto):
  - prestazioni del 3D (già fatti: meno dettaglio e densità 1,5 sotto i 600 px, pausa quando il vaso è fuori schermo): manca il ripiego al 2D su telefoni lenti; da provare su un telefono vero;
  - profondità leggera nel resto della pagina (vedi lista);
  - su 400 px la riga "900 strati · 180 mm · modalità vaso" va a capo sotto il vaso: c'era già prima, da sistemare se lo ritieni utile.
- Fatto dallo sviluppatore (28/10, notte):
  - **Ripiego al 2D su telefoni lenti**: il vaso 3D misura i suoi primi fotogrammi (saltando l'avvio e le pause); se la mediana supera 45 ms (sotto i 22 fotogrammi al secondo) torna al disegno 2D, una volta sola, e libera la scheda grafica. Con risparmio dati attivo, 2 GB di memoria o meno, o telefono a 2 core il 3D non parte proprio. Provato qui simulando un telefono lento: torna al 2D senza errori; a velocità normale resta in 3D.
  - **Profondità leggera** (solo con movimento non ridotto, e solo nei browser che legano le animazioni allo scorrimento: Chrome, Edge, Safari recenti; altrove tutto resta fermo): la texture di filamento scorre molto più piano della pagina (160 px su tutta la pagina); in apertura il testo esce un po' più in fretta e il vaso un po' più piano; titolo della fascia scura e primo piano della trama scartano di ±12 px; la scritta "Trama" in fondo sale mentre entra. Usa la proprietà `translate`, quindi non si somma con la comparsa delle sezioni.
  - **Schede delle forme** che si inclinano verso il mouse (massimo 5 gradi, con un'ombra leggera), solo con mouse e movimento non ridotto.
  - **Riga dei dati sotto il vaso** su 400 px: resta su una riga accanto a "Ristampa" (margini più stretti sotto i 480 px, al limite si taglia con i puntini invece di andare a capo).
  - Miglioria dalla lista: **dati strutturati** per Google (solo nome e descrizione, nessun contatto).
  - Nota per il designer: la texture ora si muove (piano) con lo scorrimento; era indicata come fissa. Se preferisci fissa basta togliere la regola `.filo` nel blocco "profondità leggera" di `styles.css`.
- Lasciato al revisore: provare su un telefono vero il 3D e il ripiego; da questa sessione i caratteri di Google non si caricano, quindi le misure della riga dei dati sono state fatte con i caratteri di riserva.
- Esito della revisione (28/10, sera): lette tutte le righe cambiate rispetto a `main`. Marchio, testi, token, contrasto, movimento ridotto, sicurezza: a posto. Provato a 400 e 1280 px, chiaro e scuro, con e senza movimento ridotto, menu (apertura, Esc, focus), comparsa allo scorrimento, 3D su schermo piccolo: nessun errore in console, nessuno scorrimento orizzontale.
  - Corretto un dettaglio: il menu su telefono usava `addEventListener` sulla media query senza controllo; sui Safari vecchi (iOS 13 e prima) avrebbe fermato lo script (modulo contatti compreso). Ora c'è il controllo, come per le altre media query.
  - Turno fuori programma (richiesta del titolare): riprovati i ripieghi a 400 px. Senza WebGL, con WebGL che dà errore, con la scheda grafica che si ferma e con risparmio dati: torna il disegno 2D, senza errori. Telefono lento simulato (fotogrammi da 66-110 ms): torna al 2D dopo circa 4-7 secondi, poi gira fluido. Movimento ridotto: vaso 3D intero e fermo, profondità e texture ferme, menu senza animazione.
  - Terza verifica (28/10, sera, revisore): riletti i commit dello sviluppatore e del designer, riprovati ripiego al 2D (fotogrammi lenti, 2 GB di memoria, risparmio dati), schede inclinabili, riga dei dati a 400 px su una riga, dati strutturati, sfondo del body in chiaro e scuro. Corretto un dettaglio: nel tema scuro l'ombra delle schede delle forme (e del pannello del menu) usava il colore del testo, quindi diventava un alone chiaro. Ora usa il nuovo token `--shadow` (scuro in entrambi i temi).
  - Ancora da fare a mano: provare il 3D e il ripiego su un iPhone vero e su un Android economico (da qui non c'è un telefono vero, e i caratteri di Google non si caricano).

## Lista migliorie

Una riga per miglioria, la prima in alto è la più importante. Tra parentesi quadre il ruolo che la prende.

- [x] [designer] **Nuova priorità del titolare (28/10, sera)**: sito più futuristico e minimale, più accattivante ma sempre professionale.
  - Sfondo con la texture di un filamento: **il titolare lascia la scelta al designer** (che filamento, quanto visibile). Deve restare discreta, dietro ai contenuti, leggibile in chiaro e scuro.
  - **Vaso 3D vero in apertura** che ruota e segue il mouse o il dito. Il titolare **autorizza una libreria 3D** (per esempio three.js da cdnjs, versione fissa): è l'unica eccezione alla regola "niente librerie".
  - Restano fissi: nome, logo, caratteri, accento bronzo, testi. Movimento ridotto: tutto fermo e visibile.
  - Fatto: texture di filamento e vaso 3D in WebGL senza librerie (vedi "Settimana in corso").
- [x] [sviluppatore] **Stessa richiesta, seconda parte**: profondità leggera nel resto della pagina (livelli che scorrono a velocità diverse, schede che si inclinano un poco al passaggio). Poi prestazioni del 3D su telefono: meno dettaglio su schermi piccoli, pausa quando il vaso è fuori schermo, ripiego statico se WebGL non c'è o il telefono è lento.
- [x] [designer] **Priorità del titolare (28/10)**: animazioni mentre si scorre la pagina. Le sezioni devono comparire e sfumare con effetti di transizione curati; bottoni e link cliccabili con un effetto al passaggio del mouse (e al tocco su telefono). Obiettivo: un sito dall'aspetto professionale, non vistoso. Partire da ciò che esiste in `assets/styles.css` (sezione "movimento") e rispettare il movimento ridotto.
- [x] [designer] Menu su telefono: sotto gli 860 px i link alle sezioni spariscono. Proporre un menu compatto. Fatto: bottone "Menu" con pannello (vedi "Settimana in corso").
- [x] [sviluppatore] Favicon con la T di Trama e meta tag per la condivisione (Open Graph). Mancano `og:url` e `og:image`, in attesa del dominio.
- [ ] [designer] Sezione Forme: preparare lo spazio per le foto vere (formato, didascalie), senza inventare foto.
- [x] [sviluppatore] Dati strutturati di base per Google: solo nome e descrizione, niente indirizzi o telefoni finché il titolare non li conferma. Fatto (JSON-LD in `index.html`); `url` si aggiunge col dominio.
- [x] [revisore] Controllo completo di contrasto e testi del sito attuale. Fatto nella revisione del 28/10 sera: testi secondari tutti sopra 4,5:1, testi in italiano corretti.

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
- 2026-10-28 · designer · Turno fuori programma: il 3D era già fatto, preso il menu su telefono (bottone "Menu" con pannello, ripiego senza JavaScript), PR #1 in bozza.
- 2026-10-28 · designer · Su richiesta del titolare: testi secondari più scuri (contrasto AA) e texture un poco più leggera.
- 2026-10-28 · designer · Su seconda richiesta del titolare: testi secondari molto più scuri (chiaro) e più chiari (scuro), etichette mono a peso 500.
- 2026-10-28 · designer · Corretto lo sfondo del body (in tema scuro i testi finivano su fondo bianco nell'anteprima).
- 2026-10-28 · sviluppatore · Ripiego al 2D su telefoni lenti, profondità leggera allo scorrimento, schede delle forme inclinabili, riga dei dati su una riga a 400 px, dati strutturati (nome e descrizione). PR #1 in bozza, tocca al revisore.
- 2026-10-28 · revisore · Revisione finale della settimana 2026-44: un dettaglio corretto (menu su Safari vecchi), nessun problema grande, pull request #1 segnata pronta.
- 2026-10-28 · revisore · Turno fuori programma: riprovati prestazioni su telefono, movimento ridotto e ripieghi senza WebGL. Tutto a posto, nessuna modifica al sito, PR #1 resta pronta.
- 2026-10-28 · revisore · Terza verifica: ombra delle schede e del menu non più chiara nel tema scuro (nuovo token `--shadow`). PR #1 resta pronta.
