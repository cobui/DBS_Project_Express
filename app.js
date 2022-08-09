const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');

var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://postgres:12345@localhost:1834/DBS_Project_Auth_Wrt");

const app = express();

app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));

//headers
let headers = {
    'writes': [['DOI', 'Author Key'], ['DOI', 'A_Key']]
}

app.get('/', async (req,res)=>{
    let isLoaded = false
        try {
            let data = await db.many("SELECT * FROM authors")
            //console.log(data)
            res.render(__dirname + ('/views/home.ejs'), {
                tableHeaders: ['A_Key', 'A_Names'],
                displayedHeaders: ['Key', 'Names'],
                entries: data,
            })
            isLoaded = true
        } catch (error) {
            res.render(__dirname + ('/views/error.ejs'), {
                errorMessage: error
            })
            console.log("Error: " + error);
        }
});

app.post('/single_table_view', async(req,res)=> {
    selectedTable = req.body.table
    try {
        let data = await db.many(`SELECT  * FROM ${selectedTable}`)
        console.log(headers[selectedTable][1], data)
        res.render(__dirname + ('/views/home.ejs'), {
            displayedHeaders: headers[selectedTable][0],
            tableHeaders: headers[selectedTable][1],
            entries: data
        })
    } catch (error) {
        console.log(error)
    }
})

app.listen(3000, ()=> {
    console.log('Server started on Port 3000')
})