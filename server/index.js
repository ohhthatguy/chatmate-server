const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors()) 
app.use(express.json())



//routes
// const router = require('./routes/routes')
// app.use('/',router)

//server for handling REST routes is set to 4000
app.listen(5000, ()=>{
  console.log('PORT route is running in 5000')
})

//database
// const database = require('./database/database')
// database(process.env.DB_URL)


//socket config
const socket = require('./socket/socket')
socket() 
//server for handling socket.io routes is set to 3001

