const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');
const sortObjectsArray = require('sort-objects-array');

var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://postgres:12345@localhost:1834/DBS_Project_Auth_Wrt");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));

// let data = [{
//     Title: 'Comparison of gaze accuracy and precision in real-world and virtual reality',
//     A_Names: 'Pastel, S; Chen, CH; Martin, L; Naujoks, M; Petri, K; Witte, K',
//     Year: 2020,
//     Theme: 'Visual perception',
//     'Journal Title': 'VIRTUAL REALITY',
//     Rank: 2304
//   },
//   {
//     Title: 'Comparison of Gaze Cursor Input Methods for Virtual Reality Devices',
//     A_Names: 'Choe, Mungyeong; Choi, Yeongcheol; Park, Jaehyun; Kim, Hyun K.',
//     Year: 2019,
//     Theme: 'Control of VR / Human-Computer Interface',
//     'Journal Title': 'INTERNATIONAL JOURNAL OF HUMAN-COMPUTER INTERACTION',
//     Rank: 6902
//   },
//   {
//     Title: 'Comparison of view-based and reconstruction-based models of human navigational strategy',
//     A_Names: 'Gootjes-Dreesbach, Luise; Pickup, Lyndsey C.; Fitzgibbon, Andrew W.; Glennerster, Andrew',
//     Year: 2017,
//     Theme: 'Movement / Navigation',
//     'Journal Title': 'JOURNAL OF VISION',
//     Rank: 5385
//   },
//   {
//     Title: 'Conflicting motion cues to the visual and vestibular self-motion systems around 0.06 Hz evoke simulator sickness',
//     A_Names: 'Duh, HBL; Parker, DE; Philips, JO; Furness, TA',
//     Year: 2004,
//     Theme: 'Cybersickness / Fatigue',
//     'Journal Title': 'HUMAN FACTORS',
//     Rank: 2973
//   },
//   {
//     Title: 'Construction and Evaluation of an Ultra Low Latency Frameless Renderer for VR',
//     A_Names: 'Friston, Sebastian; Steed, Anthony; Tilbury, Simon; Gaydadjiev, Georgi',
//     Year: 2016,
//     Theme: 'Software development',
//     'Journal Title': 'IEEE TRANSACTIONS ON VISUALIZATION AND COMPUTER GRAPHICS',
//     Rank: 1444
//   },
//   {
//     Title: 'Consumer-oriented Head Mounted Displays: Analysis and Evaluation of Stereoscopic Characteristics and User Preferences',
//     A_Names: 'Gadia, Davide; Granato, Marco; Maggiorini, Dario; Ripamonti, Laura Anna; Vismara, Cinzia',
//     Year: 2018,
//     Theme: 'Evaluation of VR systems',
//     'Journal Title': 'MOBILE NETWORKS & APPLICATIONS',
//     Rank: 4121
//   },
//   {
//     Title: 'Vontrol mapping in virtual reality: effects on spatial presence and controller naturalness',
//     A_Names: 'Seibert, Jonmichael; Shafer, Daniel M.',
//     Year: 2018,
//     Theme: 'Presence',
//     'Journal Title': 'VIRTUAL REALITY',
//     Rank: 2304
//   },
//   {
//     Title: 'Control of vertical posture while elevating one foot to avoid a real or virtual obstacle',
//     A_Names: 'Ida, Hirofumi; Mohapatra, Sambit; Aruin, Alexander',
//     Year: 2017,
//     Theme: 'Movement / Navigation',
//     'Journal Title': 'EXPERIMENTAL BRAIN RESEARCH',
//     Rank: 7393
//   },
//   {
//     Title: 'Donveying spatial awareness cues in xR collaborations',
//     A_Names: 'Irlitti, Andrew; Piumsomboon, Thammathip; Jackson, Daniel; Thomas, Bruce H.',
//     Year: 2019,
//     Theme: null,
//     'Journal Title': 'IEEE TRANSACTIONS ON VISUALIZATION AND COMPUTER GRAPHICS',
//     Rank: 1444
//   },
//   {
//     Title: 'Aoordinated hybrid virtual environments: Seamless interaction contexts for effective virtual reality',
//     A_Names: 'Wang, J; Lindeman, R',
//     Year: 2015,
//     Theme: 'Model design',
//     'Journal Title': 'COMPUTERS & GRAPHICS-UK',
//     Rank: 8391
//   }]

// let sorted = sortObjectsArray(data, 'Title');
// console.log(sorted);

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
        // console.log(headers[selectedTable][1], data)
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
    console.log(selectedTable, tableHeaders[1])
    if (req.body.descButton) {
        sortOrder = 'desc';
    }

    tableHeaders.forEach(head => {
        if (req.body.descButton == head || req.body.ascButton == head) {
            sortColumn = head;
        }
    })
    console.log(sortOrder);
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

app.post('/test', (req,res)=> {
    console.log(req.body.ascButton, req.body.descButton);
});

app.listen(3000, ()=> {
    console.log('Server started on Port 3000');
});

