const express = require("express");
const path = require("path");
const fs =require("fs");
const sass=require("sass");
const sharp=require("sharp");

const app = express();                                         
const PORT =  8080;

const obGlobal =
{
    obErori: null,
    folderScss: path.join(__dirname, "Resurse", "scss"),
    folderCss:path.join(__dirname, "Resurse"),
    folderBackup: path.join(__dirname,"backup")
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



fs.mkdirSync(obGlobal.folderScss,{recursive: true });
fs.mkdirSync(obGlobal.folderCss,{recursive: true });

fs.mkdirSync(path.join(obGlobal.folderBackup, "resurse", "css"),{ recursive: true });
fs.mkdirSync(path.join(__dirname,"Resurse", "json"),{ recursive: true });
fs.mkdirSync(path.join(__dirname,"Resurse", "img", "galerie", "originale"), { recursive: true});
fs.mkdirSync(path.join(__dirname,"Resurse", "img", "galerie", "mic"), { recursive: true});
fs.mkdirSync(path.join(__dirname,"Resurse", "img", "galerie", "mediu"), { recursive: true});
fs.mkdirSync(path.join(__dirname,"Resurse", "img", "galerie", "mare"), { recursive: true});



function timestampPentruFisier() 
{
    return new Date().toISOString().replace(/[:.]/g, "-");}

function salveazaBackupCss(caleCss) 
{
    if (!fs.existsSync(caleCss)) {return;}



    const folderBackupCss =path.join(obGlobal.folderBackup, "resurse", "css");
    fs.mkdirSync(folderBackupCss, { recursive: true });

    const extensie = path.extname(caleCss); 
    const numeFaraExtensie = path.basename(caleCss, extensie); 
    const numeBackup = `${numeFaraExtensie}_${timestampPentruFisier()}${ extensie}`; 

    fs.copyFileSync(caleCss,path.join(folderBackupCss,numeBackup));

}

function compileazaScss(caleScss, caleCss) {
    if (!caleScss) {return;}

    if (!path.isAbsolute(caleScss)) {
        caleScss=path.join(obGlobal.folderScss, caleScss);}

    if (!fs.existsSync(caleScss)) {
        console.log("Nu există fișierul SCSS:", caleScss);
        return;}

    if (path.extname(caleScss)!==".scss") {
        return;}

    if (path.basename(caleScss).startsWith("_")) {
        return;}

    if (!caleCss) {
        const caleRelativa= path.relative(obGlobal.folderScss, caleScss);
        caleCss = path.join(obGlobal.folderCss, caleRelativa).replace(/\.scss$/, ".css");}
    else if (!path.isAbsolute(caleCss)) {
        caleCss=path.join(obGlobal.folderCss, caleCss);}

    fs.mkdirSync(path.dirname(caleCss), { recursive: true });

    salveazaBackupCss(caleCss);

    const rezultat = sass.compile(caleScss,{ style: "expanded"});

    fs.writeFileSync(caleCss, rezultat.css);

    console.log(`Compilat SCSS: ${path.basename(caleScss)} -> ${path.basename(caleCss)}`);
}



function listaFisiereScss(folder) {
    let rezultat = [];
    if (!fs.existsSync(folder)) {
        return rezultat;;
    }

    for (let element of fs.readdirSync(folder, { withFileTypes: true })) {
        let caleElement=path.join(folder, element.name);

        if (element.isDirectory()) {
            rezultat= rezultat.concat(listaFisiereScss(caleElement));
        }
        else if (element.isFile() && element.name.endsWith(".scss") && !element.name.startsWith("_")) {
            rezultat.push(caleElement);}
    }

    return rezultat;
}
function compileazaToateScss() {
    const fisiereScss = listaFisiereScss(obGlobal.folderScss);

    for (let fisierScss of fisiereScss) 
        {compileazaScss(fisierScss);}}
compileazaToateScss();

try 
{
    fs.watch(obGlobal.folderScss, { recursive: true }, function (eveniment, numeFisier) {
        if (!numeFisier || !numeFisier.endsWith(".scss")) {return;}


        const caleScss = path.join(obGlobal.folderScss, numeFisier);

        setTimeout(function (){compileazaScss(caleScss);},300);
    });
}
catch (eroare) {console.log("Nu s-a putut porni fs.watch pentru SCSS:", eroare.message);}

function initErori( ){
    let continut= fs.readFileSync(path.join(__dirname ,"Resurse","json", "erori.json"),"utf-8");
    obGlobal.obErori = JSON.parse(continut);


    let caleBaza = obGlobal.obErori.cale_baza;
    if (obGlobal.obErori.eroare_default.imagine) 
        {
        obGlobal.obErori.eroare_default.imagine=`${caleBaza}/${obGlobal.obErori.eroare_default.imagine}`;}

    for (let eroare of obGlobal.obErori.info_erori) {
        eroare.imagine= `${caleBaza}/${eroare.imagine}`;}
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

function citesteDateGalerie() 
{
    const fisier=path.join(__dirname, "Resurse", "json", "galerie.json");

    if (!fs.existsSync(fisier)) 
        {
        console.log("Eroare galerie: lipseste Resurse/json/galerie.json");
        return [];
    }

    const date= JSON.parse(fs.readFileSync(fisier, "utf-8"));

    if (!date.cale_galerie || !Array.isArray(date.imagini)) {
        console.log("Eroare galerie: JSON-ul trebuie sa contina cale_galerie si imagini.");
        return [];}



    return date.imagini.map(function (img, i) {
        let proprietati = ["cale_relativa", "nume", "descriere", "timp"];

    for (let prop of proprietati) {
        if (!img[prop]) {
            console.log(`Eroare galerie: imaginea ${i} nu are proprietatea ${prop}.`);
        }}

        if (img.cale_relativa) {
            let caleFisier = path.join(__dirname, "Resurse", img.cale_relativa);

            if (!fs.existsSync(caleFisier)) {
                console.log(`Eroare galerie: nu exista fisierul ${caleFisier}`);
            }
        }

        if (!img.alt) {
            img.alt = img.nume || `Imagine ${i + 1}`;
        }

        return img;
    });


}

async function pregatesteImagini(imagini) {
    const variante=[
        { tip: "mic", w: 400, h: 300 },
        { tip: "mediu", w: 700, h: 525 },
        { tip: "mare", w: 1000, h: 750 }];

    for (let img of imagini){
        if (!img.cale_relativa) {continue;}

        const sursa=path.join(__dirname, "Resurse", img.cale_relativa);

        if (!fs.existsSync(sursa)) {continue;}

        const nume=path.basename(img.cale_relativa, path.extname(img.cale_relativa)) + ".webp";

        for (let v of variante) 
            {
            let destinatie = path.join(__dirname,"Resurse", "img", "galerie", v.tip, nume);
            fs.mkdirSync(path.dirname(destinatie),{ recursive: true });

            if (!fs.existsSync(destinatie)) 
                {
                await sharp(sursa).resize(v.w,v.h,{ fit: "cover" }).webp().toFile(destinatie);;
            }

            img[`cale_${v.tip}`]=`/resurse/img/galerie/${v.tip}/${nume}`;
        }
    }

    return imagini;
}

function perioadaCurenta() 
{
    const ora=new Date().getHours();      

if (ora >= 5 && ora < 12) {return "dimineata";}

if (ora >= 12 && ora < 20) {return "zi";}

return "noapte";
}

async function obtineGalerieStatica() {
    let timp = perioadaCurenta();
    let imagini = await pregatesteImagini(citesteDateGalerie());

    imagini = imagini.filter(function (img) {
        return img.timp === timp;
    });

    let nr = imagini.length - (imagini.length % 6);

return {
        timp: timp,
        imagini: imagini.slice(0, nr)
    };
}

function amestecaVector(v) {
    for (let i = v.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [v[i], v[j]] = [v[j], v[i]];
    }

    return v;
}



async function obtineGalerieAnimata() {
    let imagini = await pregatesteImagini(citesteDateGalerie());

    imagini = imagini.filter(function (img, index) {
        return index % 2 === 1;});

    imagini= [...new Map(imagini.map(function (img) {
        return [img.cale_relativa, img];})).values()];

    imagini=amestecaVector(imagini);

    let maxim=Math.min(14,imagini.length);
    maxim=maxim-(maxim%2);

    if (maxim<6) {
        return [];
    }

let nrAles=6+2*Math.floor(Math.random()*((maxim-6)/2+1));

return imagini.slice(0,nrAles);
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
    res.sendFile(path.join(__dirname, "Resurse", "ico", "favicon.ico"));
});;

app.get(/^\/resurse(\/.*)?\/$/, function (req, res) 
{
    afisareEroare(res,403);
});

app.get(/^\/.*\.ejs$/,function(req, res) {
    afisareEroare(res, 400);
});

app.use("/resurse", express.static(path.join(__dirname, "Resurse")));



app.get(["/" , "/index", "/home"], async function(req,res){
    try 
    {
    const galerie=await obtineGalerieStatica();

        res.render("pagini/index",{
            imaginiGalerie: galerie.imagini,
            timpGalerie: galerie.timp
        }, function (err, rezRandare){
            if (err){
                if (err.message.startsWith("Failed to lookup view")) {afisareEroare(res, 404);}
                else {afisareEroare(res);}

                return;
            }
            res.send(rezRandare);
        });

    }
catch (err) {
    console.log(err);
    afisareEroare(res);}


});


app.get("/galerie-statica", async function(req, res) {
    try {const galerie = await obtineGalerieStatica();

        res.render("pagini/galerie-statica", {
            imaginiGalerie: galerie.imagini,
            timpGalerie: galerie.timp
        });;

    }
    catch (err){
        console.log(err);
        afisareEroare(res);}
});


app.get("/galerie-dinamica",async function(req, res) {
    try {
        const imagini=await obtineGalerieAnimata();

        res.render("pagini/galerie-dinamica", { imaginiGalerieAnimata: imagini});
    }
    catch (err){
        console.log(err);
        afisareEroare(res);}

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










