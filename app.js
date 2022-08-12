const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');
const sortObjectsArray = require('sort-objects-array');
const querystring = require('node:querystring');
const { query } = require('express');

var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://postgres:12345@localhost:1834/DBS_Project_Auth_Wrt");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));

//headers
let headers = {
    'writes': [['DOI', 'Author Key'], ['DOI', 'A_Key']],
    'authors': [['Author-ID', 'Author Names'],['A_Key', 'A_Names']],
    'articles': [['Article Title', 'DOI', 'Theme', 'Year of Publication'],['Title', 'DOI', 'Theme', 'Year']],
    'journals': [['Rank', 'Journal Title', 'Impact Factor'],['Rank', 'Title', 'ImpactFactor']],
    'publish': [['Journal Title', 'DOI'],['Title', 'DOI']]
};

app.get('/', (req,res)=>{
    res.render(__dirname + ('/views/home.ejs'), {
        entries: []
    });
});


app.post('/all_joined', async(req,res)=>{
    let tableHeaders = ['Title', 'A_Names', 'Year', 'Theme', 'Journal Title', 'Rank'];
    let displayedHeaders = ['Title', 'Author Names', 'Year of Publication', 'Theme', 'Journal Title', 'Journal Rank'];
    
    let sortOrder = 'asc';
    let sortColumn = 'Title';

    //resetting the sorting order 
    if (req.body.descButton) {
        sortOrder = 'desc';
    };

    //setting the column by which to sort
    tableHeaders.forEach(head => {
        if (req.body.descButton == head || req.body.ascButton == head) {
            sortColumn = head;
        };
    });

    try{
        let queryString = `select articles."Title", authors."A_Names", articles."Year", articles."Theme", journals."Title" as "Journal Title", journals."Rank" from writes, authors, articles, publish, journals where writes."A_Key" = authors."A_Key" and articles."DOI" = writes."DOI" and publish."DOI" = articles."DOI" and publish."Title" = journals."Title"`
        let data = await db.many(queryString);
        let sortedData = sortObjectsArray(data, sortColumn, sortOrder)
        res.render(__dirname + ('/views/home.ejs'), {
            tableHeaders: tableHeaders,
            displayedHeaders: displayedHeaders,
            entries: sortedData
        });
    } catch (error) {
        res.render(__dirname + ('/views/error.ejs'), {
            errorMessage: error
        });
        console.log(error);
    };
});

app.post('/single_table_view', (req,res)=> {
    selectedTable = req.body.table;
    res.redirect(307, `/single_table_view/${selectedTable}`);
});

app.get('/single_table_view/:table', async (req,res) => {
    let selectedTable = req.params.table;

    try {
        let data = await db.many(`SELECT  * FROM ${selectedTable}`)
        console.log(headers[selectedTable][1], data)
        res.render(__dirname + ('/views/home.ejs'), {
            displayedHeaders: headers[selectedTable][0],
            tableHeaders: headers[selectedTable][1],
            entries: data
        })
    } catch (error) {
        console.log(error);
    }
})

app.post('/single_table_view/:table', async (req,res) => {
    let selectedTable = req.params.table;
    let tableHeaders = headers[selectedTable][1];
    let sortOrder = 'asc';
    let sortColumn = tableHeaders[0];
    // console.log(selectedTable, tableHeaders[1])
    if (req.body.descButton) {
        sortOrder = 'desc';
    }

    tableHeaders.forEach(head => {
        if (req.body.descButton == head || req.body.ascButton == head) {
            sortColumn = head;
        }
    })
    // console.log(sortOrder);
    try {
        let data = await db.many(`SELECT  * FROM ${selectedTable}`);
        let sortedData = sortObjectsArray(data, sortColumn, sortOrder);
        res.render(__dirname + ('/views/home.ejs'), {
            displayedHeaders: headers[selectedTable][0],
            tableHeaders: tableHeaders,
            entries: sortedData
        })
    } catch (error) {
        console.log(error);
    };
});

app.post('/search', (req,res)=>{
    let searchParam = Object.keys(req.body);
    if (searchParam.includes('searchArticleSingle')) {
        let DOI = req.body.DOI;
        res.redirect(`/search_by_DOI/${DOI}`);
    } else if (searchParam.includes('searchArticleMulti')){
        delete req.body.searchArticleMulti;
        const queryString = querystring.stringify(req.body);
        res.redirect(`/search_multi/${queryString}`);
    } else if (searchParam.includes('searchJournal')) {
        delete req.body.searchJournal;
        const queryString = querystring.stringify(req.body);
        res.redirect(`/search_journal/${queryString}`);
    };
});

