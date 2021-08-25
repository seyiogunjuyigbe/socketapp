const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const onlineStatus = document.querySelector("#online-status");
const typingStatus = document.querySelector("#typing-status");

const messageInput = document.querySelector("#msg");
// Get username and room from URL
var { from_id, to_id } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});
const base_url = "http://localhost:3000"
const socket = io(base_url + "/messenger");
let onlineUsers = []
let isTyping = false;
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

  // Emit message to server
  socket.emit("newMessage", {
    to_id, message: msg
  });

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
  let { from_id, message } = data
  const div = document.createElement('div');
  div.classList.add('message');
  // const p = document.createElement('p');
  // p.classList.add('meta');
  // p.innerText = from_id;
  // div.appendChild(p);
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
        'Content-Type': 'application/json'
      },
      method: "GET",
    })
    let usersArr = await resp.json();
    if (usersArr && Array.isArray(usersArr)) {
      usersArr.forEach(user => {
        const button = document.createElement("button")
        button.textContent = `${user.first_name} ${user.last_name}`;
        button.setAttribute("data_", user.id);
        button.setAttribute("onclick", "startChat(this)");
        button.classList.add("btn")
        button.classList.add("user")
        userList.appendChild(button)
      })
    } else {
      console.log("an error occured fetching users")
    }
    // return { username: r.username, id: r.id }
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


  // window.location = `${location.href}&to_id=${id}`
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