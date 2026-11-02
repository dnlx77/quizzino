# 🧠 Quizzino — Smart Flashcards & Quiz Platform

**Quizzino** è una web application full-stack moderna ispirata a Quizlet e Anki per lo studio tramite flashcard interattive, algoritmi di ripetizione dilazionata (SM-2) e modalità di gioco coinvolgenti.

---

## 🌟 Funzionalità Principali

- 🃏 **Flashcard 3D**: Studio visivo con animazione di flip 3D, supporto text-to-speech per la pronuncia e classificazione delle carte conosciute vs da ripassare.
- 🎯 **Modalità Impara (Quiz Adattivo)**: Domande a scelta multipla, Vero/Falso e risposta scritta intelligente (supporto sinonimi e significati multipli).
- ⚡ **Modalità Abbina (Match Game)**: Sfida a tempo contro il cronometro per accoppiare termine e definizione.
- 🧩 **Modalità Blocchi (Block Puzzle)**: Ispirata alla celebre modalità a blocchi di Quizlet: posiziona forme su una griglia 8x8, distruggi righe/colonne e sblocca nuovi pezzi superando il *Question Time*.
- 📈 **Algoritmo SM-2 (Spaced Repetition)**: Calcolo automatico degli intervalli ottimali di ripasso per consolidare la memoria a lungo termine.
- 🤖 **Generatore AI**: Creazione automatica di mazzi e carte a partire da testi o appunti tramite Google Gemini API.
- 💾 **Dual Storage**: Funziona offline salvando i dati su memoria locale (`localStorage`), con sincronizzazione su database **MariaDB** quando autenticati.

---

## 🏗️ Architettura & Stack Tecnologico

- **Frontend**:
  - React 18 + TypeScript + Vite
  - Tailwind CSS v4 (design responsive mobile-first, Dark Mode nativa)
  - Lucide React & Canvas Confetti
- **Backend**:
  - PHP 8.2 (REST API orientata agli oggetti con pattern MVC)
  - MariaDB / MySQL (PDO con prepared statements sicuri)
  - Autenticazione basata su JWT (JSON Web Token)

---

## 🚀 Installazione & Avvio

### 1. Database (MariaDB / MySQL)
Importa lo schema presente in `backend/database/schema.sql` all'interno del tuo server MySQL/MariaDB:
```sql
mysql -u root -p < backend/database/schema.sql
```

### 2. Backend (PHP)
Configura un VirtualHost Apache (es. `quizzino-api.locale.it`) che punti a `backend/public/`:
- DocumentRoot: `backend/public`
- PHP 8.2+ con estensione `pdo_mysql` abilitata.

### 3. Frontend (React + Vite)
All'interno della cartella `frontend/`:
```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Per la build di produzione
npm run build
```

---

## 📄 Licenza
Progetto distribuito con licenza MIT.
