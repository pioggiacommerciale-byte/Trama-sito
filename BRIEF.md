# Trama — regole del marchio e del sito

Questo file è il punto di riferimento per chiunque modifichi il sito, persone o agenti. Va letto prima di ogni modifica.

## Chi siamo

Trama è una piccola azienda di stampa 3D. Realizziamo oggetti su misura, pensati per ogni singolo cliente, e puntiamo sulla **varietà**: il sito non deve sembrare un negozio di vasi.

- statuette ricavate da una foto;
- quadri;
- vasi e lampade, con forme generate su misura e texture scritte nel G-code;
- bomboniere e segnaposti, anche in piccole serie per eventi;
- giochi e giocattoli;
- pezzi unici su richiesta.

## Il messaggio

1. Tutto parte dal cliente: un'idea, una foto o uno schizzo. **Non serve un file 3D.**
2. Il sito spiega cosa facciamo e come lavoriamo. Non è un negozio: la sezione Catalogo mostra un esempio per tipo di oggetto (vaso, statuetta, lampada, bomboniera), non prodotti a scaffale.
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

## Foto dei lavori (sezione Catalogo)

Ogni scheda del catalogo ha una cornice verticale 3:4 pronta per una foto vera. Finché la foto non c'è, resta il disegno con l'etichetta "disegno". Mai foto prese da altri, generate o di oggetti non stampati da Trama.

- **Formato**: verticale 3:4, 1200 × 1600 px. Si può scattare col telefono e ritagliare.
- **File**: WebP o JPEG, sotto i 250 KB, in `assets/lavori/`, nome semplice tipo `vaso-1.webp`. Della stessa foto serve anche una copia piccola da 600 × 800 px per i telefoni, con `-600` nel nome (`vaso-1-600.webp`, sotto gli 80 KB).
- **Scatto**: un oggetto per foto, intero e centrato, con un po' di margine attorno. Fondo neutro e liscio (grigio chiaro, carta, legno chiaro), luce naturale laterale che faccia vedere gli strati. Niente scritte né filigrane sopra.
- **Didascalia**: nome dell'oggetto in grassetto, sotto una riga in mono con soli dati veri del pezzo fotografato: materiale, misure, trama (es. "PETG · 180 mm · trama Diamanti").
- **Testo alternativo**: una frase su cosa si vede ("Vaso alto grigio con trama a diamanti, illuminato di lato").
- Come inserirla: c'è un esempio pronto nel commento sopra il catalogo in `index.html`.

## Da confermare con il titolare

- [ ] Email, WhatsApp e Instagram per i contatti (il modulo si attiva impostando `data-to` sul form in `index.html`)
- [ ] Zona servita e spedizioni
- [ ] Materiali offerti (nel sito ora: PLA, PETG, PETG con fibra di carbonio)
- [ ] Prezzo comunicato insieme all'anteprima, prima della stampa
- [ ] Foto dei lavori reali per il Catalogo (formato e regole qui sopra, in "Foto dei lavori")
- [ ] Dominio e hosting
