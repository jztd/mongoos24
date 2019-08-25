const express = require('express');
const sqlite3 = require('sqlite3');
const fetch = require('node-fetch');
const PORT = 5001;


let app = express();

let database = new sqlite3.Database('./item.db', (error) => {
    if(error) {
        console.log('Problem initilizing database, run databaseBuilder first');
    }
    console.log('connected to database');
});


app.get('/item', (req, res) => {
    console.log(req.query.name);
    let itemSelect = `SELECT name, description, type, icon, id FROM item WHERE name = ? COLLATE NOCASE;`;
    database.all(itemSelect,[req.query.name], (error, rows) => {
        if(rows && rows.length > 0) {
            res.send(JSON.stringify(rows[0]));
        } else {
            res.send("could not find item");
        }
    });
});

app.get('/allNames', (req, res) => {
    database.all(`SELECT DISTINCT name FROM item ORDER BY name`, (error, rows) => {
        if (rows.length !== 0) {
            res.send(JSON.stringify(rows.reduce((nameList, row) => {
                nameList.push(row.name);
                return nameList;
            }, [])));
        }
    });
});

app.get('/price', (req, res) => {
    let itemSelect = `SELECT id, date, daily, average FROM priceEntry WHERE id = ?;`;
    database.all(itemSelect, [req.query.id], (error, rows) => {
        res.send(JSON.stringify(rows));
    });
});

app.listen(PORT, () => console.log(`running on port ${PORT}`) );