// !!! need to implement error handling for cases where returned result is 0 or more than 1 !!!
app.get('/search_by_DOI/:ORG/:ID', async (req,res) => {
    let DOI = req.params.ORG + '/' + req.params.ID;
    let queryString =   `SELECT articles."Title", authors."A_Names", articles."Year", articles."Theme", journals."Title" as "Journal Title", journals."Rank", articles."DOI" 
                        FROM writes, authors, articles, publish, journals 
                        WHERE writes."A_Key" = authors."A_Key" and articles."DOI" = writes."DOI" and publish."DOI" = articles."DOI" and publish."Title" = journals."Title" and articles."DOI" =  $1`;
    let tableHeaders = ['Title', 'A_Names', 'Theme', 'Journal Title', 'Rank', 'DOI'];
    try {
        let data = await db.one(queryString, [DOI]);
        res.render(__dirname + ('/views/home.ejs'), {
            tableHeaders: tableHeaders,
            displayedHeaders: ['Article Title', 'Author Names', 'Theme', 'Journal Title', 'Journal Rank', 'DOI'],
            entries: [data]
        });
    } catch (error) {
        res.render(__dirname + ('/views/error.ejs'), {
            errorMessage: error
        });
        console.log('ErrorMessage: ' + error);
    }
});

app.all('/search_multi/:queryString', async (req,res) => {
    const decodedQuery = querystring.parse(req.params.queryString);
    let query =   `SELECT articles."Title", authors."A_Names", articles."Year", articles."Theme", journals."Title" as "Journal Title", journals."Rank", articles."DOI" 
    FROM writes, authors, articles, publish, journals 
    WHERE writes."A_Key" = authors."A_Key" and articles."DOI" = writes."DOI" and publish."DOI" = articles."DOI" and publish."Title" = journals."Title"`;
    let tableHeaders = ['Title', 'A_Names', 'Year', 'Theme', 'Journal Title', 'Rank', 'DOI'];
    let sortOrder = 'asc';
    let sortColumn = tableHeaders[0];

    if (req.body.descButton) {
        sortOrder = 'desc';
    }

    tableHeaders.forEach(head => {
        if (req.body.descButton == head || req.body.ascButton == head) {
            sortColumn = head;
        }
    })

    for (key in decodedQuery) {
        if (decodedQuery[key].length > 0) {
            switch (key) {
                case 'Title':
                    query += ' and ' + `articles."${key}"` + " LIKE " + `'%${decodedQuery[key]}%'`;
                    break;
                case 'yearFrom':
                    query += ' and ' + `articles."Year"` + " >= " + `'${decodedQuery[key]}'`;
                    break;
                case 'yearTo':
                    query += ' and ' + `articles."Year"` + " <= " + `'${decodedQuery[key]}'`;
                    break;
                case 'A_Names':
                    query += ' and ' + `"${key}"` + " LIKE " + `'%${decodedQuery[key]}%'`;
                    break;
                default:
                    break;
            }
        }
    }

    try {
        let data = await db.any(query);
        data = sortObjectsArray(data, sortColumn, sortOrder)
        // console.log(data);
        res.render(__dirname + ('/views/home.ejs'), {
            tableHeaders: tableHeaders,
            displayedHeaders: ['Article Title', 'Author Names', 'Year of Publication', 'Theme', 'Journal Title', 'Journal Rank', 'DOI'],
            entries: data
        });
    } catch (error) {
        console.log(error);
        res.render(__dirname + ('/views/error.ejs'), {
            errorMessage: error
        });
    };
});

app.all('/search_journal/:queryString', async (req,res) => {
    let decodedQuery = querystring.parse(req.params.queryString);
    let pgQuery =   `SELECT "Rank", "Title" as "Journal Title", "ImpactFactor" as "Impact Factor" 
    FROM journals 
    WHERE "Rank" = "Rank"`
    let tableHeaders = headers['journals'][1];
    let sortOrder = 'asc';
    let sortColumn = tableHeaders[0];

    if (req.body.descButton) {
        sortOrder = 'desc';
    };

    for (head in tableHeaders) {
        if (head == req.body.descButton || head == req.body.ascButton) {
            sortColumn = head
        };
    };

    for (key in decodedQuery) {
        if (decodedQuery[key]) {
            switch (key) {
                case 'Title':
                    pgQuery += ` and "Title" LIKE '%${decodedQuery[key]}%'`;
                    break;
                case 'rankFrom':
                    pgQuery += ` and "Rank" >= '${decodedQuery[key]}'`;
                    break;
                case 'rankTo':
                    pgQuery += ` and "Rank" <= '${decodedQuery[key]}'`;
                    break;
                case 'impactFrom':
                    pgQuery += ` and "ImpactFactor" >= '${decodedQuery[key]}'`;
                    break;
                case 'impactTo':
                    pgQuery += ` and "ImpactFactor" <= '${decodedQuery[key]}'`;
                    break;
                default:
                    break;
            }
        }
    }
    console.log(pgQuery);
    try {
        let data = await db.any(pgQuery);
        data = sortObjectsArray(data, sortColumn, sortOrder);
        console.log(data);
        res.render(__dirname + ('/views/home.ejs'), {
            displayedHeaders: headers['journals'][0],
            tableHeaders: headers['journals'][0],
            entries: data
        });
    } catch (error) {
        console.log(error);
        res.render(__dirname + ('/views/error.ejs'), {
            errorMessage: error
        });
    }

});

app.all('/test', (req,res)=> {
    console.log(req.body);
});

app.listen(3000, ()=> {
    console.log('Server started on Port 3000');
});
