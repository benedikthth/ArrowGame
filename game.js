var WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({ port: 6625});

var clients = [];
//a bow-game server!
wss.on('connection', function connection(client){
  askUsername(client);
  client.pingssent = 0;
  client.interval = setInterval(function() {
    if (client.pingssent >= 3) {
      client.close();
    } else {
      ping(client);
      client.pingssent++;
    }
  }, 55*1000);


  client.on('message', function doStuff(incomingTransmission){
    var msg = JSON.parse(incomingTransmission);
    if(msg.type == 'projectile'){
      //{type:'fire', data:{object}}
      if(!client.opponent){return; }
      var arrowMessage = {
        type: 'opponentFired',
        content: msg.content
      };
      console.log('client ' + client.customUid + ' fired on ' + client.opponent);
      clients[client.opponent].send(JSON.stringify(arrowMessage));
    }
    else if(msg.type == 'uidconfirmation'){
      //{type:'uidconfirmation', content:'username'}
      if(!clients[msg.content]){
        //client with name = content does not exist
        client.customUid = msg.content;
        clients[msg.content] = client;

      }
      else {
        //request client re-choose username!
        client.send(JSON.stringify({type:'usernameTaken'}));
      }
    }
    else if(msg.type == 'matchRequest') {
      // {type:'matchRequest', content:'requestUsername'}
      if(!clients[msg.content]){
        //client with username does not exist
        console.log('non existant client matchrequested: ' + client.customUid + ' -> ' + msg.content);
        client.send(JSON.stringify({type:'statusMessage', content:'Client with name < '+msg.content+ ' > does not exist'}));
      }
      else {
        //client exists!
        if(clients[msg.content].opponent){
          //request already has an opponent
          client.send(JSON.stringify({type:'statusMessage', content:'Client with name < '+msg.content+ ' > already has an opponent'}));
          return;
        }
        else if(msg.content == client.customUid){
          // cannot opponent yourself
          client.send(JSON.stringify({type:'statusMessage', content:'Cannot compete agains yourself'}));
          return;
        }
        else {
          client.opponent = msg.content;
          clients[msg.content].opponent = client.customUid;
          sendMatchConfirmation(client);
          sendMatchConfirmation(clients[client.opponent]);
        }

      }
    }
    else if(msg.type == 'pong'){
      console.log('pong <- ' + client.customUid);
      client.pingssent = 0;
    }

  });
  client.on('close', function(){
    if(client.opponent){
      //todo:send disconnect notice to opponent
      //remove opponents' opponent
      clients[client.opponent].opponent = null;
    }
    clearInterval(client.interval);
    clients[client.customUid] = null;
  });
});

function ping(client){
  console.log('ping -> ' + client.customUid);
  client.send(JSON.stringify({type:'ping', content:'1'}));
}

function sendMatchConfirmation(client){
  var mesg = {
    type: 'matchupConfirmation',
    content: client.opponent
  };
  client.send(JSON.stringify(mesg));
}
function askUsername(client){
  //send a message that should be answered with a type: 'uidconfirmation'
  var snd = {
    type: "uidQuery",
    content: "please Select UserName"
  };
  client.send(JSON.stringify(snd));
}
