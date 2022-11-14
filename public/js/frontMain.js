let clientId = null;
let gameId = null;
let playerColor = null;
let lastPayload;
let perguntaAtual;
let jogadores = [];
let vencedor = null;
let alfaAlternativas = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

// let ws = new WebSocket("ws://192.168.18.25:9090")
let ws = new WebSocket("ws://localhost:9090")

const input = document.querySelector("input");

const btnCriarUmJogo = document.querySelector(".btnCriarUmJogo");
btnCriarUmJogo.addEventListener("click", e => {
    const payLoad = {
        "method": "create",
        "clientId": clientId
    }

    ws.send(JSON.stringify(payLoad));
})

const btnEntrarNaPartida = document.querySelector(".btnEntrarNaPartida");
btnEntrarNaPartida.addEventListener("click", e => {

    if(input.value == null || input.value == '' || input.value == undefined || input.value.length != 36) return;
    if (gameId === null) gameId = input.value;

    const payLoad = {
        "method": "join",
        "clientId": clientId,
        "gameId": gameId,
        "playerName": obterNomeDoJogador()
    }

    ws.send(JSON.stringify(payLoad));

    document.querySelector('.boxJoinPartida').classList.add('hidden');
    document.querySelector('.btnCriarUmJogo').classList.add('hidden');
    document.querySelector('.mensagemAguardando').className = 'mensagemAguardando';

})

const btnIniciarPartida = document.querySelector('.btnIniciarJogo');
btnIniciarPartida.addEventListener('click', event => {
    console.log('INICIANDO A PARTIDA!!');
    document.querySelector('.menuJogo').classList.add('hidden');

    const payLoad = {
        "method": "iniciarPartida",
        "clientId": clientId,
        "gameId": gameId,
    }

    ws.send(JSON.stringify(payLoad));
})

function obterNomeDoJogador() {
    let nome = window.prompt('Digite seu nome.');

    while(nome == null || nome == undefined) {
        nome = window.prompt('Nome inválido! Digite seu nome!');
    }

    if(nome == '') nome = 'Jogador';

    return nome;
}

function entrarNaPartida(gameId) {
    console.log('Entrando na partida!')
    const payLoad = {
        "method": "join",
        "clientId": clientId,
        "gameId": gameId,
        "playerName": obterNomeDoJogador()
    }

    ws.send(JSON.stringify(payLoad));
}

function iniciarPartida_Backend() {
    const payLoad = {
        "method": "start",
        "gameId": gameId
    }

    ws.send(JSON.stringify(payLoad));
}

document.querySelector('.escolhaDificuldade').addEventListener('click', event => {
    if(event.target.value == null) return;

    const payLoad = {
        "jogador": clientId,
        "dificuldadeEscolhida": event.target.value,
        "method": "dificuldadeEscolhida",
        "gameId": gameId
    }

    console.log({payLoad})

    ws.send(JSON.stringify(payLoad));

    document.querySelector('.escolhaDificuldade').classList.add('hidden');
    document.querySelector('.fundoModal').classList.add('hidden');
})

document.querySelector('.boxPergunta').addEventListener('click', event => {
    if(event.target.dataset.alternativa == null) return;

    const payLoad = {
        "gameId": gameId,
        "jogador": clientId,
        "resposta": event.target.dataset.alternativa,
        "respostaIndex": event.target.dataset.alternativaindex,
        "method": "responderPergunta"
    }

    console.log({payLoad})

    ws.send(JSON.stringify(payLoad));

    document.querySelector('.boxPergunta').classList.add('hidden');
    document.querySelector('.fundoModal').classList.add('hidden');
})

let timeoutsList = {};

