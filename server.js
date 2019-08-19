const express = require('express');
const sqlite3 = require('sqlite3');
const fetch = require('node-fetch');
const PORT = 5001;
const categoriesApi = "https://services.runescape.com/m=itemdb_rs/api/catalogue/items.json?";
const createTableSQL = "\
                        CREATE TABLE IF NOT EXISTS item(\
                        id INTEGER PRIMARY KEY,\
                        name VARCHAR(255),\
                        description TEXT,\
                        type VARCHAR(255),\
                        icon TEXT\
                        )";
const insertItemSQL = "INSERT INTO item (id, name, description, type, icon) VALUES ";
let app = express();

let database = new sqlite3.Database('./items.db', (error) => {
    if(error) {
        console.log('Yo there was an error connecting to the database, you probably want to set that up first');
    }
    database.run(createTableSQL);
    console.log('connected to database');
});

handlePageResponse = (page) => {
    if (!page.items || !page.items.length) {
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

app.listen(PORT, () => console.log(`running on port ${PORT}`) );