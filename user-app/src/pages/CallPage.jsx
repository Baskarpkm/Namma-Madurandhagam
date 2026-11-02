import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';

const iceServers=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}];
if(import.meta.env.VITE_TURN_URL){
  iceServers.push({
    urls:import.meta.env.VITE_TURN_URL,
    username:import.meta.env.VITE_TURN_USERNAME||'',
    credential:import.meta.env.VITE_TURN_CREDENTIAL||''
  });
}
const rtcConfig={iceServers,iceCandidatePoolSize:10};
const terminalStatuses=new Set(['declined','cancelled','missed','ended']);
const formatDuration=seconds=>{
  const s=Math.max(0,Number(seconds||0));
  const m=Math.floor(s/60),r=s%60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
};

export default function CallPage(){
  const {callId,targetId}=useParams();
  const token=getUserToken(),nav=useNavigate(),location=useLocation();
  const [call,setCallState]=useState(null);
  const [status,setStatus]=useState(targetId?'Calling…':'Connecting…');
  const [muted,setMuted]=useState(false),[error,setError]=useState(''),[accepting,setAccepting]=useState(false),[elapsed,setElapsed]=useState(0);

  const pcRef=useRef(null),streamRef=useRef(null),remoteAudio=useRef(null),seenCandidates=useRef(new Set());
  const callRef=useRef(null),callIdRef=useRef(callId||''),initRef=useRef(false),offerStartedRef=useRef(false),acceptingRef=useRef(false);
  const wantAcceptRef=useRef(false),connectedMarkedRef=useRef(false),connectedLocalAtRef=useRef(null),terminalRef=useRef(false);

  const setCall=row=>{callRef.current=row;setCallState(row)};
  const peer=call?(call.isCaller?call.receiver:call.caller):null;

  const stopMedia=()=>{
    streamRef.current?.getTracks?.().forEach(t=>t.stop());
    streamRef.current=null;
    try{pcRef.current?.close?.()}catch{}
    pcRef.current=null;
  };

  const markConnected=async()=>{
    if(connectedMarkedRef.current||terminalRef.current||!callIdRef.current)return;
    connectedMarkedRef.current=true;
    connectedLocalAtRef.current=Date.now();
    setStatus('Connected');setError('');setElapsed(0);
    try{
      const result=await api(`/calls/${callIdRef.current}/connected`,{token,method:'POST'});
      const current=callRef.current;
      if(current)setCall({...current,status:result.status||'connected',connectedAt:result.connectedAt||current.connectedAt||new Date().toISOString()});
    }catch{}
  };

  const onConnectionState=()=>{
    const pc=pcRef.current;if(!pc)return;
    const state=pc.connectionState;
    const ice=pc.iceConnectionState;
    if(state==='connected'||ice==='connected'||ice==='completed'){markConnected();return}
    if((state==='connecting'||ice==='checking')&&!connectedMarkedRef.current)setStatus('Connecting…');
    if(state==='failed'||ice==='failed'){
      setStatus('Connection failed');
      setError('Audio connection failed. Please end the call and try again. TURN server is recommended for reliable mobile-network calls.');
    }
    if((state==='disconnected'||ice==='disconnected')&&connectedMarkedRef.current)setStatus('Reconnecting…');
  };

  const ensurePc=async()=>{
    if(pcRef.current)return pcRef.current;
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Audio calling is not supported in this browser.');
    const pc=new RTCPeerConnection(rtcConfig);pcRef.current=pc;
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    streamRef.current=stream;
    stream.getTracks().forEach(track=>pc.addTrack(track,stream));
    pc.ontrack=e=>{
      const audio=remoteAudio.current;
      if(!audio)return;
      audio.srcObject=e.streams?.[0]||new MediaStream([e.track]);
      audio.play?.().catch(()=>{});
    };
    pc.onicecandidate=async e=>{
      if(!e.candidate||!callIdRef.current||terminalRef.current)return;
      try{await api(`/calls/${callIdRef.current}/candidate`,{token,method:'POST',body:JSON.stringify({candidate:e.candidate.toJSON()})})}catch{}
    };
    pc.onconnectionstatechange=onConnectionState;
    pc.oniceconnectionstatechange=onConnectionState;
    return pc;
  };

  const beginCaller=async current=>{
    if(offerStartedRef.current||terminalRef.current)return;
    offerStartedRef.current=true;
    setStatus('Calling…');setError('');
    try{
      const pc=await ensurePc();
      const offer=await pc.createOffer({offerToReceiveAudio:true});
      await pc.setLocalDescription(offer);
      await api(`/calls/${current.id}/offer`,{token,method:'POST',body:JSON.stringify({offer:pc.localDescription})});
      setStatus('Ringing…');
    }catch(e){offerStartedRef.current=false;setError(e.message||'Unable to start call');setStatus('Call failed')}
  };

  const acceptIncoming=async current=>{
    if(!current?.id||acceptingRef.current||terminalRef.current)return;
    wantAcceptRef.current=true;acceptingRef.current=true;setAccepting(true);setError('');setStatus('Connecting…');
    try{
      const fresh=await api(`/calls/${current.id}`,{token});setCall(fresh);
      if(terminalStatuses.has(fresh.status)){wantAcceptRef.current=false;return}
      if(!fresh.offer){setStatus('Waiting for caller…');return}
      const pc=await ensurePc();
      if(!pc.remoteDescription)await pc.setRemoteDescription(new RTCSessionDescription(fresh.offer));
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await api(`/calls/${fresh.id}/answer`,{token,method:'POST',body:JSON.stringify({answer:pc.localDescription})});
      setCall({...fresh,status:'accepted',answer:pc.localDescription,answeredAt:fresh.answeredAt||new Date().toISOString()});
      wantAcceptRef.current=false;
      setStatus('Connecting…');
    }catch(e){setError(e.message||'Unable to answer call');setStatus('Call failed')}
    finally{acceptingRef.current=false;setAccepting(false)}
  };

  useEffect(()=>{
    if(initRef.current)return;initRef.current=true;
    let dead=false;
    (async()=>{
      try{
        let row;
        if(targetId)row=await api(`/calls/start/${targetId}`,{token,method:'POST'});
        else row=await api(`/calls/${callId}`,{token});
        if(dead)return;
        callIdRef.current=row.id||callIdRef.current;setCall(row);
        if(terminalStatuses.has(row.status)){setStatus(row.status==='ended'?'Call ended':row.status);return}
        if(row.isCaller){
          if(row.status==='ringing')await beginCaller(row);
          else setStatus(row.status==='connected'?'Connected':'Connecting…');
        }else if(location.state?.autoAccept){
          wantAcceptRef.current=true;
          await acceptIncoming(row);
        }else setStatus(row.status==='ringing'?'Incoming audio call':'Connecting…');
      }catch(e){if(!dead){setError(e.message||'Unable to open call');setStatus('Call failed')}}
    })();
    return()=>{dead=true};
  },[targetId,callId,token]);

  useEffect(()=>{
    const id=call?.id;if(!id)return;
    let dead=false,navTimer=null;
    const poll=async()=>{
      if(terminalRef.current)return;
      try{
        const row=await api(`/calls/${id}`,{token,fresh:true});
        if(dead)return;
        callIdRef.current=row.id||callIdRef.current;setCall(row);
        if(terminalStatuses.has(row.status)){
          terminalRef.current=true;
          const text=row.status==='ended'?'Call ended':row.status==='missed'?'No answer':row.status==='declined'?'Call declined':'Call cancelled';
          setStatus(text);stopMedia();navTimer=setTimeout(()=>nav(-1),900);return;
        }

        let pc=pcRef.current;
        if(!row.isCaller&&wantAcceptRef.current&&row.offer&&!pc){await acceptIncoming(row);pc=pcRef.current}
        if(row.isCaller&&row.answer){
          pc=pc||await ensurePc();
          if(!pc.remoteDescription){
            await pc.setRemoteDescription(new RTCSessionDescription(row.answer));
            setStatus('Connecting…');
            setCall({...row,status:row.status==='ringing'?'accepted':row.status});
          }
        }
        if(pc?.remoteDescription){
          const remoteCandidates=row.isCaller?row.receiverCandidates:row.callerCandidates;
          for(const candidate of remoteCandidates||[]){
            const key=JSON.stringify(candidate);if(seenCandidates.current.has(key))continue;
            seenCandidates.current.add(key);
            try{await pc.addIceCandidate(new RTCIceCandidate(candidate))}catch{}
          }
        }
      }catch{}
    };
    poll();const timer=setInterval(poll,800);
    return()=>{dead=true;clearInterval(timer);if(navTimer)clearTimeout(navTimer)};
  },[call?.id,token,nav]);

  useEffect(()=>{
    if(status!=='Connected')return;
    const start=connectedLocalAtRef.current||Date.now();connectedLocalAtRef.current=start;
    const update=()=>setElapsed(Math.max(0,Math.floor((Date.now()-start)/1000)));
    update();const timer=setInterval(update,1000);return()=>clearInterval(timer);
  },[status]);

  useEffect(()=>()=>stopMedia(),[]);

  const accept=()=>acceptIncoming(call);
  const end=async()=>{
    const current=callRef.current;if(!current?.id)return nav(-1);
    terminalRef.current=true;setStatus('Call ended');
    let action='end';
    if(current.isCaller&&current.status==='ringing')action='cancel';
    if(!current.isCaller&&current.status==='ringing')action='decline';
    try{await api(`/calls/${current.id}/${action}`,{token,method:'POST'})}catch{}
    stopMedia();nav(-1);
  };
  const decline=async()=>{
    const current=callRef.current;if(!current?.id)return nav(-1);
    terminalRef.current=true;
    try{await api(`/calls/${current.id}/decline`,{token,method:'POST'})}catch{}
    stopMedia();nav(-1);
  };
  const toggleMute=()=>{
    const next=!muted;streamRef.current?.getAudioTracks?.().forEach(t=>t.enabled=!next);setMuted(next);
  };

  const incomingActions=!call?.isCaller&&call?.status==='ringing'&&!wantAcceptRef.current&&!accepting;
  return <main className="fixed inset-0 z-[180] grid bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white" data-auto-sync-pause="true">
    <audio ref={remoteAudio} autoPlay playsInline/>
    <div className="flex flex-col items-center justify-between px-6 pb-10 pt-16">
      <div className="text-center">
        <UserAvatar user={peer||{name:'User'}} sizeClass="mx-auto h-28 w-28" iconSize={46} className="ring-4 ring-white/10"/>
        <h1 className="mt-5 text-3xl font-black">{peer?.name||'Audio Call'}</h1>
        {peer?.username&&<p className="mt-1 font-bold text-blue-300">@{peer.username}</p>}
        <p className={`mt-3 text-sm font-bold ${error?'text-red-300':'text-slate-300'}`}>{error||status}</p>
        {status==='Connected'&&<p className="mt-2 text-lg font-black tabular-nums text-emerald-300">{formatDuration(elapsed)}</p>}
        <p className="mt-2 text-[11px] font-semibold text-slate-500">Namma Madurandhagam secure in-app audio call • no phone number shared</p>
      </div>

      {incomingActions
        ?<div className="grid w-full max-w-sm grid-cols-2 gap-6">
          <button onClick={decline} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-600 shadow-xl" aria-label="Decline call"><PhoneOff size={27}/></button>
          <button onClick={accept} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 shadow-xl" aria-label="Accept call"><Phone size={27}/></button>
        </div>
        :<div className="flex items-center gap-8">
          <button onClick={toggleMute} className="grid h-14 w-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/10" aria-label={muted?'Unmute':'Mute'}>{muted?<MicOff/>:<Mic/>}</button>
          <button onClick={end} className="grid h-16 w-16 place-items-center rounded-full bg-red-600 shadow-xl" aria-label="End call"><PhoneOff size={27}/></button>
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/10"><Volume2/></span>
        </div>}
    </div>
  </main>;
}