function atualizaPosicaoJogadores(response) {
    for(let x = 0; x < response.game.clients.length; x++) {
        let nomeJogador = response.game.clients[x].playerName;

        console.log({ nomeJogador : response.game.clients[x] })

        if(jogadores[x].posicao != response.game.clients[x].posicao) {

            console.log(`[GAME] Atualiza posição do ${nomeJogador}`)

            let idCasaAnterior = jogadores[x].posicao;
            let idCasaNova = response.game.clients[x].posicao;

            if(idCasaNova > 24) idCasaNova = 24; 
            if(idCasaAnterior == 0) idCasaAnterior = 'Início';

            let casaAntiga = document.querySelector(`.casa[data-idcasa="${idCasaAnterior}"] .estadiaJogador`);
            let casaNova = document.querySelector(`.casa[data-idcasa="${idCasaNova}"] .estadiaJogador`);

            let tmpElement;
            let booleanAlterar = false;

            casaAntiga.childNodes.forEach(child => {
                if(child.dataset.idjogador == nomeJogador) {
                    booleanAlterar = true;
                    tmpElement = child;
                    casaAntiga.removeChild(child)
                }
            })

            if(booleanAlterar == true) casaNova.appendChild(tmpElement);
            jogadores[x].posicao = response.game.clients[x].posicao;
        }
    }
}

