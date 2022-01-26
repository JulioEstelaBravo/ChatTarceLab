const app = require('express')();
const http = require('http').createServer(app)
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
var mongoose = require('mongoose');

var usuarios = new Map()
var colores = ['red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange']
colores.sort(function(a,b) { return Math.random() > 0.5; })
var countUsersAll = 0

 const uri; //aqui iria el enlace y la clave de la base de datos por seguridad lo hemos quitado
 //'mongodb+srv://<user>:<password>@cluster0.yi9dg.mongodb.net/<nombre_base_datos>?retryWrites=true&w=majority'
// ===========< MONGODB >==========
// Conexión
 mongoose.connect(
   uri,
  {useNewUrlParser: true, useUnifiedTopology: true},
   err => {
       if (err) throw err;      
       console.log(`${new Date()} => Conexión establecida con MongoDB`);
   }
 )
 // Esquema de datos
 var esquema = new mongoose.Schema({
   time: Date,
   text: String,
   author: String,
   color: String,
 });
 // Modelo
 var MensajeModelo = mongoose.model('Mensajes', esquema );
 // Función para guardar mensaje
 function saveMensaje(msg){
   var instancia = new MensajeModelo(
       {
          time:msg.time,
           text:msg.text,
           author:msg.author,
           color:msg.color
       }
   )
   instancia.save()
 }


// ===========< SERVIDOR >==========
// Listen
http.listen(port, () => {
    console.log(`${new Date()} => Servidor levantado en el puerto: ${port}`)
})

// Controlador GET para entregar el cliente
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
});

 // ===========< SOCKET.IO >==========
 io.on('connection', (socket) => {
   console.log((new Date()) + ' => Nueva conexión aceptada')
   var userName = "Desconocido"
   var index = -1
  var userColor
  
   // Cargamos todos los mensajes
   MensajeModelo.find(function(err,msgs){
      socket.emit('history',JSON.stringify(msgs))
   })

   // Definir nombre de usuario
   socket.on('user',(msg) => {
       userName = msg
       if(userColor != null) colores.push(userColor)
       userColor = colores.shift()

       if(index<0){
           index = countUsersAll++
       }

       usuarios.set(index,userName)
       console.log(`${new Date()} => Usuario ${index} identificado como: ${msg}`)
       socket.emit('color',userColor)
       io.emit('users chat',Array.from(usuarios.values()).join(" | "))
   })

   // Nuevo mensaje
   socket.on('chat message', (msg) => {
       var objMsg = {
          time: (new Date()).getTime(),
           text: msg,
           author: userName,
           color: userColor
       }
       console.log(`${new Date()} => Mensaje de ${userName}: ${msg}`)
       saveMensaje(objMsg)
       io.emit('chat message', JSON.stringify(objMsg))
   })

//   // Dexconexión del usuario
   socket.on('disconnect',()=>{
       console.log(`${new Date()} => Usuario ${userName} desconectado`)
       usuarios.delete(index)
      colores.push(userColor)
       io.emit('users chat',Array.from(usuarios.values()).join(" | "))
   })

})
