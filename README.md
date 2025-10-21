# MiniApp — Flashcard Sets — Robert Martin

A small web app (inspired by Quizlet) that lets users create flashcard sets by specifying a title, optional description, and multiple cards with a term and definition. Users can view previous sets, edit them inline, or delete them.

## Features
- Create flashcard sets with title, description, and any number of cards
- Inline edit and update existing sets
- View list of saved sets
- Delete sets
- REST API backed by MongoDB

## Tech Stack
- Node.js + Express
- MongoDB (official Node driver)
- Vanilla JavaScript frontend

## Prerequisites
- Node.js 18+ (ES modules and top-level await)
- A MongoDB connection string

Check versions:
```powershell
node -v
npm -v
```

## Setup
1. Install dependencies:
   ```powershell
   cd c:\Users\rmartin8\mini-app
   npm install
   ```
2. Create a `.env` file in the project root:
   ```env
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority&appName=<appName>
   DB_NAME=Cluster0
   PORT=3000
   ```
3. Start the server:
   - If you have an npm start script:
     ```powershell
     npm start
     ```
   - Or run directly:
     ```powershell
     node app.mjs
     ```

Open http://localhost:3000 to use the app.

## Usage
- Create: Add cards and click Save to create a new set.
- View: Use the list to load set details.
- Edit: Click Edit in the set details, change fields/cards, then Save Changes.
- Delete: Click Delete in the set details.

## API Overview
Base URL: http://localhost:3000

- List sets (no cards in payload):
  - GET `/api/flashcard-sets`
  - Response:
    ```json
    { "items": [{ "id": "64...", "title": "Biology", "description": "...", "createdAt": "..." }], "total": 1 }
    ```

- Get a set by id:
  - GET `/api/flashcard-sets/:id`
  - Response:
    ```json
    { "title": "Biology", "description": "...", "cards": [{ "term": "Cell", "definition": "..." }] }
    ```

- Create a set:
  - POST `/api/flashcard-sets`
  - Body:
    ```json
    { "title": "Biology", "description": "Basics", "cards": [{ "term": "Cell", "definition": "Unit of life" }] }
    ```
  - Response:
    ```json
    { "id": "64..." }
    ```

- Update a set:
  - PATCH `/api/flashcard-sets/:id`
  - Body (same shape as create)
  - Response:
    ```json
    { "id": "64..." }
    ```

- Delete a set:
  - DELETE `/api/flashcard-sets/:id`
  - Response: 204 No Content

## Environment Variables
- `MONGO_URI` — Mongo connection string
- `DB_NAME` — Database name (default: `Cluster0`)
- `PORT` — Server port (default: `3000`)

# How to use
## Create flashcards
1. Enter a title for Flashcards set (required)
2. Add Term | Definition to flashcard
3. Click Add card to add another card
4. Click "create" to save the flashcard set
## View, Modify, and Delete flashcards
To view created flashcard sets, click the link at the top of the page
To modify flashcard sets:
1. Click on the flashcard set
2. Click the edit button
3. Change the text inline or delete the button on the card
4. Click save
To delete flashcard sets, on the same page
1. Click on the flashcard set
2. Click the delete button

