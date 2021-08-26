const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const onlineStatus = document.querySelector("#online-status");
const typingStatus = document.querySelector("#typing-status");
const selectGroup = document.getElementById("select-group")
const messageInput = document.querySelector("#msg");
const groupChoose = document.getElementById("groupChoose")
// Get username and room from URL
var { from_id, to_id } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});
var chat = "private";
var room;
const base_url = "http://localhost:3000"
const socket = io(base_url + "/messenger");
let onlineUsers = []
let isTyping = false;
let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOCIsImlhdCI6MTYyMDY1Mzk3MCwiZXhwIjoxNzA3MDUzOTcwfQ.GScL8tR5GW4_p7LmYub1R61lstBWvZqXTTNlTb_jiws"
getUsers()
  .catch(e => console.log(e))
// Start Chat

socket.emit("online", from_id)

// Message from server
socket.on('newMessage', (data) => {
  console.log("message received");
  outputMessage(data);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
socket.on('newGroupMessage', (data) => {
  console.log("group message received");
  outputMessage(data);
  room = data.room
  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
// Message submit
chatForm.addEventListener('submit', (e) => {
  console.log("sending");


  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;

  msg = msg.trim();

  if (!msg) {
    return false;
  }
  if (chat === "private") {
    // Emit message to server
    socket.emit("newMessage", {
      to_id, message: msg
    });
  } else {
    socket.emit("newGroupMessage", {
      from_id, message: msg, room
    });
  }


  // Clear input
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

messageInput.addEventListener("input", (e) => {
  socket.emit("typing", { to_id })
})
socket.on("typing", data => {
  isTyping = true;
  updateTyping(data.from_id);
  console.log({ data })
})
function updateTyping(id = "user") {

  onlineStatus.textContent = isTyping ? `${id} is typing...` : ""
}
// Output message to DOM
function outputMessage(data) {
  isTyping = false
  updateTyping()
  let { message } = data
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = data.from_id == from_id ? "Me" : data.from_id;
  div.appendChild(p);
  const para = document.createElement('p');
  para.classList.add('text');
  para.innerText = message;
  div.appendChild(para);
  document.querySelector('.chat-messages').appendChild(div);
}


//Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
  if (leaveRoom) {
    window.location = '../index.html';
  } else {
  }
});

async function getUsers() {
  try {
    let resp = await fetch(`${base_url}/api/v1/users`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      method: "GET",
    })
    let usersArr = await resp.json();
    if (usersArr && Array.isArray(usersArr)) {
      usersArr.forEach(user => {
        const button = document.createElement("button")
        const checkBox = document.createElement("input")
        button.textContent = `${user.dataValues.first_name} ${user.dataValues.last_name}`;
        button.setAttribute("data_", user.dataValues.id);
        button.setAttribute("onclick", "startChat(this)");
        button.classList.add("btn")
        button.classList.add("user")
        checkBox.setAttribute("value", user.dataValues.id);
        checkBox.setAttribute("type", "checkbox");
        checkBox.setAttribute("class", "checkbox");
        userList.appendChild(button);
        userList.appendChild(checkBox);
      });
      const goButton = document.createElement("button")
      goButton.textContent = `Start Group Chat`;
      goButton.setAttribute("id", "create-group");
      goButton.classList.add("btn");
      goButton.classList.add("danger");
      goButton.setAttribute("onclick", "addUsersToGroupChat()")
      userList.appendChild(goButton);
    } else {
      console.log("an error occured fetching users")
    }
  }
  catch (e) {
    console.log(e)
  }
}

const startChat = (e) => {
  to_id = e.getAttribute("data_");
  clearMessages()

  document.querySelectorAll(".active").forEach(el => {
    el.classList.remove("active")
  })
  e.classList.add("active");
  socket.emit('initPrivateChat', { from_id, to_id });
}
socket.on("onlineStatus", data => {
  let user = onlineUsers.find(u => {
    return u.user_id == data.user_id
  });
  if (user) {
    onlineUsers[onlineUsers.indexOf(user)].status = data.status
  } else {
    onlineUsers.push(data)
  }
  setOnlineStatus(onlineUsers)
});
function setOnlineStatus(onlineUsers) {
  onlineStatus.innerHTML = ""
  onlineUsers.forEach(user => {
    if (user.user_id != from_id) {
      onlineStatus.innerHTML += `<br><span>${user.user_id} ${user.status}</span>`;
    }
  })
}

function clearMessages() {
  document.querySelector('.chat-messages').innerHTML = ""
}

function addUsersToGroupChat() {
  let checkBoxes = document.querySelectorAll(".checkbox");
  let users = [from_id];
  checkBoxes.forEach(box => {
    if (box.checked && !users.includes(box.value)) {
      users.push(box.value)
    }
  })
  if (users.length < 3) {
    alert("You need at least 3 people to start a group chat. Use the checkboxes")
  } else {
    socket.emit("joinGroupChat", users)

  }
}
const startGroupChat = (e) => {
  room = e.getAttribute("data_");
  clearMessages()

  document.querySelectorAll(".active").forEach(el => {
    el.classList.remove("active")
  })
  e.classList.add("active");
  chat = "room"
  // socket.emit('newGroupMessage', { from_id, to_id });
}

socket.on("joinGroupChat", data => {
  console.log("group chat begins");
  socket.emit("joinRoom", (data.room, data))
})
socket.on("groupChat", data => {
  console.log("group chat received");
  console.log({ data })
  let existingBtn = document.getElementById(data.room);
  if (!existingBtn) {
    const button = document.createElement("button")
    button.textContent = `Room ${data.room}`;
    button.setAttribute("data_", data.room);
    button.setAttribute("id", data.room);
    button.setAttribute("onclick", "startGroupChat(this)");
    button.classList.add("btn");
    userList.appendChild(button);
  }

  room = data.room;
})