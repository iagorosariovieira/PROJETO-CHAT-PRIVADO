const express = require("express");
const cors = require("cors");
const sqlite = require("sqlite3");
const path = require("path");

const app = express();
app.use(cors());

var db = new sqlite.Database("Database.sqlite");

app.use(express.static(path.join(__dirname, 'public')));


function CriarDatabase(){
    var query = "CREATE TABLE CADASTRO (ID INTEGER PRIMARY KEY AUTOINCREMENT, NOME_COMPLETO VARCHAR, EMAIL VARCHAR, TELEFONE VARCHAR, SENHA VARCHAR(255))";

    db.run(query, (err) => {
        if (err) console.log(err);
        else console.log("Tabela criada!!!")
    });
}

CriarDatabase();

app.get("/", (req, res) => {
    
    res.sendFile(path.join(__dirname, 'public', 'Cadastro.html'));
});

app.get("/cadastro/:nome_completo/:email/:telefone/:senha", (req, res) => {
    var user = req.params.nome_completo;
    var email = req.params.email;
    var telefone = req.params.telefone;
    var senha = req.params.senha;

    var query = "INSERT INTO CADASTRO (NOME_COMPLETO, EMAIL, TELEFONE, SENHA ) VALUES (?, ?, ?, ?)";

    db.run(query, [user, email, telefone, senha], (err) => {
        if (err) res.send(err);
        else res.json(1)
    })
})

app.get("/api/:login/:senha,", (req, res) => {
    var login = req.params.login;
    var senha = req.params.senha;

    console.log("LOGIN =", login);
    console.log("SENHA =", senha);

    var query = "SELECT * FROM CADASTRO";

    db.all(query, (err, rows) => {

        if(err) console.log(err);
        else console.log(rows);
                })
            
        
        return res.json({CHECK: false});
})


app.listen(3000);