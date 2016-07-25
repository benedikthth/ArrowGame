window.requestAnimFrame = ( function() {
	return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				function( callback ) {
					window.setTimeout( callback, 1000 / 60 );
				};
})();
/**/

var player = {
  name : null,
  x: 20,
	y: 100,
  shoot : function(power, angle){
		var arw = new Arrow(this.x, this.y, power, angle, this.name);
		A.projectiles.push(arw);
		if(A.socket.readyState == 1){
			sendProjectile(A.socket, arw);
		}
	},
	draw : function(ctx){
		ctx.strokeRect(this.x, this.y, 15, 30);
	},
	contains: function(pt){
		if(pt.x > this.x && pt.x < this.x+15 && pt.y > this.y && pt.y < this.y+30){
			return true;
		}
		return false;
	}
};

var opponent = {
	connected : false,
	name : null,
	x: 20	,
	y: 100,
	draw: player.draw,
	contains: player.contains
};

function Arrow(x, y, velocity, angle, owner) {
	this.x = x;
	this.y = y;
	this.owner = owner;
	this.angle = angle;
	var rad = angle * Math.PI / 180;
	this.power = velocity;
	this.xVelocity = Math.cos(rad) * velocity;
	this.yVelocity = Math.sin(rad) * velocity;
}
Arrow.prototype = {
	// body...
	update: function() {
		var rads = this.angle * 180 /Math.PI;
		if(this.xVelocity !== 0){
			this.yVelocity += 0.1;
			var halfPt = {x:this.x += this.xVelocity/3, y:this.y += this.yVelocity/3};
			this.x += this.xVelocity;
			this.y += this.yVelocity;

			this.angle = Math.atan2(this.yVelocity, this.xVelocity)*(180/Math.PI);

			var pt = {x: this.x, y:this.y};
			if( player.contains(pt) || opponent.contains(pt) || player.contains(halfPt) || opponent.contains(halfPt) ){
				this.xVelocity = 0;
				this.yVelocity = 0;
			}
		}
		return 1;
	},
	draw: function(cx){
		cx.beginPath();
		var rads = this.angle * Math.PI / 180;
		cx.moveTo(this.x, this.y);
		cx.lineTo(this.x-Math.cos(rads)*10, this.y-Math.sin(rads)*10);
		cx.stroke();
		cx.arc(this.x, this.y, 2, 0, 2*Math.PI);
		cx.fill();
	}
};
/*functional */
function dist(p1, p2) {
  var dx = p1.x - p2.x,
      dy = p1.y - p2.y;
  return Math.sqrt( (dx*dx)+(dy*dy) );
}
function calcAngle(p1, p2) {
  /*Takes in 2 points and returns the angle of pt2 relative to pt1*/
  var dx = p1.x - p2.x;
  var dy = p1.y - p2.y;
  var theta = Math.atan2(dy, dx);
  return theta * 180 / Math.PI;
}
/**/
var A = {
  canvas : null,
  ctx : null,
  socket : null,
  projectiles : [],
	mouse :  {x: 0, y: 0, d: false, originClick: {}	}
};
/**/
var mouseUp = function(ev){
	A.mouse.d = false;
	var p = dist(A.mouse, A.mouse.originClick) / 30;
	var an = calcAngle(A.mouse.originClick, A.mouse);
	player.shoot(p, an);
};
var click = function(ev) {
	A.mouse.d = true;
	A.mouse.originClick = {x: A.mouse.x, y: A.mouse.y};
};
var mouseMove = function(ev){
	var rect = A.canvas.getBoundingClientRect();
	A.mouse.x = ev.clientX - rect.left;
	A.mouse.y = ev.clientY - rect.top;

};
function AddEvs(){
	A.canvas.addEventListener('mousedown', click);
	window.addEventListener('mouseup', mouseUp);
	window.addEventListener('mousemove', mouseMove);
}
function draw(){
	A.ctx.clearRect(0,0,1000,1000);
  for (var i = 0; i < A.projectiles.length; i++) {
		A.projectiles[i].update();
    A.projectiles[i].draw(A.ctx);
  }
	if(opponent.connected){
		opponent.draw(A.ctx);
	}
	player.draw(A.ctx);
	if(A.mouse.d && A.mouse.originClick){
		A.ctx.beginPath();
		A.ctx.moveTo(A.mouse.originClick.x, A.mouse.originClick.y);
		A.ctx.lineTo(A.mouse.x, A.mouse.y);
		A.ctx.stroke();

		A.ctx.fillText(calcAngle(A.mouse, A.mouse.originClick) + "", A.mouse.x - 6, A.mouse.y - 6 );
		A.ctx.fill();
	}

	requestAnimFrame(draw);
}


/**/
var initSocket = function(){
	A.socket = new WebSocket('ws://arrow.ws.spock.is');
	A.socket.onopen = function(bla){
	};
	A.socket.onmessage = function(message){
		var msg = JSON.parse(message.data);
		if(msg.type == 'uidQuery'){
			sendUname(A.socket);
		}
		else if(msg.type == 'usernameTaken'){
			player.name = prompt('UserName Taken');
			sendUname(A.socket);
		}
		else if(msg.type == 'matchupConfirmation'){
			console.log('you are now matched with '+ msg.content);

			opponent.name = msg.content;
			opponent.connected = true;
			if(player.requested){
				player.x = 600;
			}else{
				opponent.x = 600;
			}
		}
		else if(msg.type == 'opponentFired'){
			var arw = JSON.parse(msg.content);
			A.projectiles.push(new Arrow(arw.x, arw.y, arw.power, arw.angle, arw.owner));
		}
		else if(msg.type == 'ping'){
			A.socket.send(JSON.stringify({type:'pong',content:'2'}));
		}
	};

	A.socket.onclose = function(){
		console.log('Socket Closed');
	};
};

function sendProjectile(socket, projectile){
	var msg = {
		type: 'projectile',
		content: JSON.stringify(projectile)
	};
	socket.send(JSON.stringify(msg));
}
function sendUname(socket) {
	var reply = {
		type: 'uidconfirmation',
		content: player.name
	};
	socket.send(JSON.stringify(reply));
}
function requestMatch(socket){
	var rUid = prompt('Username of opponent:');
	socket.send(JSON.stringify({
		type: 'matchRequest',
		content: rUid
	}));
	player.requested = true;
}

function req(){
	console.log('dok');
	requestMatch(A.socket);
}

function init() {
	player.name = prompt("username");
	initSocket();
  A.canvas = document.createElement('canvas');
	A.canvas.height = 300;
	A.canvas.width = 750;
  A.ctx = A.canvas.getContext('2d');
  document.body.appendChild(A.canvas);
	AddEvs();
  draw();
}
init();
