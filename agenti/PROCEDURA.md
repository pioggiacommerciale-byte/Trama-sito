# Procedura comune dei turni

Vale per designer, sviluppatore e revisore. Ogni turno parte da zero: la memoria del team sono questo repository e la bacheca.

## 1. Preparare il lavoro

```bash
git fetch origin
SETTIMANA=$(date +%G-%V)                 # anno e settimana ISO, es. 2026-44
BRANCH="settimana/$SETTIMANA"
git ls-remote --heads origin "$BRANCH"   # esiste già?
```

- **Se il branch esiste**: `git checkout -B "$BRANCH" "origin/$BRANCH"`. La bacheca aggiornata è quella su questo branch.
- **Se non esiste**: parti da `main` aggiornato, `git checkout -B "$BRANCH" origin/main`. Lo apre di solito il designer; se tocca a te, aprilo tu.

Poi leggi, in quest'ordine: `BRIEF.md`, `agenti/BACHECA.md`, il tuo ruolo in `.claude/agents/`.

## 2. Lavorare

- Una miglioria alla volta, piccola e verificabile.
- Prima di ogni commit: nessun errore nella console, nessuno scorrimento orizzontale a 400 px, tema scuro corretto, movimento ridotto rispettato.
- Messaggi di commit in italiano, chiari.
- La bacheca si aggiorna **sul branch della settimana**, nello stesso commit o in uno successivo.
- Mai `push` su `main`, mai `force-push`.

```bash
git push -u origin "$BRANCH"
```

## 3. Pull request (solo API REST)

`gh pr create` non funziona da queste sessioni (GraphQL non disponibile). Usa l'API REST:

```bash
R=pioggiacommerciale-byte/trama-sito

# c'è già una pull request per il branch?
gh api "repos/$R/pulls?head=pioggiacommerciale-byte:$BRANCH&state=open" --jq '.[0].number'

# aprirla in bozza
gh api "repos/$R/pulls" -f title="Settimana $SETTIMANA: <titolo breve>" \
  -f head="$BRANCH" -f base=main -F draft=true -f body="<cosa cambia, perché, come verificarlo>"

# aggiornare titolo o descrizione
gh api -X PATCH "repos/$R/pulls/<N>" -f body="<nuova descrizione>"

# commento
gh api "repos/$R/issues/<N>/comments" -f body="<testo>"

# segnarla pronta (solo il revisore)
gh api -X POST "repos/$R/pulls/<N>/ccr/ready_for_review"
```

Nessuno unisce la pull request: lo fa il titolare.

## 4. Chiudere il turno

Scrivi nella bacheca, sotto "Settimana in corso": branch, numero della pull request, stato, cosa lasci al prossimo. Aggiungi una riga al registro con data, ruolo e risultato.