ws.onmessage = message => {
    //message.data
    const response = JSON.parse(message.data);
    console.log({[response.method] : response})

    if(vencedor) return;

    //connect
    if (response.method === "connect"){
        clientId = response.clientId;
        console.log("Client id Set successfully " + clientId)
    }

    //create
    if (response.method === "create"){
        gameId = response.game.id;
        console.log("game successfully created with id " + response.game.id)

        btnCriarUmJogo.classList.add('hidden');
        document.querySelector('.boxJoinPartida').classList.add('hidden');

        document.querySelector('.boxCompartilharId').classList.remove('hidden');
        document.querySelector('.idDoJogo').classList.remove('hidden'); 
        document.querySelector('.idDoJogo').innerHTML = response.game.id;

        entrarNaPartida(gameId);
    }

    //update
    if (response.method === "update"){
        if(!document.querySelector('.lobby').classList.contains('hidden')) {
            document.querySelector('.lobby').classList.add('hidden');
            document.querySelector('.tabuleiro').classList.remove('hidden');
        }

        console.log({jogadores})

        atualizaPosicaoJogadores(response);
    }

    //join
    if (response.method === "join"){
        const game = response.game;
        booleanGamemaster = game.gameMaster == clientId ? true : false;
        lastPayload = response.game;

        console.log({clientId})
        console.log({booleanGamemaster})

        while(divPlayers.firstChild)
            divPlayers.removeChild (divPlayers.firstChild)

        game.clients.forEach (jogador => {

            console.log({jogador})

            const div = document.createElement("div");
            div.className = 'jogadorContainer';
            div.innerHTML = `
                <span style="display: block; width: 10px; height: 10px; border-radius: 10px; background-color: ${jogador.color}; margin-right: .5em;"></span>
                <span>${jogador.playerName}</span>
            `;
            divPlayers.appendChild(div);

            if (jogador.clientId === clientId) playerColor = jogador.color;
        })

        document.querySelector('.boxWithPlayers').className = 'boxWithPlayers';

        // if(game.clients.length >= 2 && booleanGamemaster == true) {
        if(booleanGamemaster == true) {
            document.querySelector('.btnIniciarJogo').className = 'btnIniciarJogo button';
        }
    }

    //iniciarPartida
    if (response.method === "iniciarPartida"){
        console.log({'iniciarPartida': response});
        // console.log({'lastPayload': lastPayload});

        QNT_JOGADORES = response.game.clients.length;
        PAYLOADJOGADORES = response.game.clients;

        jogadores = response.game.clients;

        iniciarPartida();
    }

    //escolhaUmaDificuldade
    if (response.method === "escolhaUmaDificuldade"){
        let jogador = response.jogador;

        console.log({jogador})
        console.log({clientId})

        if(!document.querySelector('.escolhaDificuldade').classList.contains('hidden')) document.querySelector('.escolhaDificuldade').classList.add('hidden');
        if(!document.querySelector('.fundoModal').classList.contains('hidden')) document.querySelector('.fundoModal').classList.add('hidden');

        if(jogador == clientId) {
            document.querySelector('.escolhaDificuldade').classList.remove('hidden');
            document.querySelector('.fundoModal').classList.remove('hidden');
        }
    }

    // recebePergunta
    if (response.method === 'recebePergunta') {
        if(perguntaAtual != null && perguntaAtual.titulo == response.pergunta.titulo) return;
        perguntaAtual = response.pergunta;

        let boxPergunta = document.querySelector('.boxPergunta');
        while(boxPergunta.firstChild) boxPergunta.removeChild (boxPergunta.firstChild);

        let tmpTitle = document.createElement('p');
        tmpTitle.innerHTML = perguntaAtual.titulo;
        tmpTitle.className = 'title';
        boxPergunta.appendChild(tmpTitle);

        for(let x = 0; x < perguntaAtual.alternativas.length; x++) {
            let tmpElement = document.createElement('p');
            tmpElement.innerHTML = `${alfaAlternativas[x]}) ${perguntaAtual.alternativas[x]}`;
            tmpElement.setAttribute('data-alternativa', perguntaAtual.alternativas[x]);
            tmpElement.setAttribute('data-alternativaindex', x);
            boxPergunta.appendChild(tmpElement);
        }

        // for(pergunta of perguntaAtual.alternativas) {
        //     let tmpElement = document.createElement('p');
        //     tmpElement.innerHTML = pergunta;
        //     tmpElement.setAttribute('data-alternativa', pergunta);
        //     tmpElement.setAttribute('data-alternativaindex', pergunta);
        //     boxPergunta.appendChild(tmpElement);
        // }

        boxPergunta.classList.remove('hidden');
        document.querySelector('.fundoModal').classList.remove('hidden');
    }

    // retornoDaRespostaDaPergunta
    if (response.method === 'retornoDaRespostaDaPergunta') {
        let avisoDeResposta = document.querySelector('.avisoDeResposta');
        while(avisoDeResposta.firstChild) avisoDeResposta.removeChild (avisoDeResposta.firstChild);

        let resposta = response.booleanResposta == true ? 'acertou' : 'errou';

        let imgElement = document.createElement('img');
        imgElement.src = `imgs/${resposta == 'acertou' ? 'correct' : 'wrong'}.png`;
        avisoDeResposta.appendChild(imgElement)

        let tmpElement = document.createElement('p');
        tmpElement.className = `retornoMessage ${resposta}`;
        tmpElement.innerHTML = resposta == 'acertou' ? `Você acertou!!` : 'Você errou!';
        avisoDeResposta.appendChild(tmpElement);

        avisoDeResposta.classList.remove('hidden');
        document.querySelector('.fundoModal').classList.remove('hidden');

        let tmpDocument = document;

        timeoutsList[response.game.id] = setTimeout(function() {
            tmpDocument.querySelector('.avisoDeResposta').classList.add('hidden');
            tmpDocument.querySelector('.fundoModal').classList.add('hidden');
        }, 3000);
    }

    // vencedorEncontrado
    if (response.method === 'vencedorEncontrado') {
        clearTimeout(timeoutsList[response.game.id]);
        atualizaPosicaoJogadores(response);

        vencedor = response.vencedor;
        let boxVencedor = document.querySelector('.boxVencedor');

        boxVencedor.innerHTML = `FIM DE JOGO!
        ${vencedor.playerName} VENCEU A PARTIDA!`;

        if(vencedor.clientId == clientId) {
            boxVencedor.innerHTML = `PARABÉNS, VOCÊ VENCEU!!`;
        }

        document.querySelector('.boxVencedor').classList.remove('hidden');
        document.querySelector('.fundoModal').classList.remove('hidden');
    }
}