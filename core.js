// CONFIGURAÇÕES DO SERVIDOR
let express = require('express');
const http = require("http");

const app = express();
app.use(express.static(__dirname + '/public' ));
app.get("/quizzed/", (req,res) => res.sendFile(`${__dirname}/public/index.html`))
app.listen(9091, () => console.log(`Listening on http port 9091 -> https://localhost:9091`))

const websocketServer = require("websocket").server
const httpServer = http.createServer(app);

// httpServer.listen()
httpServer.listen(9090, () => console.log("Listening.. on 9090"))

const wsServer = new websocketServer({
    "httpServer": httpServer
})


//hashmap clients
const clients = {};
const games = {};
const runningGames = {};
const PERGUNTAS = require('./perguntas.json');
let PERGUNTAS_RESPONDIDAS = [];
const COLORSAVAILABLE = ['GREEN', 'RED', 'BLUE', 'TURQUOISE', 'BLACK', 'BLUEVIOLET', 'ORANGE', 'PINK'];
let listCoresUnicas = [];




wsServer.on("request", request => {
    //connect
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"))
    connection.on("close", () => console.log("closed!"))
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data)
        //I have received a message from the client
        //a user want to create a new game
        if (result.method === "create") {
            const clientId = result.clientId;
            const gameId = guid();

            games[gameId] = {
                "id": gameId,
                "clients": [],
                "gameMaster": result.clientId,
                "rodadaAtual": 0,
                "jogadorAtual": null,
                "ultimaJogadaFeita": null,
                "inicioDaPartida": null,
                "inicioDaRodada": null,
                "rodadas": [],
                executarRodada() {
                    console.log(`executarRodada | RODADA: ${this.rodadaAtual} | JOGADOR ATUAL: ${this.jogadorAtual}`)

                    // CONFIGURA PRESET INICIAL
                    if(this.inicioDaPartida == null) this.inicioDaPartida = Date.now();
                    if(this.inicioDaRodada == null) this.inicioDaRodada = Date.now();
                    if(this.jogadorAtual == null) this.jogadorAtual = 0;
                    this.verificaIntegridadeDaRodada();

                    console.log(this.rodadas[this.rodadaAtual][this.jogadorAtual]);

                    // VERIFICA SE O JOGADOR JÁ JOGOU
                    if(this.jogadorAtual == this.ultimaJogadaFeita && this.clients.length > 1) {
                        this.verificaQuemVaiJogar();
                        this.verificaIntegridadeDaRodada();
                        return;
                    }

                    // VERIFICA SE O JOGADOR ESCOLHEU UMA DIFICULDADE
                    if(this.rodadas[this.rodadaAtual][this.jogadorAtual]['dificuldadeEscolhida'] == null) {
                        console.log(`[${Date.now()}] - escolhaUmaDificuldade`);

                        const payLoad = {
                            "method": "escolhaUmaDificuldade",
                            "game" : games[gameId],
                            "jogador" : games[gameId].clients[this.jogadorAtual].clientId
                        }

                        const con = clients[payLoad.jogador].connection;
                        con.send(JSON.stringify(payLoad));

                        return;
                    }

                    // VERIFICA SE O JOGADOR RESPONDEU A PERGUNTA
                    if(this.rodadas[this.rodadaAtual][this.jogadorAtual].jaRespondeu == false) {
                        console.log(`${this.rodadas[this.rodadaAtual][this.jogadorAtual].playerName} não respondeu`)
                        return;
                    }

                    // SE O JOGADOR JÁ RESPONDEU, VAI PRO PRÓXIMO
                    if(this.rodadas[this.rodadaAtual][this.jogadorAtual].jaRespondeu == true) {
                        console.log(`${this.rodadas[this.rodadaAtual][this.jogadorAtual].playerName} já respondeu`)

                        this.ultimaJogadaFeita = this.jogadorAtual;
                        this.verificaQuemVaiJogar();
                        this.verificaIntegridadeDaRodada();
                        return;
                    }
                },
                escolherDificuldade(dificuldadeEscolhida) {
                    this.verificaIntegridadeDasPerguntasRespondidas();

                    // DEFINE DENTRO DA RODADA ATUAL PRO JOGADOR ATUAL QUAL DIFICULDADE ELE SELECIONOU
                    this.rodadas[this.rodadaAtual][this.jogadorAtual].dificuldadeEscolhida = dificuldadeEscolhida;
                    if(!PERGUNTAS_RESPONDIDAS[this.jogadorAtual][dificuldadeEscolhida]) {
                        PERGUNTAS_RESPONDIDAS[this.jogadorAtual][dificuldadeEscolhida] = [];
                    }

                    // PEGA UMA PERGUNTA ALEATÓRIA DA LISTA. SE JÁ FOI RESPONDIDA, PULA PRA OUTRA
                    let perguntaSelecionada = Math.floor(Math.random() * PERGUNTAS[dificuldadeEscolhida].length);
                    while(PERGUNTAS_RESPONDIDAS[this.jogadorAtual][dificuldadeEscolhida].includes(perguntaSelecionada)) {
                        perguntaSelecionada = Math.floor(Math.random() * PERGUNTAS[dificuldadeEscolhida].length);
                    }

                    this.rodadas[this.rodadaAtual][this.jogadorAtual].perguntaRecebida = PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].titulo;
                    this.rodadas[this.rodadaAtual][this.jogadorAtual].indexPergunta = perguntaSelecionada;

                    let indexResposta = PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].respostaCorreta;
                    this.rodadas[this.rodadaAtual][this.jogadorAtual].resposta = PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].alternativas[indexResposta];

                    console.log({perguntaSelecionada});

                    // GUARDA ESSA PERGUNTA PRA EVITAR QUE ELE RESPONDA DE NOVO
                    PERGUNTAS_RESPONDIDAS[this.jogadorAtual][dificuldadeEscolhida].push(perguntaSelecionada);

                    return {
                        "titulo": PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].titulo,
                        "alternativas": PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].alternativas
                    }
                },
                verificaQuemVaiJogar() {
                    console.log('verificaQuemVaiJogar')
                    console.log({clientsLength: this.clients.length})

                    if(this.jogadorAtual == this.ultimaJogadaFeita) {
                        this.jogadorAtual++;
                        console.log('1b')
                        console.log(this.jogadorAtual)
                        console.log({ultimaJogadaFeita: this.ultimaJogadaFeita})
                    }

                    if(this.jogadorAtual == this.clients.length) {
                        this.rodadaAtual++;
                        this.jogadorAtual = 0;
                        console.log('1a')
                        console.log(this.jogadorAtual)
                    }
                },
                verificaRespostaCerta(resposta) {
                    this.rodadas[this.rodadaAtual][this.jogadorAtual].jaRespondeu = true;
                    let dificuldadeEscolhida = this.rodadas[this.rodadaAtual][this.jogadorAtual].dificuldadeEscolhida;
                    let indexPergunta = this.rodadas[this.rodadaAtual][this.jogadorAtual].indexPergunta;
                    let indexResposta = PERGUNTAS[dificuldadeEscolhida][indexPergunta].respostaCorreta;
                    let casasParaAndar = 1;

                    console.log(`tentativa: ${resposta}`);
                    console.log(`correta: ${PERGUNTAS[dificuldadeEscolhida][indexPergunta].alternativas[indexResposta]}`);

                    if(dificuldadeEscolhida == 'MEDIO') casasParaAndar = 2;
                    if(dificuldadeEscolhida == 'DIFICIL') casasParaAndar = 10;

                    if(PERGUNTAS[dificuldadeEscolhida][indexPergunta].alternativas[indexResposta] == resposta) {
                        this.rodadas[this.rodadaAtual][this.jogadorAtual].acertou = true;
                        this.clients[this.jogadorAtual].posicao += casasParaAndar;
                    }

                    this.ultimaJogadaFeita = this.jogadorAtual;

                    return this.rodadas[this.rodadaAtual][this.jogadorAtual].acertou;
                },
                getPergunta() {
                    return this.rodadas[this.rodadaAtual][this.jogadorAtual];
                },
                verificaIntegridadeDasPerguntasRespondidas() {
                    for(let x = 0; x < this.clients.length; x++) {
                        if(PERGUNTAS_RESPONDIDAS[this.jogadorAtual] == null) PERGUNTAS_RESPONDIDAS[this.jogadorAtual] = {
                            "FACIL": [],
                            "MEDIO": [],
                            "DIFICIL": []
                        };
                    }
                },
                verificaIntegridadeDaRodada() {
                    if(!this.rodadas[this.rodadaAtual] || !this.rodadas[this.rodadaAtual][this.jogadorAtual]) {
                        console.log('refazendo a rodada')
                        this.rodadas[this.rodadaAtual] = [];

                        for(let x = 0; x < this.clients.length; x++) {
                            let tmpObj = {
                                "jogador": x,
                                "dificuldadeEscolhida": null,
                                "perguntaRecebida": null,
                                "indexPergunta": null,
                                "resposta": null,
                                "respostaIndex": null,
                                "jaRespondeu": false,
                                "acertou": false
                            }

                            this.rodadas[this.rodadaAtual].push(tmpObj);
                        }
                    }
                },
                verificaSeHaVencedores() {
                    let jogadorVencedor;

                    this.clients.forEach(jogador => {
                        if(jogador.posicao >= 24) {
                            console.log('ALGUÉM VENCEU!')
                            jogadorVencedor = jogador;
                        }
                    })

                    if(!jogadorVencedor) return;

                    const payLoad = {
                        "method": "vencedorEncontrado",
                        "game" : this,
                        "vencedor": jogadorVencedor,
                        "nomeVencedor": jogadorVencedor.playerName
                    }

                    for(let jogador of this.clients) {
                        console.log(jogador)
                        let con = clients[jogador.clientId].connection;
                        con.send(JSON.stringify(payLoad));
                    }

                    clearTimeout(runningGames[this.id]);
                }
            }

            const payLoad = {
                "method": "create",
                "game" : games[gameId]
            }

            console.log({games})

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        //a client want to join
        if (result.method === "join") {

            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            console.log({game})

            let color = COLORSAVAILABLE[Math.floor(Math.random() * COLORSAVAILABLE.length)];

            while(listCoresUnicas.includes(color)) {
                console.log(color)
                color = COLORSAVAILABLE[Math.floor(Math.random() * COLORSAVAILABLE.length)];
            }

            listCoresUnicas.push(color);

            let counterName = 1;

            game.clients.forEach(jogador => {
                if(jogador.playerName == result.playerName) counterName++;
            })

            if(counterName > 1) result.playerName += ` ${counterName}`;

            game.clients.push({
                clientId,
                "color": color,
                "playerName": result.playerName,
                "posicao": 0
            })

            const payLoad = {
                "method": "join",
                "game": game
            }

            //loop through all clients and tell them that people has joined
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })
        }

        //a user plays
        if (result.method === "play") {
            const gameId = result.gameId;

            if(result.request.label == 'escolherDificuldade') {
                games[gameId].escolherDificuldade(result.request.value);

                const payLoad = {
                    "method": "connect",
                    "clientId": clientId,
                    "pergunta": games[gameId].getPergunta()
                }

                //send back the client connect
                connection.send(JSON.stringify(payLoad))
                return;
            }

            // const ballId = result.ballId;
            // const color = result.color;
            // let state = games[gameId].state;
            // if (!state)
            //     state = {}
            
            // state[ballId] = color;
            // games[gameId].state = state;
            
        }

        if(result.method === 'iniciarPartida') {
            let payLoad = {
                "method": "iniciarPartida",
                "game" : games[result.gameId]
            }


            games[result.gameId].clients.forEach(jogador => {
                let con = clients[jogador.clientId].connection;
                con.send(JSON.stringify(payLoad));
            })

            if(games[result.gameId]['running'] == null) games[result.gameId]['running'] = true;

            updateGameState(games[result.gameId])
            return;
        }

        if(result.method === 'dificuldadeEscolhida') {
            let pergunta = games[result.gameId].escolherDificuldade(result.dificuldadeEscolhida);

            const payLoad = {
                "method": "recebePergunta",
                "game" : games[result.gameId],
                "pergunta": pergunta
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        if(result.method === 'responderPergunta') {
            let booleanResposta = games[result.gameId].verificaRespostaCerta(result.resposta);

            const payLoad = {
                "method": "retornoDaRespostaDaPergunta",
                "game" : games[result.gameId],
                booleanResposta
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));

            if(booleanResposta == true) games[result.gameId].verificaSeHaVencedores();
        }
    })

    //generate a new clientId
    const clientId = guid();
    clients[clientId] = {
        "connection":  connection
    }

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }

    //send back the client connect
    connection.send(JSON.stringify(payLoad))

})

function updateGameState(game){
    console.log('updateGameState')
    game.executarRodada();

    const payLoad = {
        "method": "update",
        "game": game
    }

    game.clients.forEach(c => {
        clients[c.clientId].connection.send(JSON.stringify(payLoad))
    })

    runningGames[game.id] = setTimeout(() => {
        updateGameState(game);
        console.log('loop')
    }, 5000);
}

function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}
 
// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toUpperCase();
 
