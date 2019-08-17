const express = require('express');
const sqlite3 = require('sqlite3');
const fetch = require('node-fetch');
const PORT = 5000;
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
    if (!page.items.length) {
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
        console.log(`inserted ${itemStrings.length} items`);
    });

}
getPage = (category, letter, pageNum) => {
    return new Promise((resolve, reject) => {
        fetch(categoriesApi + `category=${category}&alpha=${letter}&page=${pageNum}`)
            .then((response) => {
                response.json()
                    .then((page) => {
                        handlePageResponse(page);
                        if (page.items.length === 12) {
                            getPage(category, letter, pageNum + 1);
                        }
                        resolve();
                    })
                    .catch(() => { console.log("JSON Error No Data at endpoint This is probably expected") })
            })
            .catch((error) => { console.log(error); resolve(); });
    });
}

getCategory = (category) => {
    
    return new Promise((resolve, reject) => {
        let responses = [];

        for (let i = 97; i <= 122; i++) {
            responses.push(getPage(category, String.fromCharCode(i), 1));
        }

        Promise.all(responses).then(() => {
            console.log("category " + category + "resolving");
            return resolve();
        });

    });
}

getAllTheItems = (category = 0) => {

    getCategory(category).then(() => {
        if (category >= 37) {
            return;
        }
        getCategory(category + 1);
    }).catch(error => console.log(error));


    console.log("GOT ALL THE ITEMS");
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

// localhost:5000/getNames
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