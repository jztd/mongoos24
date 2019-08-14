const express = require('express');
const PORT = 5000;

var app = express();

app.get('/', (req, res) => {
    res.send('GOTEM!');
});

app.get('/item', (req, res) => {
    console.log('got a request for item');
    console.log(req.query);
    res.send('got em!');
})

app.listen(PORT, () => console.log(`running on port ${PORT}`) );