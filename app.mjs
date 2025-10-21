import 'dotenv/config'; // Load environment variables from .env file
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { ObjectId } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uri = process.env.MONGO_URI;
console.log("ENV works", uri);

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Keep a single connection open and reuse it
let db;
async function start() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Connected to MongoDB!");
        db = client.db(process.env.DB_NAME || 'Cluster0');
    } catch (err) {
        console.error('Mongo connection failed:', err);
        process.exit(1);
    }
}
await start();

app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the "public" directory
app.use(express.json()); // Parse JSON bodies

// API to save a flashcard set
app.post('/api/flashcard-sets', async (req, res) => {
    console.log('Received data:', req.body);
    try {
        const { title, description, cards } = req.body;
        if (!title || !Array.isArray(cards)) {
            return res.status(400).json({ error: 'title and cards[] are required' });
        }
        const cleanedCards = cards
            .map((c, i) => ({
                term: String(c?.term || '').trim(),
                definition: String(c?.definition || '').trim(),
                order: i,
            }))
            .filter(c => c.term || c.definition);

        if (cleanedCards.length === 0) {
            return res.status(400).json({ error: 'cards must include at least one term/definition' });
        }
        // Prepare the document to insert into the database 
        const doc = {
            title: String(title).trim(),
            description: String(description || '').trim(),
            cards: cleanedCards,
            createdAt: new Date(),
        };

        const result = await db.collection('flashcardSets').insertOne(doc);
        res.status(201).json({ id: String(result.insertedId) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'failed to save set' });
    }
});

// API to list flashcard sets
app.get('/api/flashcard-sets', async (req, res) => {
    try {
        const { q, limit = 20, skip = 0 } = req.query;
        // Build the filter based on the search query
        const filter = {};
        if (q && String(q).trim()) {
            const term = String(q).trim();
            filter.$or = [
                { title: { $regex: term, $options: 'i' } },
                { description: { $regex: term, $options: 'i' } },
                { 'cards.term': { $regex: term, $options: 'i' } },
                { 'cards.definition': { $regex: term, $options: 'i' } },
            ];
        }

        const col = db.collection('flashcardSets');
        const [itemsRaw, total] = await Promise.all([
            col.find(filter, { projection: { cards: 0 } })
                .sort({ createdAt: -1 })
                .skip(Number(skip) || 0)
                .limit(Math.min(Number(limit) || 20, 100))
                .toArray(),
            col.countDocuments(filter),
        ]);

        // Normalize _id to id string for the client
        const items = itemsRaw.map(({ _id, ...rest }) => ({ id: String(_id), ...rest }));

        res.json({ items, total });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'failed to list sets' });
    }
});

// API to get a single flashcard set by ID
app.get('/api/flashcard-sets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'invalid id' });
        }
        const col = db.collection('flashcardSets');
        const set = await col.findOne({ _id: new ObjectId(id) });
        if (!set) return res.status(404).json({ error: 'Set not found' });
        res.json({ title: set.title, description: set.description, cards: set.cards });
    } catch (e) {
        res.status(500).json({ error: 'failed to fetch set' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'miniapp.html'));
});

process.on('SIGINT', async () => { await client.close(); process.exit(0); });
process.on('SIGTERM', async () => { await client.close(); process.exit(0); });

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// API to update an existing flashcard set
app.patch('/api/flashcard-sets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
        const { title, description, cards } = req.body || {};

        if (!title || !Array.isArray(cards)) {
            return res.status(400).json({ error: 'title and cards[] are required' });
        }
        // Clean and validate cards
        const cleanedCards = cards
            .map((c, i) => ({
                term: String(c?.term || '').trim(),
                definition: String(c?.definition || '').trim(),
                order: i,
            }))
            .filter(c => c.term || c.definition);

        if (cleanedCards.length === 0) {
            return res.status(400).json({ error: 'cards must include at least one term/definition' });
        }
        // Prepare the update document
        const update = {
            $set: {
                title: String(title).trim(),
                description: String(description || '').trim(),
                cards: cleanedCards,
                updatedAt: new Date(),
            }
        };

        const col = db.collection('flashcardSets');
        const result = await col.updateOne({ _id: new ObjectId(id) }, update);
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Set not found' });
        res.json({ id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'failed to update set' });
    }
});

// API to delete a flashcard set
app.delete('/api/flashcard-sets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
        const col = db.collection('flashcardSets');
        const result = await col.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Set not found' });
        res.status(204).send();
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'failed to delete set' });
    }
});