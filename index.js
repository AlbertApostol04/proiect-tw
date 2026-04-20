const express = require("express");
const path = require("path");
const fs =require("fs");

const app = express();                                         
const PORT =  8080;

const obGlobal =
{
    obErori: null
};

const vect_foldere=["temp", "logs", "backup", "fisiere_uploadate"];

console.log("__dirname =", __dirname);
console.log("__filename =", __filename);
console.log("process.cwd() =", process.cwd());
console.log("__dirname === process.cwd() ?", __dirname===process.cwd());;

for(let numeFolder of vect_foldere ) 
    {
    let caleFolder = path.join(__dirname, numeFolder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder,{ recursive: true });
    }
}

function initErori( ){
    let continut= fs.readFileSync(path.join(__dirname ,"resurse","json", "erori.json"),"utf-8");
    obGlobal.obErori = JSON.parse(continut);


    let caleBaza = obGlobal.obErori.cale_baza;
    if (obGlobal.obErori.eroare_default.imagine) {
        obGlobal.obErori.eroare_default.imagine=`${caleBaza}/${obGlobal.obErori.eroare_default.imagine}`;
    }

    for (let eroare of obGlobal.obErori.info_erori) {
        eroare.imagine= `${caleBaza}/${eroare.imagine}`;


    }
}


function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare =null;

    if (identificator) {

        eroare=obGlobal.obErori.info_erori.find(function (elem) {
            return elem.identificator == identificator;
        });
    }

    if( !eroare) {
        eroare=obGlobal.obErori.eroare_default;
    }

    let titluFinal=titlu || eroare.titlu;
    let textFinal=text  || eroare.text;
    let imagineFinal=imagine || eroare.imagine;

    if (eroare.status && identificator) {
        res.status(identificator);
    }

    res.render("pagini/eroare", {
        titlu: titluFinal,
        text: textFinal,
        imagine: imagineFinal
    });

    
}
initErori();
app.set("view engine","ejs");

app.set("views", path.join(__dirname, "views"));
app.use(function (req, res, next) 

{
    res.locals.ip = req.ip;
    next();
});

app.get("/favicon.ico", function (req, res) {
    res.sendFile(path.join(__dirname, "resurse", "ico", "favicon.ico"));
});;

app.get(/^\/resurse(\/.*)?\/$/, function (req, res) 
{
    afisareEroare(res,403);
});

app.get(/^\/.*\.ejs$/,function(req, res) {
    afisareEroare(res, 400);
});

app.use("/resurse", express.static(path.join(__dirname, "resurse")));


app.get(["/", "/index", "/home"], function(req, res) {
    res.render("pagini/index", function (err,rezRandare){
        if (err) 
            {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } 
            else {
                afisareEroare(res);
            }
            return;

        }
        res.send(rezRandare);
    });
});





app.get("/:pagina",function(req, res){
    res.render("pagini/"+req.params.pagina, function (err, rezRandare) 
    {
        if(err){
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } 
            else{

                afisareEroare(res);
            }
            return;
        }
        res.send(rezRandare);
    });

});


app.listen(PORT, function(){
    console.log("Serverul a pornit la adresa http://localhost:" +PORT);


});










