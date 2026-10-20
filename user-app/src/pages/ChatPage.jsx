import { ImagePlus, Send, UploadCloud, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';

export default function ChatPage() {
  const token = getUserToken();
  const user = getUser();
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const bottom = useRef(null);

  const load = () => api('/chat/user', { token }).then(setRows).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [rows]);

  const sendPayload = async (payload) => {
    await api('/chat/user', { token, method: 'POST', body: JSON.stringify(payload) });
    setText('');
    load();
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await sendPayload({ message: text.trim() });
    } catch (e) {
      setError(e.message);
    }
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
    <main className="mx-auto flex h-[calc(100dvh-68px)] max-w-3xl flex-col px-3 pb-[70px] pt-3 md:px-4 md:pb-3 md:pt-4">
      <div className="shrink-0">
        <h1 className="text-xl font-black sm:text-2xl">Chat with Admin</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Send text, images or videos up to 30 seconds.</p>
      </div>

      <section className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-3xl border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex min-h-full flex-col justify-end space-y-3">
          {rows.length === 0 && (
            <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-slate-400">
              No messages yet. Start a conversation with Admin.
            </div>
          )}

          {rows.map((x) => (
            <div key={x._id} className={`flex ${x.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] overflow-hidden rounded-2xl text-sm leading-6 ${
                  x.sender === 'user'
                    ? 'rounded-br-md bg-blue-600 text-white'
                    : 'rounded-bl-md bg-slate-100 text-slate-700'
                }`}
              >
                {x.mediaUrl &&
                  (x.mediaType === 'video' ? (
                    <video src={x.mediaUrl} controls className="max-h-64 w-full bg-black" />
                  ) : (
                    <img src={x.mediaUrl} alt="Chat attachment" className="max-h-64 w-full object-contain" />
                  ))}
                {x.message && <p className="px-4 py-3">{x.message}</p>}
                <span
                  className={`block px-4 pb-2 text-[10px] ${
                    x.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {new Date(x.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>
      </section>

      {error && <p className="mt-2 shrink-0 rounded-xl bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}

      <form onSubmit={send} className="mt-2 flex shrink-0 items-center gap-1.5 rounded-2xl border bg-white p-2 shadow-lg">
        <label
          title="Send image"
          className={`cursor-pointer rounded-xl p-2 text-slate-500 ${uploading ? 'pointer-events-none opacity-40' : ''}`}
        >
          <ImagePlus size={20} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        <label
          title="Send video up to 30 seconds"
          className={`cursor-pointer rounded-xl p-2 text-slate-500 ${uploading ? 'pointer-events-none opacity-40' : ''}`}
        >
          <Video size={20} />
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        {uploading && <UploadCloud size={18} className="animate-pulse text-blue-600" />}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 px-1.5 py-2 outline-none"
          placeholder={`Message Admin as ${user?.name || 'user'}...`}
        />
        <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
          <Send size={19} />
        </button>
      </form>
    </main>
  );
}
