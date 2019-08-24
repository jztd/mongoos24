const express = require('express');
const sqlite3 = require('sqlite3');
const fetch = require('node-fetch');
const PORT = 5001;
const categoriesApi = "https://services.runescape.com/m=itemdb_rs/api/catalogue/items.json?";
const graphApi = "http://services.runescape.com/m=itemdb_rs/api/graph/";
const createTableSQL = "\
                        CREATE TABLE IF NOT EXISTS item(\
                        id INTEGER PRIMARY KEY,\
                        name VARCHAR(255),\
                        description TEXT,\
                        type VARCHAR(255),\
                        icon TEXT\
                        )";
const createPriceTableSQL = "\
                             CREATE TABLE IF NOT EXISTS item(\
                             id INTEGER,\
                             date INTEGER,\
                             daily INTEGER,\
                             average INTEGER,\
                             PRIMARY KEY (id, date)\
                             )";
const insertItemSQL = "INSERT INTO item (id, name, description, type, icon) VALUES ";
const insertPriceSQL = "INSERT INTO item (id, date, daily, average) VALUES ";
let app = express();

let database = new sqlite3.Database('./items.db', (error) => {
    if(error) {
        console.log('Yo there was an error connecting to the database, you probably want to set that up first');
    }
    database.run(createTableSQL);
    console.log('connected to database');
});

let priceEntry = new sqlite3.Database('./prices.db', (error) => {
    if (error) {
        console.log("Dude, where's my database?");
    }
    priceEntry.run(createPriceTableSQL);
    console.log('connected to price database');
});

handlePageResponse = (page) => {
    if (!page.daily || !page.items.length) {
        return;
    }

    let itemStrings = page.items.reduce((itemList, item) => {
        itemList.push(`(${item.id.toString()}, "${item.name.toString()}", "${item.description.toString()}", "${item.type.toString()}", "${item.icon_large.toString()}")`);
        return itemList;
    }, []);

    let insertStatment = insertItemSQL + itemStrings.join(',');
    
    database.run(insertStatment, (error) => {
        if (error) {
            console.log("SQL ERROR " + error);
        }
    });

 }

 handlePriceResponse = (pricePage, id) => {
     if (!pricePage) {
         return;
     }

     let dailyKeys = Object.keys(pricePage.daily);
     let timeStrings = dailyKeys.reduce((list, key) => {
         list.push(`(${id}, ${parseInt(key)}, ${pricePage.daily[key]}, ${pricePage.average[key]})`);
         return list;
     }, []);
     
     let insertStatment = insertPriceSQL + timeStrings.join(',');
     //console.log(insertPriceSQL + timeStrings.join(','));

     priceEntry.run(insertStatment, (error) => {
         if (error) {
             console.log("SQL ERROR" + error);
         }
     });

 }

 getPrice = (idList, index) => {
     fetch(graphApi + `${idList[index]}` + '.json').then(response => response.json()).then(result => {
         handlePriceResponse(result, idList[index]);
         getPrice(idList, index++);
         return;
     });
 }

 getAllThePrices = () => {
     //GRAB ID'S FROM ITEM DATABASE HERE
     //let ids = ......
     getPrice(ids, 0);
 }

 //getAllThePrices();

getPage = (category, letter, pageNum) => {
    fetch(categoriesApi + `category=${category}&alpha=${letter}&page=${pageNum}`).then((response) => response.json()).then((result) => {
        handlePageResponse(result);
        if (result.items.length !== 12) {
            return;
        }
        getPage(category, letter, pageNum + 1);
    })
    .catch((error) => {console.log(" PROBLEM WITH THIS MOTHERFUCKER " + letter + "---------" + error
    )});
}
    
getCategory = (category) => {
    for (let i = 97; i < 123; i++) {
        setTimeout(() => { getPage(category, String.fromCharCode(i), 1) }, 1000 * (i - 96));
    }
}

getAllTheItems = () => {
    for (let i = 0; i < 38; i++) {
        setTimeout(() => { getCategory(i) }, 27000 * i);
    }
}


//getAllTheItems();

app.get('/', (req, res) => {
    res.send('GOTEM!');
});

app.get('/item', (req, res) => {
    let itemSelect = `SELECT name, description, type, icon, id FROM item WHERE name = "${unescape(req.query.name)}" COLLATE NOCASE;`;
    database.all(itemSelect, (error, rows) => {
        if(rows && rows.length > 0) {
            res.send(JSON.stringify(rows[0]));
        } else {
            res.send("could not find item");
        }
    });
});

// localhost:5000/getNames
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

//Gotta grab that pricing information!
//Should ask jztd about the purpose of the unescape() expression
app.get('/price', (req, res) => {
    let itemSelect = `SELECT id, date, daily, average FROM item WHERE id = ${unescape(req.query.id)};`;
    priceEntry.all(itemSelect, (error, rows) => {
        res.send(JSON.stringify(rows));
    });
});

app.listen(PORT, () => console.log(`running on port ${PORT}`) );