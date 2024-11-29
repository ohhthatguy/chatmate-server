const express = require('express')
const fs = require('fs')
const https = require('https')
const http = require('http')
const socketio = require('socket.io');
const app = express()
// const path = require("path")


let server;
// const __dirname1 = path.resolve();
if(process.env.NODE_ENV === 'production'){
    // app.use(express.static(path.join(__dirname1, "/client/build")));
    // server = app;
    server = http.createServer(app);
    // app.get('*',(req,res)=>{
    //     res.sendFile(__dirname1, "client", "build", "index.html");
    // })

}else{
    
const key = fs.readFileSync('192.168.1.95-key.pem')
const cert = fs.readFileSync('192.168.1.95.pem')
 server = https.createServer({key,cert},app) //create a http server from express that handles the socket.io requests


}


//attach the socket.io to server with cors

//new Server = socketio
const io = socketio(server,{cors: {
//   origin: 'http://localhost:3001',      //react frontend is runing in 3001,
  origin: process.env.NODE_ENV === 'production' ? 
  'https://chatmatev1-theta.vercel.app':
  [`${process.env.URL_TO_FRONTEND}`,'*'],
  methods: ["GET", "POST", "UPDATE", "DELETE"]

}}) 

let roomIdServerVar;
let localUserConsumer;
let userInPrivateRoom = [];
let chatHistory = [];
let newTabFromCallerSide;
let newTabFromRecieverSide;


let recieverOffer = {
    
        localUserId: '',
        localOffer: '',
        localIceCandidate: [],
        remoteUserId: '',
        remoteOffer: '',
        remoteIceCandidate: [],
        tabId: ''
    

};

let callerOffer = {
    
    localUserId: '',
    localOffer: '',
    localIceCandidate: [],
    remoteUserId: '',
    remoteOffer: '',
    remoteIceCandidate: [],
    tabId:''


};

