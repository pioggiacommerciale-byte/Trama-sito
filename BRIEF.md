# Trama — regole del marchio e del sito

Questo file è il punto di riferimento per chiunque modifichi il sito, persone o agenti. Va letto prima di ogni modifica.

## Chi siamo

Trama è una piccola azienda di stampa 3D. Realizziamo oggetti su misura, pensati per ogni singolo cliente:

- vasi e lampade, con forme generate su misura e texture scritte nel G-code;
- bomboniere e piccole serie per eventi;
- statuette ricavate da una foto;
- pezzi unici su richiesta.

## Il messaggio

1. Tutto parte dal cliente: un'idea, una foto o uno schizzo. **Non serve un file 3D.**
2. Il sito spiega cosa facciamo e come lavoriamo. Non è un negozio: la sezione Forme mostra esempi, non prodotti a scaffale.
3. La nostra firma sono le texture scritte direttamente nel percorso dell'ugello (G-code), strato per strato, in modalità vaso.

## Marchio

- **Nome**: Trama. Sempre con la T maiuscola e il resto minuscolo, anche nei titoli.
- **Logo**: Archivo, larghezza 125 (Expanded), peso 800, spaziatura -0.01em, interlinea 1. È la stessa scritta di Trama G-code Studio.
- **Titoli**: Archivo, larghezza 112, peso 700-800.
- **Testo**: IBM Plex Sans 400/500/600.
- **Dati e didascalie tecniche**: IBM Plex Mono (strati, millimetri, parametri).
- **Colori**: neutri minerali freddi e un solo accento bronzo, riservato alle azioni principali e allo strato in stampa. Tutti i colori sono token in `assets/styles.css` (`:root`), con versione chiara e scura.

## Tono

- Italiano semplice, frasi brevi, si dà del tu al visitatore.
- Concreto: misure vere (mm, strati, ugello 0,4), materiali veri.
- Da evitare: superlativi vuoti ("innovativo", "rivoluzionario", "eccellenza"), emoji, inglesismi inutili, frasi fatte.

## Regole per chi modifica il sito

- Il sito è statico, senza build: `index.html`, `assets/styles.css`, `assets/main.js`.
- Ogni colore passa dai token. Ogni modifica deve funzionare su telefono (400 px di larghezza) e nel tema scuro.
- Le animazioni rispettano `prefers-reduced-motion`: con il movimento ridotto il contenuto è completo e fermo.
- Una modifica alla volta, su un branch, con una pull request che il titolare approva. Mai modifiche dirette su `main`.
- **Non inventare dati**: prezzi, tempi di consegna, recensioni, clienti, indirizzi, numeri di telefono. Se servono e mancano, vanno chiesti al titolare e annotati qui sotto.

## Da confermare con il titolare

- [ ] Email, WhatsApp e Instagram per i contatti (il modulo si attiva impostando `data-to` sul form in `index.html`)
- [ ] Zona servita e spedizioni
- [ ] Materiali offerti (nel sito ora: PLA, PETG, PETG con fibra di carbonio)
- [ ] Prezzo comunicato insieme all'anteprima, prima della stampa
- [ ] Foto dei lavori reali per la sezione Forme
- [ ] Dominio e hosting
