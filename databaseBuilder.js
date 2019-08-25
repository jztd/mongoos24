const sqlite3 = require('sqlite3');
const fetch = require('node-fetch');
const categoriesApi = "https://services.runescape.com/m=itemdb_rs/api/catalogue/items.json?";
const graphApi = "http://services.runescape.com/m=itemdb_rs/api/graph/";


const createItemTableSQL = "\
                        CREATE TABLE IF NOT EXISTS item(\
                        id INTEGER PRIMARY KEY,\
                        name VARCHAR(255),\
                        description TEXT,\
                        type VARCHAR(255),\
                        icon TEXT\
                        )";

const createPriceEntryTableSQL = "\
                        CREATE TABLE IF NOT EXISTS priceEntry(\
                        id INTEGER ,\
                        date INTEGER,\
                        daily INTEGER,\
                        average INTEGER,\
                        PRIMARY KEY (id, date)\
                        FOREIGN KEY(id) REFERENCES item(id)\
                        )";

const insertPriceSQL = "INSERT INTO priceEntry (id, date, daily, average) VALUES ";
const insertItemSQL = "INSERT INTO item (id, name, description, type, icon) VALUES ";

let database =  new sqlite3.Database('./item.db', (error) => {
    if(error) {
        console.log("PROBLEM INITILIZING DATABSE");
        console.log(error);
        return;
    }
    database.run(createItemTableSQL);
    database.run(createPriceEntryTableSQL);
    console.log("Database Initilized");
});

const handleItemPageResponse = (page) => {
    if (!page || !page.length) {
        return;
    }

    let itemStrings = page.reduce((itemList, item) => {
        itemList.push(`(${item.id.toString()}, "${item.name.toString()}", "${item.description.toString()}", "${item.type.toString()}", "${item.icon_large.toString()}")`);
        return itemList;
    }, []);

    let insertStatment = `${insertItemSQL}${itemStrings.join(',')}`;
    
    database.run(insertStatment, (error) => {
        if (error) {
            console.log("SQL ERROR " + error);
        }
        console.log(`inserted ${page.length} items`);
    });
    return;
}

const getPage = async(category, letter, pageNum) => {
    let pageResponse = await fetch(categoriesApi + `category=${category}&alpha=${letter}&page=${pageNum}`).then((response) => response.json())
    
    await handleItemPageResponse(pageResponse.items);
    
    if(pageResponse.items.length !== 12) {
        return;
    }
    
    return getPage(category, letter, pageNum + 1);
}

const getCategory = async(category) => {
    for (let i = 97; i < 123; i++) {
        console.log(`-----------STARTING ${String.fromCharCode(i)} from category ${category}------------`);
        await getPage(category, String.fromCharCode(i), 1);
    }
}

const populateItems = async() => {
    for (let i = 0; i < 38; i++) {
        console.log(`------STARTING CATEGORY ${i}----------`);
        await getCategory(i);
    }
}

handlePriceResponse = async(pricePage,id) => {
    if (!pricePage || !pricePage.daily) {
        return;
    }

    let priceEntries = [];
    for(let time of Object.keys(pricePage.daily)) {
        priceEntries.push(`(${id}, ${parseInt(time)}, ${pricePage.daily[time]}, ${pricePage.average[time]})`);
    }

    
    let insertStatment = insertPriceSQL + priceEntries.join(',');

    await database.run(insertStatment, (error) => {
        if (error) {
            console.log(error);
            return;
        }
        console.log(`inserted ${priceEntries.length} price entries`);
    });

    return;

}

const getPrice = async(id) => {
    let pricePage = await fetch(`${graphApi+id}.json`)
        .then((response => response.json()))
        .catch(async() => {console.log("retrying"); await getPrice(id); return;});

    await handlePriceResponse(pricePage, id);

    return;
}

const populateItemPrices = async() => {
    database.all('SELECT id FROM item', async(error,rows) => {
        if(error) {
            console.log('ERROR GETTING ITEM IDS');
            console.log(error);
            return;
        }
        for(let row of rows) {
            console.log(`-------- GETTING PRICES FOR ${row.id}---------`);
            await getPrice(row.id);
        }
        return;
    });
}


// populateItems().then(() => populateItemPrices()).then(() => console.log("Finished"));
populateItemPrices().then(() => console.log("Finished"));