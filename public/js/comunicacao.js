let ws = new WebSocket("ws://localhost:80")
// let ws = new WebSocket("ws://localhost:9090")

ws.onmessage = message => {
    //message.data
    const response = JSON.parse(message.data);
    // console.log({ [response.method]: response })

    if (vencedor) return;

    //connect
    if (response.method === "connect") {
        clientId = response.clientId;
        console.log("Client id Set successfully " + clientId)
    }

    //create
    if (response.method === "create") {
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
    if (response.method === "update") {
        if (!document.querySelector('.lobby')?.classList.contains('hidden')) {
            document.querySelector('.lobby').classList.add('hidden');
            document.querySelector('.tabuleiro').classList.remove('hidden');
        }

        // console.log({ jogadores })

        atualizaPosicaoJogadores(response);
    }

    //join
    if (response.method === "join") {
        const game = response.game;
        booleanGamemaster = game.gameMaster == clientId ? true : false;
        lastPayload = response.game;

        console.log({ clientId })
        console.log({ booleanGamemaster })

        while (divPlayers.firstChild)
            divPlayers.removeChild(divPlayers.firstChild)

        game.clients.forEach(jogador => {

            console.log({ jogador })

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
        if (booleanGamemaster == true) {
            document.querySelector('.btnIniciarJogo').className = 'btnIniciarJogo button';
        }
    }

    //iniciarPartida
    if (response.method === "iniciarPartida") {
        console.log({ 'iniciarPartida': response });

        QNT_JOGADORES = response.game.clients.length;
        PAYLOADJOGADORES = response.game.clients;

        jogadores = response.game.clients;

        iniciarPartida();

        if(booleanGamemaster == true) document.querySelector('.encerrarPartida').classList.remove('hidden');
    }

    //escolhaUmaDificuldade
    if (response.method === "escolhaUmaDificuldade") {
        let jogador = response.jogador;

        console.log({ jogador })
        console.log({ clientId })

        if (!document.querySelector('.escolhaDificuldade').classList.contains('hidden')) document.querySelector('.escolhaDificuldade').classList.add('hidden');
        if (!document.querySelector('.fundoModal').classList.contains('hidden')) document.querySelector('.fundoModal').classList.add('hidden');

        if (jogador == clientId) {
            document.querySelector('.escolhaDificuldade').classList.remove('hidden');
            document.querySelector('.fundoModal').classList.remove('hidden');
        }
    }

    // recebePergunta
    if (response.method === 'recebePergunta') {
        if (perguntaAtual != null && perguntaAtual.titulo == response.pergunta.titulo) return;
        perguntaAtual = response.pergunta;

        let boxPergunta = document.querySelector('.boxPergunta');
        while (boxPergunta.firstChild) boxPergunta.removeChild(boxPergunta.firstChild);

        let tmpTitle = document.createElement('p');
        tmpTitle.innerHTML = perguntaAtual.titulo;
        tmpTitle.className = 'title';
        boxPergunta.appendChild(tmpTitle);

        for (let x = 0; x < perguntaAtual.alternativas.length; x++) {
            let tmpElement = document.createElement('p');
            tmpElement.innerHTML = `${alfaAlternativas[x]}) ${perguntaAtual.alternativas[x]}`;
            tmpElement.setAttribute('data-alternativa', perguntaAtual.alternativas[x]);
            tmpElement.setAttribute('data-alternativaindex', x);
            boxPergunta.appendChild(tmpElement);
        }

        boxPergunta.classList.remove('hidden');
        document.querySelector('.fundoModal').classList.remove('hidden');
    }

    // recebePerguntaAposErro
    if (response.method === 'recebePerguntaAposErro') {
        exibeMensagemDeErroOuAcerto(response);
    }

    // retornoDaRespostaDaPergunta
    if (response.method === 'retornoDaRespostaDaPergunta') {
        let avisoDeResposta = document.querySelector('.avisoDeResposta');
        while (avisoDeResposta.firstChild) avisoDeResposta.removeChild(avisoDeResposta.firstChild);

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

        timeoutsList[response.game.id] = setTimeout(function () {
            tmpDocument.querySelector('.avisoDeResposta').classList.add('hidden');
            tmpDocument.querySelector('.fundoModal').classList.add('hidden');
        }, 3000);
    }

    // vencedorEncontrado
    if (response.method === 'vencedorEncontrado') {
        clearTimeout(timeoutsList[response.game.id])
        atualizaPosicaoJogadores(response);

        let containerGeral = limparTela();

        let vencedor = response.vencedor;

        let boxVencedor = document.createElement('div');
        boxVencedor.className = 'boxVencedor';
        boxVencedor.innerHTML = `FIM DE JOGO!
        ${vencedor.playerName} VENCEU A PARTIDA!`;

        if (vencedor.clientId == clientId) {
            boxVencedor.innerHTML = `PARABÉNS, VOCÊ VENCEU!!`;
        }

        let tmpRankingElement = document.createElement('div');
        tmpRankingElement.className = 'ranking';

        tmpRankingElement.innerHTML += `
            <p style="font-weight: bold; margin: 0 0 1.5em !important; color: #a8901; text-align: center;">Veja abaixo os últimos vencedores</p>`;

        console.log(response.rankingVencedores)

        for (let x = 0; x <= response.rankingVencedores.length; x++) {
            let posicao = x + 1;
            if(response.rankingVencedores[x] == null || response.rankingVencedores[x] == undefined) continue;
            tmpRankingElement.innerHTML += `<p style="text-align: left; color: black; font-family: Poppins;">${posicao}) ${response.rankingVencedores[x].playerName}`;
        }

        boxVencedor.innerHTML += `<button class="buttonPadrao jogarNovamente" onclick="location.reload(true);">Jogar novamente!</button>`

        containerGeral.appendChild(boxVencedor);
        containerGeral.appendChild(tmpRankingElement);
    }

    if (response.method === 'partidaEncerradaInatividade') {
        clearTimeout(timeoutsList[response.game.id])

        let containerGeral = limparTela();

        let tmpComponent = document.createElement('p');
        tmpComponent.innerHTML = `<img src="./imgs/timeout.png"> Partida encerrada por inatividade`;
        tmpComponent.className = 'boxInatividade';

        containerGeral.appendChild(tmpComponent);
        console.log('Partida encerrada por inatividade')
    }

    if (response.method === 'pularPerguntaVerRespostaRetorno') {
        clearTimeout(timeoutsList[response.game.id])
        let alternativas = document.querySelectorAll('.boxPergunta p');

        console.log({ respostaCorreta: response.alternativaCorreta })

        alternativas.forEach(item => {
            if (item.dataset['alternativaindex'] == response.alternativaCorreta) {
                item.setAttribute('style', 'color: green !important; font-weight: bold;');
            }
        })

        let tmpDocument = document;

        timeoutsList[response.game.id] = setTimeout(function () {
            tmpDocument.querySelector('.boxPergunta').classList.remove('bloqueiaRespostas');
            tmpDocument.querySelector('.boxPergunta').classList.add('hidden');
            tmpDocument.querySelector('.fundoModal').classList.add('hidden');
        }, 3500);
    }
}

function exibeMensagemDeErroOuAcerto(response) {
    let avisoDeResposta = document.querySelector('.avisoDeResposta');
    while (avisoDeResposta.firstChild) avisoDeResposta.removeChild(avisoDeResposta.firstChild);

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

    timeoutsList[response.game.id] = setTimeout(function () {
        tmpDocument.querySelector('.avisoDeResposta').classList.add('hidden');
        tmpDocument.querySelector('.fundoModal').classList.add('hidden');

        if (response.method === 'recebePerguntaAposErro') exibirPerguntaAtual(response);
    }, 1500);
}

function exibirPerguntaAtual(response) {
    // if (perguntaAtual != null && perguntaAtual.titulo == response.pergunta.titulo) return;
    perguntaAtual = response.pergunta;

    let boxPergunta = document.querySelector('.boxPergunta');
    while (boxPergunta.firstChild) boxPergunta.removeChild(boxPergunta.firstChild);

    let tmpTitle = document.createElement('p');
    tmpTitle.innerHTML = perguntaAtual.titulo;
    tmpTitle.className = 'title';
    boxPergunta.appendChild(tmpTitle);

    for (let x = 0; x < perguntaAtual.alternativas.length; x++) {
        let tmpElement = document.createElement('p');
        tmpElement.innerHTML = `${alfaAlternativas[x]}) ${perguntaAtual.alternativas[x]}`;
        tmpElement.setAttribute('data-alternativa', perguntaAtual.alternativas[x]);
        tmpElement.setAttribute('data-alternativaindex', x);
        boxPergunta.appendChild(tmpElement);
    }

    if (response.method === 'recebePerguntaAposErro') {
        let tmpButton = document.createElement('button');
        tmpButton.className = 'buttonPadrao verResposta';
        tmpButton.innerText = 'Pular pergunta e ver a resposta';
        tmpButton.setAttribute('onclick', `pularPerguntaVerResposta()`)
        boxPergunta.appendChild(tmpButton);
    }

    boxPergunta.classList.remove('hidden');
    document.querySelector('.fundoModal').classList.remove('hidden');
}

function pularPerguntaVerResposta() {
    document.querySelector('.boxPergunta').classList.add('bloqueiaRespostas');

    const payLoad = {
        "gameId": gameId,
        "jogador": clientId,
        "method": "pularPerguntaVerResposta"
    }

    ws.send(JSON.stringify(payLoad));
}