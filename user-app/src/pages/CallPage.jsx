import { Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';

const iceServers=[{urls:'stun:stun.l.google.com:19302'}];
if(import.meta.env.VITE_TURN_URL){
  iceServers.push({
    urls:import.meta.env.VITE_TURN_URL,
    username:import.meta.env.VITE_TURN_USERNAME||'',
    credential:import.meta.env.VITE_TURN_CREDENTIAL||''
  });
}
const rtcConfig={iceServers};

export default function CallPage(){
  const {callId,targetId}=useParams();
  const token=getUserToken(),me=getUser(),nav=useNavigate(),location=useLocation();
  const [call,setCall]=useState(null),[status,setStatus]=useState('Connecting…'),[muted,setMuted]=useState(false),[error,setError]=useState('');
  const pcRef=useRef(null),streamRef=useRef(null),remoteAudio=useRef(null),seenCandidates=useRef(new Set()),started=useRef(false);
  const callIdRef=useRef(callId||''),wantAcceptRef=useRef(false);

  const peer=call?(call.isCaller?call.receiver:call.caller):null;

  const ensurePc=async()=>{
    if(pcRef.current)return pcRef.current;
    const pc=new RTCPeerConnection(rtcConfig);
    pcRef.current=pc;
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    streamRef.current=stream;
    stream.getTracks().forEach(track=>pc.addTrack(track,stream));
    pc.ontrack=e=>{if(remoteAudio.current)remoteAudio.current.srcObject=e.streams[0]};
    pc.onicecandidate=async e=>{
      if(!e.candidate||!callIdRef.current)return;
      try{await api(`/calls/${callIdRef.current}/candidate`,{token,method:'POST',body:JSON.stringify({candidate:e.candidate.toJSON()})})}catch{}
    };
    return pc;
  };

  const beginCaller=async(current)=>{
    const pc=await ensurePc();
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    await api(`/calls/${current.id}/offer`,{token,method:'POST',body:JSON.stringify({offer})});
    setStatus('Ringing…');
  };

  const acceptIncoming=async(current)=>{
    wantAcceptRef.current=true;
    const fresh=await api(`/calls/${current.id}`,{token});
    if(!fresh.offer){setStatus('Waiting for caller…');return}
    const pc=await ensurePc();
    await pc.setRemoteDescription(new RTCSessionDescription(fresh.offer));
    const answer=await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await api(`/calls/${fresh.id}/answer`,{token,method:'POST',body:JSON.stringify({answer})});
    wantAcceptRef.current=false;
    setStatus('Connected');
  };

  useEffect(()=>{
    let dead=false;
    (async()=>{
      try{
        let row;
        if(targetId)row=await api(`/calls/start/${targetId}`,{token,method:'POST'});
        else row=await api(`/calls/${callId}`,{token});
        if(dead)return;
        callIdRef.current=row.id||callIdRef.current; setCall(row);
        if(row.isCaller){started.current=true;setTimeout(()=>beginCaller(row).catch(e=>setError(e.message)),0)}
        else if(location.state?.autoAccept){wantAcceptRef.current=true;setTimeout(()=>acceptIncoming(row).catch(e=>setError(e.message)),0)}
        else setStatus(row.status==='ringing'?'Incoming audio call':'Connecting…');
      }catch(e){if(!dead)setError(e.message)}
    })();
    return()=>{dead=true};
  },[targetId,callId]);

  useEffect(()=>{
    if(!call?.id)return;
    let dead=false;
    const poll=async()=>{
      try{
        const row=await api(`/calls/${call.id}`,{token});
        if(dead)return;
        callIdRef.current=row.id||callIdRef.current; setCall(row);
        if(['declined','cancelled','missed','ended'].includes(row.status)){setStatus(row.status==='ended'?'Call ended':row.status);setTimeout(()=>nav(-1),700);return}
        let pc=pcRef.current;
        if(!row.isCaller&&wantAcceptRef.current&&row.offer&&!pc){await acceptIncoming(row);pc=pcRef.current}
        if(row.isCaller&&row.answer&&pc&&!pc.currentRemoteDescription){await pc.setRemoteDescription(new RTCSessionDescription(row.answer));setStatus('Connected')}
        if(pc){
          const remoteCandidates=row.isCaller?row.receiverCandidates:row.callerCandidates;
          for(const candidate of remoteCandidates||[]){
            const key=JSON.stringify(candidate);if(seenCandidates.current.has(key))continue;
            seenCandidates.current.add(key);try{await pc.addIceCandidate(candidate)}catch{}
          }
        }
      }catch{}
    };
    poll();const id=setInterval(poll,1000);return()=>{dead=true;clearInterval(id)};
  },[call?.id]);

  useEffect(()=>()=>{streamRef.current?.getTracks?.().forEach(t=>t.stop());pcRef.current?.close?.()},[]);

  const accept=()=>{wantAcceptRef.current=true;acceptIncoming(call).catch(e=>setError(e.message))};
  const end=async()=>{
    try{await api(`/calls/${call.id}/${call?.isCaller&&call.status==='ringing'?'cancel':'end'}`,{token,method:'POST'})}catch{}
    nav(-1);
  };
  const decline=async()=>{try{await api(`/calls/${call.id}/decline`,{token,method:'POST'})}catch{}nav(-1)};
  const toggleMute=()=>{const next=!muted;streamRef.current?.getAudioTracks?.().forEach(t=>t.enabled=!next);setMuted(next)};

  return <main className="fixed inset-0 z-[180] grid bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
    <audio ref={remoteAudio} autoPlay playsInline/>
    <div className="flex flex-col items-center justify-between px-6 pb-10 pt-16">
      <div className="text-center">
        <UserAvatar user={peer||{name:'User'}} sizeClass="mx-auto h-28 w-28" iconSize={46} className="ring-4 ring-white/10"/>
        <h1 className="mt-5 text-3xl font-black">{peer?.name||'Audio Call'}</h1>
        {peer?.username&&<p className="mt-1 font-bold text-blue-300">@{peer.username}</p>}
        <p className="mt-3 text-sm font-bold text-slate-300">{error||status}</p>
        <p className="mt-2 text-[11px] font-semibold text-slate-500">Namma Madurandhagam secure in-app audio call • no phone number shared</p>
      </div>

      {!call?.isCaller&&call?.status==='ringing'&&!pcRef.current
        ?<div className="grid w-full max-w-sm grid-cols-2 gap-6">
          <button onClick={decline} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-600 shadow-xl"><PhoneOff size={27}/></button>
          <button onClick={accept} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 shadow-xl"><Volume2 size={27}/></button>
        </div>
        :<div className="flex items-center gap-8">
          <button onClick={toggleMute} className="grid h-14 w-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/10">{muted?<MicOff/>:<Mic/>}</button>
          <button onClick={end} className="grid h-16 w-16 place-items-center rounded-full bg-red-600 shadow-xl"><PhoneOff size={27}/></button>
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/10"><Volume2/></span>
        </div>}
    </div>
  </main>;
}
