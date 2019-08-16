const express = require('express');
const sqlite3 = require('sqlite3');
const fetch = require('node-fetch');
const PORT = 5000;
const categoriesApi = "https://services.runescape.com/m=itemdb_rs/api/catalogue/items.json?";

var app = express();

let database = new sqlite3.Database('./items.db', (error) => {
    if(error) {
        console.log('Yo there was an error connecting to the database, you probably want to set that up first');
    }
    
    console.log('connected to database');
});

handlePageResponse = (page) => {
    //console.log(page);
}
getPage = (category, letter, pageNum) => {
    console.log(categoriesApi + `category=${category}&alpha=${letter}&page=${pageNum}`);
    fetch(categoriesApi + `category=${category}&alpha=${letter}&page=${pageNum}`)
        .then( (response) => {
            response.json()
                .then((page) => {
                    console.log(`in response ${page.items.length}`);
                    handlePageResponse(page);
                    if(page.items.length === 12 && page.items.length) {
                        console.log("getting another page");
                        getPage(category, letter, pageNum + 1);
                    } 
                })
                .catch((error) => { console.log(error)})
        }
        )
        .catch((error) => {console.log(error)});
 // get a single page and parse it, call yourselve recursivly
}

getCategory = (category) => {
    // call getPage for each letter
    // i was lazy so this is looping over the char values of a-z it's probably slow idc this whole thing is slow
    for(let i = 97; i <= 97 ; i++) {
        getPage(category, String.fromCharCode(i), 1);
    }
}

getAllTheItems = () => {
    console.log('Building item database');
    console.log('You might want to go do something else for awhile');
    console.log('seriously this probably takes 30 minutes');

    for(let i = 0; i <= 0; i++) {
        getCategory(i);
    }

}
getAllTheItems();

app.get('/', (req, res) => {
    res.send('GOTEM!');
});

app.get('/item', (req, res) => {
    console.log('got a request for item');
    console.log(req.query);
    res.send('got em!');
});

app.get('/allNames', (req, res) => {
    database.all(`SELECT DISTINCT name FROM item ORDER BY name`, (error, rows) => {
            if(rows.length !== 0) {
                res.send(JSON.stringify(rows));
            } else {
                getAllTheItems();
                database.all(`SELECT DISTINCT name FROM item ORDER BY name`, (error, rows) => {
                    res.send(JSON.stringify(rows));
                });
            }
        }
    );
});

app.listen(PORT, () => console.log(`running on port ${PORT}`) );