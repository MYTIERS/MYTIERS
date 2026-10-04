const express = require('express');
const app = express();
app.use(express.json());

let tierResults = [];

app.post('/api/setrank', (req, res) => {
    const { discordId, username, gamemode, tier } = req.body;
    
    const existingIndex = tierResults.findIndex(item => item.discordId === discordId && item.gamemode === gamemode);
    if (existingIndex !== -1) {
        tierResults[existingIndex].tier = tier;
    } else {
        tierResults.push({ discordId, username, gamemode, tier });
    }

    console.log(`Updated rank for ${username}: ${tier} in ${gamemode}`);
    res.status(200).send({ success: true });
});

app.get('/api/results', (req, res) => {
    res.json(tierResults);
});

app.listen(3000, () => {
    console.log('Web server is running on port 3000');
});
