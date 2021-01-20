const Chat = require('../models/chat');
const Online = require('../models/online');
const User = require('../models/users');
const verifySocket = require('./verifySocket');

let socket;

module.exports.chatSocket = function (socketServer) {
  const io = require('socket.io')(socketServer, {
    cors: {
      origin: '*',
      headers: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(verifySocket.verifySocket); // verifying JWT token

  io.on('connect', (socketConnection) => {
    socket = socketConnection;
    init(socket.handshake.query.uid);
    // online initialization

    // disconnect events
    socket.on('disconnect', () => {
      disconnectHandler();
    });

    // other events

    socket.on('enter-room', ({ uid, targetUid }) => {
      enterRoom(uid, targetUid);
    });

    socket.on('send-message', ({ msg, uid }) => {
      //room id needed
      sendMessage(msg, uid);
    });

    socket.on('typing', typing);
    socket.on('stopped-typing', stopTyping);
  });

  return io;
};

let init = async (uid) => {
  try {
    socket.broadcast.emit('online', uid);

    // finding existing sockets
    let onlineExisting = await Online.findOne({ user: uid });
    if (onlineExisting) {
      onlineExisting.remove();
      // send logout action to existing socket
      // io.to(socketID).emit('logout');
    }

    // Creating new socket instance in DB
    let onlineInstance = await Online.create({
      user: uid,
      socket: socket.id,
    });
    // console.log('New_Connection =>', uid);

    // find user -> emit online status to chats
    let user = await User.findById(uid);
    if (user === null) {
      console.log('no user found');
      return;
    }

    // user have to join all the ongoing chat rooms
    user.chats.map((chat) => {
      socket.join(chat._id);
      socket.to(chat.id).emit('online', { uid });
      console.log(user.name, ' joined room: ', chat._id);
    });
  } catch (err) {
    console.log('ERR: ', err);
    return;
  }
};

let disconnectHandler = async () => {
  // get the online instance
  try {
    let onlineInstance = await Online.findOne({ socket: socket.id });
    if (onlineInstance) {
      console.log('User had left! ', onlineInstance.user);

      // For now to everyone
      socket.broadcast.emit('offline', onlineInstance.user);

      // find user -> emit offline status to chats
      let user = await User.findById(onlineInstance.user);
      if (user === null) {
        console.log('no user found');
        return;
      }

      user.chats.map((chat) => {
        socket.to(chat).emit('offline', { uid: onlineInstance.user });
      });

      onlineInstance.remove();
    }
  } catch (err) {
    console.log('Err: ', err);
  }
};

let sendMessage = (msg, uid) => {
  console.log('MSGS: ', msg);
  console.log('uid: ', uid);
};

let typing = () => {
  console.log('Typing');
};

let stopTyping = () => {
  console.log('Stopped Typing');
};

let enterRoom = async (uid, targetUid) => {
  // create room if not there
  try {
    let user = await User.findById(uid).populate();
    let target = await User.findById(targetUid);
    if (!user || !target) {
      console.log('user or target not found');
      return;
    }
    // got the users
    console.log('U: ', user.name, 'T: ', target.name);

    // checking if they're already in a room or not
    let chat = await Chat.findOne({
      $or: [{ users: [uid, targetUid] }, { users: [targetUid, uid] }],
    });

    if (!chat) {
      chat = await Chat.create({
        users: [uid, targetUid],
      });
      user.chats.push(chat.id);
      target.chats.push(chat.id);
      user.save();
      target.save();
    }
    socket.join(chat._id);
    console.log(user.name, ' joined room: ', chat.id);
  } catch (err) {
    console.log('Socket Err: ', err);
    return;
  }
};