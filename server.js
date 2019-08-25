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
                             CREATE TABLE IF NOT EXISTS price(\
                             id INTEGER NOT NULL,\
                             date INTEGER NOT NULL,\
                             daily INTEGER NOT NULL,\
                             average INTEGER NOT NULL,\
                             PRIMARY KEY (id, date),\
                             FOREIGN KEY (id) REFERENCES item(id)\
                             )";
const insertItemSQL = "INSERT INTO item (id, name, description, type, icon) VALUES ";
const insertPriceSQL = "INSERT INTO price (id, date, daily, average) VALUES ";
let app = express();

let database = new sqlite3.Database('./items.db', (error) => {
    if(error) {
        console.log('Yo there was an error connecting to the database, you probably want to set that up first');
    }
    database.run(createTableSQL);
    console.log('connected to database');
});

let priceEntry = new sqlite3.Database('./items.db', (error) => {
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
     //console.log(`Length of dailyKeys BEFORE:\t${dailyKeys.length}`);

     //Run comparison of current data, return only new data
     /*let newdailyKeys = function(callback) {
         database.all(`SELECT date FROM price WHERE id = ?`, [id], (error, rows) => {
            rows.forEach(row => {
                //we juse need to compare the dates (row.date)
                for (let index = 0; index < dailyKeys.length; index++) {
                    console.log(`dailyKeys[${index}] = ${dailyKeys[index]}\t\trow.date = ${row.date}`);
                    if (dailyKeys[index] == row.date) {
                        console.log(`ATTEMPING TO REMOVE ${dailyKeys[index]} FROM INDEX ${index}`);
                        dailyKeys = dailyKeys.splice(index, 1);
                        break;
                    }
                }
            });
            callback(dailyKeys);
        });
     }
    console.log(`Length of newdailyKeys = ${newdailyKeys.length}`,newdailyKeys);
     console.log(`Length of dailyKeys AFTER:\t${dailyKeys.length}`);*/


     let timeStrings = dailyKeys.reduce((list, key) => {
        list.push(`(${id}, ${parseInt(key)}, ${pricePage.daily[key]}, ${pricePage.average[key]})`);
        return list;
    }, []);
     
     let insertStatment = insertPriceSQL + timeStrings.join(',');

     priceEntry.run(insertStatment, (error) => {
         if (error) {
             console.log("SQL ERROR:\t" + error);
         }
     });

 }

 getPrice = async(idList, index, retry) => {
     let apiResponse = await fetch(graphApi + `${idList[index]}` + '.json').then(response => response.json()).catch((error) => {
        console.log(`HAD AN ISSUE GETTING PRICE INFORMATION FOR ITEM #${idList[index]}!\r${error}`);
        console.log(`RESENDING PRICING QUERY FOR ${idList[index]}`);
        retry = true;
    });
     
    if (retry) {
        getPrice(idList, index, false);
        return;
    }

     await handlePriceResponse(apiResponse, idList[index]);
     console.log(`Finished storing prices for item #${idList[index]}`);

     if (idList.length - 1 > index) {
        getPrice(idList, index + 1);
     } else if (idList.length - 1 === index) {
        console.log("DONE RETREIVING ALL OF THE PRICING INFORMATION!")
     }
     return;
 }

 getAllThePrices = () => {
     database.all(`SELECT id FROM item`, (error, rows) => {
         let arr = [];

         arr = rows.reduce((acc, row) => {
             //console.log(row,row.id);
             acc.push(row.id);
             return acc;
         }, []);

         getPrice(arr, 0, false);
     });
 }

 getAllThePrices();

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
    let itemSelect = `SELECT name, description, type, icon, id FROM item WHERE name = ? COLLATE NOCASE;`;
    database.all(itemSelect, [req.query.name], (error, rows) => {
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
    let itemSelect = `SELECT id, date, daily, average FROM item WHERE id = ?;`;
    priceEntry.all(itemSelect, [req.query.id], (error, rows) => {
        res.send(JSON.stringify(rows));
    });
});

app.listen(PORT, () => console.log(`running on port ${PORT}`) );