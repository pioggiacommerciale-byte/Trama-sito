# Bacheca del team

Qui designer, sviluppatore e revisore si passano il lavoro. Ognuno la legge all'inizio del turno e la aggiorna alla fine. Il titolare può scriverci quando vuole: nuove migliorie, risposte, priorità.

## Settimana in corso

- Branch: `settimana/2026-44`
- Pull request: PR_LINK (bozza)
- Stato: designer fatto, tocca allo sviluppatore
- Lasciato allo sviluppatore: provare la comparsa allo scorrimento su Safari e Firefox (lì la barra dei passi usa la versione con IntersectionObserver); controllare che l'animazione d'apertura del titolo non peggiori il caricamento percepito (LCP) su telefono lento; se serve, accorciarla o toglierla dal titolo.

## Lista migliorie

Una riga per miglioria, la prima in alto è la più importante. Tra parentesi quadre il ruolo che la prende.

- [x] [designer] **Priorità del titolare (28/10)**: animazioni mentre si scorre la pagina. Le sezioni devono comparire e sfumare con effetti di transizione curati; bottoni e link cliccabili con un effetto al passaggio del mouse (e al tocco su telefono). Obiettivo: un sito dall'aspetto professionale, non vistoso. Partire da ciò che esiste in `assets/styles.css` (sezione "movimento") e rispettare il movimento ridotto.
- [ ] [designer] Menu su telefono: sotto gli 860 px i link alle sezioni spariscono. Proporre un menu compatto.
- [ ] [sviluppatore] Favicon con la T di Trama e meta tag per la condivisione (Open Graph).
- [ ] [designer] Sezione Forme: preparare lo spazio per le foto vere (formato, didascalie), senza inventare foto.
- [ ] [sviluppatore] Dati strutturati di base per Google: solo nome e descrizione, niente indirizzi o telefoni finché il titolare non li conferma.
- [ ] [revisore] Controllo completo di contrasto e testi del sito attuale.

## Domande per il titolare

- Quali contatti mostrare: email, WhatsApp, Instagram? (vedi `BRIEF.md`)

## Registro

- 2026-10-28 · setup · Prima versione del sito e ruoli del team (designer, sviluppatore, revisore).
- 2026-10-28 · designer · Animazioni allo scorrimento e effetti al passaggio/tocco su bottoni e link (branch settimana/2026-44, PR in bozza).
