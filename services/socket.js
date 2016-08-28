`
	The initiateSocket function gets executed in app.js whenever the server is first created. From there, it uses the io
	input parameter to take care of all incoming websocket connections.

	@inputs:
			io 			: 	 the object created from the socket.io module
			client 		: 	 client has a handle to the Redis database


	The websocket is listening to the following events:
		connection 		: 	executed when a new user connects to the server
		disconnect 		: 	executed when a user disconnects from the server
		chat message	: 	used in contact.html whenever a user sends a message in the chat log
`
const config = require('config');

function initiateSocket(io,client){
	var usersOnline = 0;
	io.on('connection', (socket) =>{
		usersOnline++;

		io.emit('usersOnline', usersOnline);

	    socket.on('chat message', (msg) => {
	    	//console.log(msg);
	        io.emit('chat message', msg);
	    });

	    socket.on('joined-chat', (name) => {
	    	io.emit('new-user', name);
	    });

	    socket.on('disconnect', () =>{
	    	usersOnline--;
	    	io.emit('usersOnline', usersOnline);
	        // disconnection logic
	    });

	    socket.on('revision', (msg) => {
	    	let revision;
	    	try{
	    		revision = config.revision;
	    	} catch(err){
	    		revision = -1; // error
	    	}
	    	io.emit('revision', revision);
	    });
	});
}

module.exports = {
	initiateSocket
}