const socket = ()=>{


    io.on('connection', (socket) => {

        console.log('a user connected with id: ', socket.id);

        socket.on('create-unique-roomID-for-private-room',(localUser)=>{
            roomIdServerVar = Math.floor(Math.random()*5000) //4digit unique roomID
            
            if(roomIdServerVar < 1000){
                roomIdServerVar = "0" + roomIdServerVar
            }else if(roomIdServerVar < 100){
                roomIdServerVar = "00" + roomIdServerVar
            }else if(roomIdServerVar < 10){
                roomIdServerVar = "000"+roomIdServerVar
            }


            //craetor joins the room
            socket.join(roomIdServerVar)
            console.log(`{${localUser.name} : ${localUser.id} can connect to roomId: ${roomIdServerVar}}`)
            userInPrivateRoom = [...userInPrivateRoom, {id: localUser.id, name: localUser.name}]

            
            socket.emit('notif-that-this-user-is-room-creater', localUser)
       

            io.emit('send-unique-roomID-for-private-room', roomIdServerVar,localUser )

         

        })


        socket.on('check-if-roomID-is-correct', (enteredRoomId)=>{

            if(roomIdServerVar == enteredRoomId){
                socket.emit('roomId-is-right', enteredRoomId)
            }else{
                socket.emit('roomId-is-wrong')

            }

        })

        //enterroom
        socket.on('join-this-user-to-roomID', (localUser)=>{

            localUserConsumer={...localUser}

            socket.join(roomIdServerVar)
            console.log(`{${localUser.name} : ${localUser.id} is connected to roomId: ${roomIdServerVar}}.`)
            userInPrivateRoom = [...userInPrivateRoom, {id: localUser.id, name: localUser.name}]

            //since now finally user beside the creater in joined to the same room, we can do funcitnalities

            socket.to(roomIdServerVar).emit('user-joined-remove-blur-in-createRoom')

            socket.to(roomIdServerVar).emit('give-room-creator-detail')  
 
        })

        socket.on('take-room-creator-detail', (localUserCreator)=>{

            io.to(roomIdServerVar).emit('save-room-creator-detail', localUserCreator,roomIdServerVar) //who is roomCreator is to be saved to both sender and reciver side

            io.to(roomIdServerVar).emit('notif-this-is-roomCreator', localUserCreator)
            io.to(roomIdServerVar).emit('send-notif-that-this-user-joined', localUserConsumer)  //who joined msg is to be seen to both sender and reciver side

            //take all the messages passed until now and then show this user every message that is not a notif i.e message exchanged between user
            // console.log('1')
            // console.log(chatHistory)

            // console.log('////')
            
            // console.log(chatHistory)

            
            // if(chatHistory.length > 0){

                //new user has enterd while other user are already connected
                chatHistory = [{ message: 'waiting for People to join...', sender: 'System', senderId: '', roomId: '', isNotification: true}, { message: `${localUserCreator.name} has joined the room.`, sender: 'System', senderId: '', roomId: localUserCreator.roomID, isNotification: true}]

                let temp = {message: `${localUserConsumer.name} has joined the room`, sender: 'System', senderId: '', roomId: '', isNotification: true}
                chatHistory = [...chatHistory, temp]

                // console.log(chatHistory)

                io.to(roomIdServerVar).emit('chat-history-to-display', chatHistory)
                chatHistory=[]

        // }
               
            

        })

        socket.on('all-prev-msg', (message)=>{
            socket.emit('chat-history-to-display', message) //display messages to other not him
        })


        socket.on('send-msg',(message,temp)=>{
            // console.log('2')
            
            // console.log(message)
            chatHistory = [...message,temp]
           
            // console.log('chatSendMsgRoomID: ',roomIdServerVar)

            socket.to(roomIdServerVar).emit('recieve-msg',temp) //since the sender itself has already had the message and only other side has to take the message then
        })

        socket.on('people-in-room-excpet-me',(localUser)=>{
            let tempClients = io.sockets.adapter.rooms.get(roomIdServerVar)
            clients = [...tempClients]
            // console.log(clients)

            clients = clients.filter((e)=> e !== localUser.id)



            let peopleICanCall = [];
            clients.map((e)=>{
                if(e == callerOffer.localUserId || e == callerOffer.remoteUserId){
                    peopleICanCall = [...peopleICanCall, {
                        id: e,
                        status: 'alreadyOnCall'
                    }]
                }else{
                    peopleICanCall = [...peopleICanCall, {
                        id: e,
                        status: 'readyToCall'
                    }]
                }
            })

            console.log('[][][][][]');
            console.log(peopleICanCall);
            console.log('[][][][][]');

            
            // console.log('////////////')
            // console.log(localUser.name)
            // console.log(clients)
            // console.log(userInPrivateRoom)
            // socket.emit('take-people-in-room-excpet-me', clients,userInPrivateRoom)
            socket.emit('take-people-in-room-excpet-me', peopleICanCall,userInPrivateRoom)

            // socket.to(roomIdServerVar).emit('take-people-in-room-excpet-me', clients,userInPrivateRoom)
            // io.to(roomIdServerVar).emit('take-people-in-room-excpet-me', clients,userInPrivateRoom)

        })

//this gets active when the videocallicon is pressed, so this is the one which inititaes the call
//so the localUserId and remoteUserId are added here because this is the starting point of the vid call
        socket.on('show-incoming-call-modal-from-this-user', (caller, reciever)=>{
            console.log('///////////////////')
            console.log('caller:',caller.name)
            console.log('reciever:', reciever.name, reciever.id)
            console.log('|||||||||||||||||||||||')

            callerOffer = {...callerOffer, localUserId: caller.id, remoteUserId: reciever.id }
            // recieverOffer = {...recieverOffer, localUserId: reciever.id, remoteUserId: caller.id }


            // console.log(offer)

            socket.to(reciever.id).emit('show-incoming-call-modal-from-this-user-to-reciever', caller)

            
        })

        socket.on('i-am-new-tab-from-caller-side', (newTabSocketId)=>{
            // console.log('asjdoiasdj')
            newTabFromCallerSide = newTabSocketId;
            callerOffer = {...callerOffer, tabId: newTabSocketId}
          
        })

      

        socket.on('i-am-new-tab-from-reciever-side', (newTabSocket)=>{
            newTabFromRecieverSide = newTabSocket
           
            recieverOffer = {...recieverOffer, tabId: newTabSocket}


            console.log('6. reciever is online now send him offer of caller: ', newTabFromRecieverSide)

            // console.log('///caller///');
            // console.log(callerOffer);

            // console.log('////caller///');

            // console.log('///reciever//');
            // console.log(recieverOffer);
            // console.log('//reciever//');
            
            if(callerOffer.localOffer){
                io.to(newTabFromRecieverSide).emit('recieverIsOnlineSendOffer', callerOffer)

            }else{
                console.log('offer from caller has not been saved in socket server yet!')
            }

        })



//call end btn is pressed in reciever side
        socket.on('call-ended-in-reciever-side',(caller)=>{
            // console.log('call-ended-from-recievr')
            // console.log('caller: ', caller.id, caller.name)
            // console.log('newTabSocket: ', newTabFromCallerSide)

            socket.to(newTabFromCallerSide).emit('end-call')

        })
   
//call end btn is pressed in caller side
        socket.on('call-end-in-caller-side', (recieverId)=>{
            console.log('call-ended-from-calelr')
            console.log(recieverId)

            socket.to(recieverId).emit('end-call')
            if(newTabFromRecieverSide){
                socket.to(newTabFromRecieverSide).emit('end-call');
            }

         
             recieverOffer = {
            
                localUserId: '',
                localOffer: '',
                localIceCandidate: [],
                remoteUserId: '',
                remoteOffer: '',
                remoteIceCandidate: [],
                tabId: ''
            
        
        };
        
         callerOffer = {
            
            localUserId: '',
            localOffer: '',
            localIceCandidate: [],
            remoteUserId: '',
            remoteOffer: '',
            remoteIceCandidate: [],
            tabId:''
         };
        
        

        })

//call end on RecieveCall component
        socket.on('call-end-in-RecieveCall', (callerID)=>{

            socket.to(newTabFromCallerSide).emit('end-call');
           
             recieverOffer = {
            
                localUserId: '',
                localOffer: '',
                localIceCandidate: [],
                remoteUserId: '',
                remoteOffer: '',
                remoteIceCandidate: [],
                tabId: ''
            
        
        };
        
         callerOffer = {
            
            localUserId: '',
            localOffer: '',
            localIceCandidate: [],
            remoteUserId: '',
            remoteOffer: '',
            remoteIceCandidate: [],
            tabId:''
         };
        
        

        })

       

        socket.on('give-me-ice-candi-from-reciever',()=>{
            console.log('22. requesting recievr for its ice candi from server')
            io.to(newTabFromRecieverSide).emit('provide-ice-candi-to-caller')
        })

        socket.on('give-me-ice-candi-from-caller',()=>{
           


            console.log('7. requesting caller id for its icecandi from reciever')
            io.to(newTabFromCallerSide).emit('provide-ice-candi-to-reciever')
        })


        socket.on('iceCandiAddingComplete-in-reciever-side', (iceInfoRecieverSide)=>{
            console.log('///28. ice candi from reciver reached socketserver///')     
            
            iceInfoRecieverSide.map((e)=>{
                recieverOffer = {...recieverOffer, localIceCandidate: [...recieverOffer.localIceCandidate, e.iceCandidate]}
            })

            // console.log(recieverOffer)
            console.log('29. recever ice candi is sent to caller')
            socket.to(newTabFromCallerSide).emit('save-ice-candi-of-reciever', recieverOffer)

        })
      
        socket.on('iceCandiAddingComplete-in-caller-side', (iceInfoCallerSide)=>{

            console.log('///21. ice candi from caller reached socketserver///')            

            iceInfoCallerSide.map((e)=>{
                callerOffer = {...callerOffer, localIceCandidate: [...callerOffer.localIceCandidate, e.iceCandidate]}
            })
            
            // console.log(callerOffer)
            console.log('22. caller ice candi is sent to reciver')

            socket.to(newTabFromRecieverSide).emit('save-ice-candi-of-caller', callerOffer)
            

        })

        socket.on('take-answer-and-set-remote-to-caller', (answer)=>{
            console.log('14. answer from reciever reached socket server')
            
            io.to(newTabFromCallerSide).emit('set-remote-descrip-this-answer', answer)
        })

        socket.on('save-offer-from-caller-side', (localOffer)=>{
            console.log('5.saving offer from caller user')
            callerOffer = {...callerOffer, localOffer: localOffer}
        })


        socket.on('disconnect', () => {
           
            console.log(`User disconnected with ID: ${socket.id}`);

        });
      });




}

//this server is for socket.io fucntion only that is written in socket.js file
server.listen(4000, () => {
    userInPrivateRoom = []
    chatHistory = []
     recieverOffer = {
    
        localUserId: '',
        localOffer: '',
        localIceCandidate: [],
        remoteUserId: '',
        remoteOffer: '',
        remoteIceCandidate: [],
        tabId: ''
    

};

 callerOffer = {
    
    localUserId: '',
    localOffer: '',
    localIceCandidate: [],
    remoteUserId: '',
    remoteOffer: '',
    remoteIceCandidate: [],
    tabId:''


};
   
    console.log('socket.io server is running in 4000');
});



module.exports = socket
