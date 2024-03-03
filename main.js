
let localStream;
let remoteStream;
let peerConnection
//  get APP_ID from in agora app https://console.agora.io/projects
let APP_ID="f924959853c14f9e9645d509a2804e17"
let token=null
// need a uid for each user
// give us our uid so on each click
let uid=String(Math.floor(Math.random()*1000000000)) 
let client;
let channel

// get url 
let queryString=window.location.search
let urlParams=new URLSearchParams(queryString)
let roomId=urlParams.get('room')
if(!roomId){
  window.location='lobby.html'
}
const servers = {
  iceServers:[
      {
          urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
      }
  ]
}

//  get user media funtion 
let constraints = {
  video:{
      width:{min:640, ideal:1920, max:1920},
      height:{min:480, ideal:1080, max:1080},
  },
  audio:true
}

let init = async () => {

  client = await AgoraRTM.createInstance(APP_ID)
  await client.login({uid, token})

  channel = client.createChannel(roomId)
  await channel.join()

  channel.on('MemberJoined', handleUserJoined)
  channel.on('MemberLeft', handleUserLeft)

  client.on('MessageFromPeer',handleMessageFromPeer)
  
  // localStream = await navigator.mediaDevices.getUserMedia({
  //   video: true,
  //   audio: true,
  // });
   localStream = await navigator.mediaDevices.getUserMedia(constraints);
  

  document.getElementById('user-1').srcObject = localStream;
  
};
let handleMessageFromPeer = async (message, MemberId) => {
  message = JSON.parse(message.text);
  
  if (message.type === 'offer') {
      createAnswer(MemberId, message.offer);
  } else if (message.type === 'answer') {
      addAnswer(message.answer);
  } else if (message.type === 'candidate') {
      if (peerConnection) {
          if (peerConnection.remoteDescription) {
              try {
                  await peerConnection.addIceCandidate(message.candidate);
              } catch (error) {
                  console.error('Error adding ICE candidate:', error);
              }
          } else {
              console.warn('Remote description is not set yet. ICE candidate will be added later.');
          }
      }
  }
}

// when user leaves 
let handleUserLeft = async (MemberId) => {
  document.getElementById().style.display = 'none';
  document.getElementById('user-1').classList.remove('smallFrame')
  
}

let handleUserJoined = async (MemberId) => {
  console.log('A new user has joined the channel:', MemberId);
  createOffer(MemberId)

}

let createPeerConnection = async (MemberId) => {

  peerConnection = new RTCPeerConnection(servers)

  remoteStream = new MediaStream()
  document.getElementById('user-2').srcObject = remoteStream
 document.getElementById('user-2').style.display = 'block'
 document.getElementById('user-1').classList.add('smallFrame')


  if(!localStream){
      localStream =navigator.mediaDevices.getUserMedia({video:true, audio:false})
      document.getElementById('user-1').srcObject = localStream
  }

 // event 
 localStream.getTracks().forEach((track) => {
  peerConnection.addTrack(track, localStream);
});
// listen two remote peer adds tracks
peerConnection.ontrack = (event) => {
    console.log('Received ontrack event:', event);
    if (event.streams && event.streams.length > 0) {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    } else {
        console.log('No streams found in the ontrack event.');
    }
};
// once exchange takes place the two peers are now  connected and data 
// can begin flowing between two peers 
// need to take this information and send it over to our remote peer 
// create icecandidate
peerConnection.onicecandidate=async(event)=>{
if(event.candidate){
  client.sendMessageToPeer({text:JSON.stringify({'type':'candidate','candidate':event.candidate})},MemberId)
}
}

}
let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId)
  //  create offer 

  let offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)

  client.sendMessageToPeer({text:JSON.stringify({'type':'offer', 'offer':offer})}, MemberId)
}


let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);

  try {
    await peerConnection.setRemoteDescription(offer);
    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId);
  } catch (error) {
    console.error('Error creating answer:', error);
  }
}


let addAnswer = async (answer) => {
 
  if(!peerConnection.currentRemoteDescription){
      peerConnection.setRemoteDescription(answer)
  }
}
let leaveChannel=async () =>{
await channel.leave()
await client.logout()
}

let toggleCamera = async () => {
  let videoTrack = localStream.getTracks().find(track => track.kind === 'video')

  // camera is going to be turned of temporarily
  if(videoTrack.enabled){
      videoTrack.enabled = false
      document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  }else{
      videoTrack.enabled = true
      document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
  }
}
let toggleMic = async () => {
  let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

  if(audioTrack.enabled){
      audioTrack.enabled = false
      document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  }else{
      audioTrack.enabled = true
      document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
  }
}

window.addEventListener('beforeunload',leaveChannel)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)

init()

