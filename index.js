var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log("one connected: "+socket.conn.remoteAddress);
  socket.on('chat message', function(msg){
  	var ip = socket.conn.remoteAddress
    io.emit('chat message', [msg, ip.slice(7,ip.length), Date()]);
  });
});

http.listen(4040, function(){
  console.log('listening on *:4040');
});
