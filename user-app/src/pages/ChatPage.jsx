import { ImagePlus, Send, UploadCloud, Video, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';

function MediaViewer({ media, onClose }) {
  if (!media) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur" aria-label="Close media">
        <X size={24}/>
      </button>
      <div className="flex max-h-full max-w-5xl items-center justify-center" onClick={(e)=>e.stopPropagation()}>
        {media.type === 'video' ? (
          <video src={media.url} controls autoPlay playsInline className="max-h-[92dvh] max-w-full bg-black object-contain"/>
        ) : (
          <img src={media.url} alt="Chat attachment" className="max-h-[92dvh] max-w-full object-contain"/>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const token = getUserToken();
  const user = getUser();
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState(null);
  const bottom = useRef(null);

  const load = () => api('/chat/user', { token }).then(setRows).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const lastMessageId = rows.length ? rows[rows.length - 1]._id : '';
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [lastMessageId]);

  const sendPayload = async (payload) => {
    await api('/chat/user', { token, method: 'POST', body: JSON.stringify(payload) });
    setText('');
    load();
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try { await sendPayload({ message: text.trim() }); } catch (e) { setError(e.message); }
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api('/upload/user/short', { token, method: 'POST', body: fd });
      await sendPayload({
        message: text.trim(),
        mediaUrl: result.url,
        mediaType: result.resourceType === 'video' ? 'video' : 'image',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <main className="fixed inset-x-0 bottom-[68px] top-[69px] z-30 flex flex-col overflow-hidden bg-[#f6f9ff] md:static md:mx-auto md:h-[calc(100dvh-69px)] md:max-w-3xl md:px-4 md:pb-3 md:pt-3">
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 md:rounded-t-3xl md:border md:border-b-0">
          <h1 className="text-lg font-black sm:text-xl">Chat with Admin</h1>
          <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">Send text, images or videos up to 30 seconds.</p>
        </div>

        <section className="min-h-0 flex-1 overflow-y-auto bg-white px-3 py-4 overscroll-contain md:border-x sm:px-4">
          <div className="flex min-h-full flex-col justify-end space-y-3">
            {rows.length === 0 && <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-slate-400">No messages yet. Start a conversation with Admin.</div>}
            {rows.map((x) => (
              <div key={x._id} className={`flex ${x.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[84%] overflow-hidden rounded-2xl text-sm leading-6 ${x.sender === 'user' ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-700'}`}>
                  {x.mediaUrl && (
                    <button type="button" onClick={()=>setViewer({url:x.mediaUrl,type:x.mediaType})} className="block w-full cursor-zoom-in bg-black/5 text-left">
                      {x.mediaType === 'video' ? (
                        <video src={x.mediaUrl} muted playsInline preload="metadata" className="max-h-64 w-full bg-black object-contain"/>
                      ) : (
                        <img src={x.mediaUrl} alt="Chat attachment" className="max-h-64 w-full object-contain"/>
                      )}
                    </button>
                  )}
                  {x.message && <p className="whitespace-pre-wrap break-words px-4 py-3">{x.message}</p>}
                  <span className={`block px-4 pb-2 text-[10px] ${x.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(x.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
            <div ref={bottom}/>
          </div>
        </section>

        {error && <p className="shrink-0 border-x border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 md:border-x">{error}</p>}

        <form onSubmit={send} className="flex shrink-0 items-center gap-1.5 border-t border-slate-200 bg-white p-2 shadow-[0_-6px_20px_rgba(15,23,42,0.05)] md:rounded-b-3xl md:border md:border-t">
          <label title="Send image" className={`cursor-pointer rounded-xl p-2 text-slate-500 ${uploading ? 'pointer-events-none opacity-40' : ''}`}>
            <ImagePlus size={20}/>
            <input type="file" accept="image/*" className="hidden" onChange={(e)=>{upload(e.target.files?.[0]);e.target.value=''}}/>
          </label>
          <label title="Send video up to 30 seconds" className={`cursor-pointer rounded-xl p-2 text-slate-500 ${uploading ? 'pointer-events-none opacity-40' : ''}`}>
            <Video size={20}/>
            <input type="file" accept="video/*" className="hidden" onChange={(e)=>{upload(e.target.files?.[0]);e.target.value=''}}/>
          </label>
          {uploading && <UploadCloud size={18} className="animate-pulse text-blue-600"/>}
          <input value={text} onChange={(e)=>setText(e.target.value)} className="min-w-0 flex-1 px-1.5 py-2 outline-none" placeholder={`Message Admin as ${user?.name || 'user'}...`}/>
          <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Send size={19}/></button>
        </form>
      </main>
      <MediaViewer media={viewer} onClose={()=>setViewer(null)}/>
    </>
  );
}
