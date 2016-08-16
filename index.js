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
}))

var cookieParser = require('cookie-parser');
app.use(cookieParser());

app.set('view engine', 'ejs');

var upUsers = new Set();
function toArray(set){
	var rtn = [];
	set.forEach(function(ele){
		rtn.push(ele);
	});
	return rtn;
}

app.get('/', function(req, res){
	if(req.session.user == null){
		res.redirect('/login')
	}
	else{
		//res.sendFile(__dirname + '/index.html');
		res.render('index', {msg: ""});
	}
});

app.get('/logout', function(req, res){
	req.session.destroy(function(){
		res.redirect('/');
	});
});

app.get('/login', function(req, res){
	if(req.session.user != null){
		res.render('index', {msg: "Already loged in as " + req.session.user[0]});
	}
	else{
		// res.sendFile(__dirname + '/login.html');
		res.render('login', {error: "", msg: ""});
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
					res.render('login', { error: "Wrong password!", msg: ""});
				}
				else{
					req.session.regenerate(function(){
						req.session.user = [name, pass];
						upUsers.add(name);
						res.cookie('name', name);
						res.redirect('/');
					});
				}
			}
			else {
				coll.insertOne({name: name, pass: pass})
				res.render('login', { error: "", msg: 'Registered! Please login.'})
			}
		});
	});
});

io.on('connection', function(socket){
	console.log("one connected: "+socket.conn.remoteAddress);
	socket.on('chat message', function(msg){
		var ip = socket.conn.remoteAddress;
		var name = msg.split(':')[0];
		var time = Date()
		io.emit('chat message', [msg, ip, time.slice(16,24)]);
		MongoClient.connect(mongoUrl, function(err, db){
			var coll = db.collection("messages");
			coll.insertOne({name: name, message: msg.slice(name.length+2, msg.length), time: time})
		});
	});
	socket.on('one more', function(name){
		io.emit('up users', toArray(upUsers));
	});
	socket.on('one down', function(name){
		upUsers.delete(name);
		io.emit('up users', toArray(upUsers));
	});
});

http.listen(4040, function(){
	console.log('listening on *:4040');
});
