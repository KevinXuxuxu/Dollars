var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var MongoClient = require('mongodb').MongoClient;
var mongoUrl = "mongodb://localhost:27017/dollars";

var session = require('express-session');
app.set('trust proxy', 1);
app.use(session({
	secret: "cat concerto",
	resave: false,
	saveUninitialized: false,
	//cookie: { secure: true }
}))

var cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/', function(req, res){
	if(req.session.user == null){
		res.redirect('/login')
	}
	else{
		res.sendFile(__dirname + '/index.html');
	}
});

app.get('/logout', function(req, res){
	// destroy the user's session to log them out
	// will be re-created next request
	req.session.destroy(function(){
		res.redirect('/');
	});
});

app.get('/login', function(req, res){
	if(req.session.user != null){
		res.send("Already loged in as " + req.session.user[0]);
	}
	else{
		res.sendFile(__dirname + '/login.html');
	}
});

app.post('/login', function(req, res){
	var name = req.body.name;
	var pass = req.body.password;

	MongoClient.connect(mongoUrl, function(err, db){
		var coll = db.collection("users")
		coll.find({name: name}).toArray(function(err, docs){
			if(docs.length != 0) {
				if(docs[0]["pass"] != pass){
					res.send("wrong password!")
				}
				else{
					req.session.regenerate(function(){
						req.session.user = [name, pass];
						res.cookie('name', name);
						res.redirect('/');
					});
				}
			}
			else {
				coll.insertOne({name: name, pass: pass})
				res.send('registered')
			}
		});
	});
});

io.on('connection', function(socket){
	console.log("one connected: "+socket.conn.remoteAddress);
	socket.on('chat message', function(msg){
		var ip = socket.conn.remoteAddress
		io.emit('chat message', [msg, ip.slice(7,ip.length), Date().slice(16,24)]);
	});
});

http.listen(4040, function(){
	console.log('listening on *:4040');
});
