const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');

const app = express();
app.use(cors());
app.use(express.json());

// --- НАСТРОЙКИ (ЗАПОЛНИ ИХ) ---
const BOT_TOKEN = 'ТВОЙ_ТОКЕН_ОТ_BOTFATHER';
const MONGO_URI = 'ТВОЯ_ССЫЛКА_ИЗ_MONGODB_ATLAS';
const FRONTEND_URL = 'ССЫЛКА_ОТ_VERCEL'; 

mongoose.connect(MONGO_URI).then(() => console.log("MongoDB Connected"));

const userSchema = new mongoose.Schema({
    tgId: { type: String, unique: true },
    username: String,
    balance: { type: Number, default: 0 },
    passiveIncome: { type: Number, default: 0 },
    lastSync: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Бот
const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => {
    ctx.reply('Привет! Жми кнопку, чтобы войти в игру:', Markup.inlineKeyboard([
        Markup.button.webApp('Играть 🐹', FRONTEND_URL)
    ]));
});
bot.launch();

// API
app.post('/api/user', async (req, res) => {
    const { tgId, username } = req.body;
    let user = await User.findOne({ tgId });
    if (!user) user = await User.create({ tgId, username });
    
    const now = Date.now();
    const secondsOff = Math.floor((now - new Date(user.lastSync).getTime()) / 1000);
    user.balance += secondsOff * user.passiveIncome;
    user.lastSync = now;
    await user.save();
    res.json(user);
});

app.post('/api/save', async (req, res) => {
    const { tgId, balance, passiveIncome } = req.body;
    await User.updateOne({ tgId }, { balance, passiveIncome, lastSync: new Date() });
    res.json({ ok: true });
});

app.get('/api/leaderboard', async (req, res) => {
    const top = await User.find().sort({ balance: -1 }).limit(10);
    res.json(top);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));