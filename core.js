// CONFIGURAÇÕES DO SERVIDOR
let express = require('express');
let http = require("http");

let app = express();
app.use(express.static(__dirname + '/public' ));
app.get("/quizzed/", (req,res) => res.sendFile(`${__dirname}/public/index.html`))
app.listen(9091, () => console.log(`[SERVER] HTTP listening on 9091 -> http://localhost:9091`))

let websocketServer = require("websocket").server
let httpServer = http.createServer(app);

httpServer.listen(9090, () => console.log("[SERVER] Websocket Listening on 9090"))

let wsServer = new websocketServer({
    "httpServer": httpServer
})

let clients = {};
let games = {};
let runningGames = {};
let COLORSAVAILABLE = ['GREEN', 'RED', 'BLUE', 'TURQUOISE', 'BLACK', 'BLUEVIOLET', 'ORANGE', 'PINK'];
let PERGUNTAS = require('./perguntas.json');
let PERGUNTAS_RESPONDIDAS = [];
let listCoresUnicas = [];


wsServer.on("request", request => {
    let connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"))
    connection.on("close", () => console.log("closed!"))
    connection.on("message", message => {
        let result = JSON.parse(message.utf8Data)
        // CRIAR NOVA PARTIDA
        if (result.method === "create") {
            let clientId = result.clientId;
            let gameId = guid();

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

                    // VERIFICA SE A RODADA ESTÁ CONFIGURADA - SE NÃO ESTIVER, CRIA UMA NOVA
                    this.verificaIntegridadeDaRodada();

                    // VERIFICA SE O JOGADOR PASSOU MAIS DE 2 MINUTOS SEM JOGAR - ENCERRA A PARTIDA
                    if((new Date().getTime() / 1000) - (this.rodadas[this.rodadaAtual][this.jogadorAtual].horarioInicio / 1000) >= (2 * 60)) {
                        clearTimeout(runningGames[this.id]);
                        games[this.id]['running'] = false;

                        console.log(`[GAME] Partida ${this.id} encerrada por inatividade`);

                        let payLoad = {
                            "method": "partidaEncerradaInatividade",
                            "game" : this
                        }
    
                        for(let jogador of this.clients) {
                            let con = clients[jogador.clientId].connection;
                            con.send(JSON.stringify(payLoad));
                        }

                        return;
                    }

                    // VERIFICA SE O JOGADOR JÁ JOGOU
                    if(this.jogadorAtual == this.ultimaJogadaFeita && this.clients.length > 1) {
                        this.verificaQuemVaiJogar();
                        this.verificaIntegridadeDaRodada();
                        return;
                    }

                    // VERIFICA SE O JOGADOR ESCOLHEU UMA DIFICULDADE
                    if(this.rodadas[this.rodadaAtual][this.jogadorAtual]['dificuldadeEscolhida'] == null) {
                        console.log(`[${Date.now()}] - escolhaUmaDificuldade`);

                        let payLoad = {
                            "method": "escolhaUmaDificuldade",
                            "game" : games[gameId],
                            "jogador" : games[gameId].clients[this.jogadorAtual].clientId
                        }

                        let con = clients[payLoad.jogador].connection;
                        con.send(JSON.stringify(payLoad));

                        return;
                    }

                    // VERIFICA SE O JOGADOR JÁ RESPONDEU A PERGUNTA
                    if(this.rodadas[this.rodadaAtual][this.jogadorAtual].jaRespondeu == false) {
                        console.log(`${this.clients[this.jogadorAtual].playerName} não respondeu`)
                        return;
                    }

                    // SE O JOGADOR JÁ RESPONDEU, VAI PRO PRÓXIMO JOGADOR
                    if(this.rodadas[this.rodadaAtual][this.jogadorAtual].jaRespondeu == true) {
                        console.log(`${this.clients[this.jogadorAtual].playerName} já respondeu`)

                        this.ultimaJogadaFeita = this.jogadorAtual;
                        this.verificaQuemVaiJogar();
                        this.verificaIntegridadeDaRodada();
                        return;
                    }
                },

                escolherDificuldade(dificuldadeEscolhida) {
                    // VERIFICA SE O OBJETO DE PERGUNTAS ESTÁ MONTADO CORRETAMENTE - CASO CONTRÁRIO CRIA UM NOVO
                    this.verificaIntegridadeDasPerguntasRespondidas();

                    // DEFINE DENTRO DA RODADA ATUAL DIFICULDADE O JOGADOR ATUAL SELECIONOU
                    this.rodadas[this.rodadaAtual][this.jogadorAtual].dificuldadeEscolhida = dificuldadeEscolhida;
                    if(!PERGUNTAS_RESPONDIDAS[this.jogadorAtual][dificuldadeEscolhida]) {
                        PERGUNTAS_RESPONDIDAS[this.jogadorAtual][dificuldadeEscolhida] = [];
                    }

                    // PEGA UMA PERGUNTA ALEATÓRIA DA LISTA. SE JÁ FOI RESPONDIDA, PULA PRA OUTRA
                    let perguntaSelecionada = Math.floor(Math.random() * PERGUNTAS[dificuldadeEscolhida].length);
                    while(PERGUNTAS_RESPONDIDAS[this.jogadorAtual][dificuldadeEscolhida].includes(perguntaSelecionada)) {
                        perguntaSelecionada = Math.floor(Math.random() * PERGUNTAS[dificuldadeEscolhida].length);
                    }

                    PERGUNTAS_RESPONDIDAS[this.jogadorAtual][dificuldadeEscolhida].push(perguntaSelecionada);

                    this.rodadas[this.rodadaAtual][this.jogadorAtual].perguntaRecebida = PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].titulo;
                    this.rodadas[this.rodadaAtual][this.jogadorAtual].indexPergunta = perguntaSelecionada;

                    let indexResposta = PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].respostaCorreta;
                    this.rodadas[this.rodadaAtual][this.jogadorAtual].resposta = PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].alternativas[indexResposta];

                    return {
                        "titulo": PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].titulo,
                        "alternativas": PERGUNTAS[dificuldadeEscolhida][perguntaSelecionada].alternativas
                    }
                },

                verificaQuemVaiJogar() {
                    console.log(`[GAME] verificaQuemVaiJogar`)
                    console.log(`JogadorAtual: ${this.jogadorAtual} | ultimaJogadaFeita: ${this.ultimaJogadaFeita} | qntJogadores: ${this.clients.length}`)

                    // VERIFICA SE A ÚLTIMA JOGADA FOI FEITA PELO JOGADOR ATUAL
                    if(this.jogadorAtual == this.ultimaJogadaFeita) {
                        this.jogadorAtual++;
                    }

                    // SE O INDEX DO JOGADOR ATUAL É IGUAL A QUANTIDADE DE JOGADORES, RESETA O INDEX
                    if(this.jogadorAtual == this.clients.length) {
                        this.rodadaAtual++;
                        this.jogadorAtual = 0;
                    }
                },

                verificaRespostaCerta(resposta) {
                    // DEFINE NO OBJETO DE RODADAS QUE ELE RESPONDEU A PERGUNTA
                    this.rodadas[this.rodadaAtual][this.jogadorAtual].jaRespondeu = true;
                    let dificuldadeEscolhida = this.rodadas[this.rodadaAtual][this.jogadorAtual].dificuldadeEscolhida;
                    let indexPergunta = this.rodadas[this.rodadaAtual][this.jogadorAtual].indexPergunta;
                    let indexResposta = PERGUNTAS[dificuldadeEscolhida][indexPergunta].respostaCorreta;
                    let casasParaAndar = 1;

                    console.log(`[GAME] Tentativa: ${resposta}`);
                    console.log(`[GAME] Correta: ${PERGUNTAS[dificuldadeEscolhida][indexPergunta].alternativas[indexResposta]}`);

                    if(dificuldadeEscolhida == 'MEDIO') casasParaAndar = 2;
                    if(dificuldadeEscolhida == 'DIFICIL') casasParaAndar = 10;

                    // VERIFICA SE A ALTERNATIVA SELECIONADA É A RESPOSTA CORRETA
                    if(PERGUNTAS[dificuldadeEscolhida][indexPergunta].alternativas[indexResposta] == resposta) {
                        this.rodadas[this.rodadaAtual][this.jogadorAtual].acertou = true;
                        this.clients[this.jogadorAtual].posicao += casasParaAndar;
                    }

                    this.ultimaJogadaFeita = this.jogadorAtual;

                    return this.rodadas[this.rodadaAtual][this.jogadorAtual].acertou;
                },

                getPergunta() {
                    // RETORNA OS DADOS DA RODADA DO JOGADOR ATUAL CONTENDO A PERGUNTA/DIFICULDADE SELECIONADA
                    return this.rodadas[this.rodadaAtual][this.jogadorAtual];
                },

                verificaIntegridadeDasPerguntasRespondidas() {
                    // VERIFICA SE O OBJETO PERGUNTAS_RESPONDIDAS EXISTE - NÃO EXISTINDO PREENCHE O OBJETO
                    for(let x = 0; x < this.clients.length; x++) {
                        if(PERGUNTAS_RESPONDIDAS[this.jogadorAtual] == null) PERGUNTAS_RESPONDIDAS[this.jogadorAtual] = {
                            "FACIL": [],
                            "MEDIO": [],
                            "DIFICIL": []
                        };
                    }
                },

                verificaIntegridadeDaRodada() {
                    // VERIFICA SE O OBJETO DE RODADAS ESTÁ PREENCHIDO CORRETAMENTE - CASO CONTRÁRIO CRIA O OBJETO
                    if(!this.rodadas[this.rodadaAtual] || !this.rodadas[this.rodadaAtual][this.jogadorAtual]) {
                        console.log('[GAME] Gerando a rodada')
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
                                "acertou": false,
                                "horarioInicio": new Date().getTime()
                            }

                            this.rodadas[this.rodadaAtual].push(tmpObj);
                        }
                    }
                },

                verificaSeHaVencedores() {
                    // MÉTODO AUTOEXPLICATIVO - VERIFICA SE HÁ VENCEDORES NA PARTIDA
                    let jogadorVencedor;

                    this.clients.forEach(jogador => {
                        if(jogador.posicao >= 24) {
                            console.log(`[GAME] ${jogador.playerName} VENCEU A PARTIDA ${this.id}!!`)
                            jogadorVencedor = jogador;
                        }
                    })

                    if(!jogadorVencedor) return;

                    let payLoad = {
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

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        // JUNTAR-SE A UMA PARTIDA
        if (result.method === "join") {

            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];

            let color = COLORSAVAILABLE[Math.floor(Math.random() * COLORSAVAILABLE.length)];
            while(listCoresUnicas.includes(color)) {
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

            game.clients.forEach(jogador => {
                clients[jogador.clientId].connection.send(JSON.stringify(payLoad))
            })
        }

        //a user plays
        // if (result.method === "play") {
        //     const gameId = result.gameId;

        //     if(result.request.label == 'escolherDificuldade') {
        //         games[gameId].escolherDificuldade(result.request.value);

        //         const payLoad = {
        //             "method": "connect",
        //             "clientId": clientId,
        //             "pergunta": games[gameId].getPergunta()
        //         }

        //         //send back the client connect
        //         connection.send(JSON.stringify(payLoad))
        //         return;
        //     }
        // }

        // INICIAR UMA PARTIDA
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

        // ESCOLHEU UMA DIFICULDADE DE PERGUNTA
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

        // RESPONDER UMA PERGUNTA
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

    // GERA UM GUID NOVO PARA CADA CONEXÃO
    let clientId = guid();
    clients[clientId] = {
        "connection":  connection
    }

    let payLoad = {
        "method": "connect",
        "clientId": clientId
    }

    // INFORMA AO USUÁRIO QUE A CONEXÃO FOI BEM SUCEDIDA
    connection.send(JSON.stringify(payLoad))
})

// LOOP QUE ATUALIZA AS INFORMAÇÕES DA PARTIDA
function updateGameState(game){
    if(!games[game.id]['running']) return;

    console.log('[GAME] updateGameState')
    game.executarRodada();

    let payLoad = {
        "method": "update",
        "game": game
    }

    game.clients.forEach(jogador => {
        clients[jogador.clientId].connection.send(JSON.stringify(payLoad))
    })

    runningGames[game.id] = setTimeout(() => {
        updateGameState(game);
        console.log('loop')
    }, 5000);
}

function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}
 
let guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toUpperCase();