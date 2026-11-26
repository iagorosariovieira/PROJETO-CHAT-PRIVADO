const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./banco.db");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS CADASTRO (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            NOME_COMPLETO TEXT NOT NULL,
            EMAIL TEXT UNIQUE NOT NULL,
            TELEFONE TEXT,
            SENHA TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS MENSAGENS (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            SALA TEXT NOT NULL,
            AUTOR TEXT NOT NULL,
            TEXTO TEXT NOT NULL,
            DATA_ENVIO DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Rota de cadastro compatível com o seu cadastro.html
app.get("/cadastro/:nome/:email/:telefone/:senha", (req, res) => {
    const { nome, email, telefone, senha } = req.params;

    if (!nome || !email || !senha) {
        return res.json(0);
    }

    db.run(
        "INSERT INTO CADASTRO (NOME_COMPLETO, EMAIL, TELEFONE, SENHA) VALUES (?, ?, ?, ?)",
        [nome, email, telefone, senha],
        function (err) {
            if (err) {
                return res.json(0);
            }
            return res.json(1);
        }
    );
});

// Rota de login compatível com o seu index.html
app.get("/api/:email/:senha", (req, res) => {
    const { email, senha } = req.params;

    db.get(
        "SELECT ID, NOME_COMPLETO, EMAIL FROM CADASTRO WHERE EMAIL = ? AND SENHA = ?",
        [email, senha],
        (err, row) => {
            if (err || !row) {
                return res.json({ CHECK: false });
            }
            return res.json({
                CHECK: true,
                NOME_COMPLETO: row.NOME_COMPLETO,
                EMAIL: row.EMAIL
            });
        }
    );
});

const jogadoresOnline = {};

io.on("connection", (socket) => {
    socket.on("entrarMapa", (dados) => {
        jogadoresOnline[socket.id] = {
            id: socket.id,
            nome: dados.nome || "Visitante",
            x: dados.x || 390,
            y: dados.y || 250
        };
        io.emit("atualizarJogadores", jogadoresOnline);
    });

    socket.on("mover", (pos) => {
        if (jogadoresOnline[socket.id]) {
            jogadoresOnline[socket.id].x = pos.x;
            jogadoresOnline[socket.id].y = pos.y;
            socket.broadcast.emit("jogadorMoveu", jogadoresOnline[socket.id]);
        }
    });

    socket.on("entrarSala", (sala) => {
        socket.join(sala);
        db.all(
            "SELECT AUTOR, TEXTO FROM MENSAGENS WHERE SALA = ? ORDER BY ID ASC LIMIT 50",
            [sala],
            (err, rows) => {
                if (!err) {
                    socket.emit("historicoSala", { sala, mensagens: rows });
                }
            }
        );
    });

    socket.on("sairSala", (sala) => {
        if (sala) socket.leave(sala);
    });

    socket.on("enviarMensagem", ({ sala, autor, texto }) => {
        if (!sala || !texto || !texto.trim()) return;
        const autorLimpo = autor || "Visitante";
        const textoLimpo = texto.trim();

        db.run(
            "INSERT INTO MENSAGENS (SALA, AUTOR, TEXTO) VALUES (?, ?, ?)",
            [sala, autorLimpo, textoLimpo],
            (err) => {
                if (!err) {
                    io.to(sala).emit("novaMensagem", {
                        sala,
                        autor: autorLimpo,
                        texto: textoLimpo
                    });
                }
            }
        );
    });

    socket.on("disconnect", () => {
        delete jogadoresOnline[socket.id];
        io.emit("atualizarJogadores", jogadoresOnline);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});