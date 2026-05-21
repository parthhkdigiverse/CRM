import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, Users, X, Check, CheckCheck, ArrowLeft, MessageSquare, Loader2, Smile, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

/* ── helpers ── */
const ini = (n: string) => n?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
const bgColors = [
  '#a2d2ff', '#ffafcc', '#bde0fe', '#ffc8dd',
  '#cdb4db', '#8eecf5', '#fcf6bd', '#d0f4de',
];
const pickBg = (id: string) => bgColors[parseInt(id?.slice(-2) || '0', 16) % bgColors.length];

const fmtTime = (iso: string) => {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const fmtMsg = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const EMOJIS = ['😊','😂','❤️','👍','🙏','🔥','😮','😢','🎉','👏','✨','✅','🙌','💡','😍'];

/* Typing animation */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1">
      {[0,1,2].map(i => (
        <span key={i} className="inline-block h-[5px] w-[5px] rounded-full bg-violet-500 dark:bg-violet-400"
          style={{ animation: 'typingBounce 1.2s infinite', animationDelay: `${i * 200}ms` }} />
      ))}
      <style>{`@keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-3px); opacity: 1; } }`}</style>
    </span>
  );
}

/* Date separator */
function DateBadge({ date }: { date: string }) {
  const d = new Date(date), now = new Date(), diff = now.getTime() - d.getTime();
  let label = d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  if (diff < 86400000 && d.getDate() === now.getDate()) label = 'Today';
  else if (diff < 172800000) label = 'Yesterday';
  return (
    <div className="flex justify-center py-4 my-2 relative z-10">
      <span className="text-[12px] font-medium px-4 py-1 rounded-full shadow-sm border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-slate-800/50 backdrop-blur-md text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function Chat() {
  const { user, accessToken } = useAuthStore();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<{ [k: string]: { name: string; ts: number } }>({});
  const [showEmoji, setShowEmoji] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRoomRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => { activeRoomRef.current = activeRoomId; }, [activeRoomId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [u, r, o] = await Promise.all([apiClient.get('/chat/users'), apiClient.get('/chat/rooms'), apiClient.get('/chat/online')]);
        setAllUsers(u.data.data || []); setRooms(r.data.data || []); setOnlineUsers(new Set(o.data.data || []));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!accessToken) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL).host : 'localhost:8000';
    const socket = new WebSocket(`${proto}//${host}/api/v1/chat/ws?token=${accessToken}`);
    socket.onmessage = (e) => {
      const p = JSON.parse(e.data);
      if (p.type === 'new_message') {
        const m = p.data;
        setMessages(prev => m.room_id === activeRoomRef.current && !prev.some(x => x.id === m.id) ? [...prev, m] : prev);
        if (m.room_id === activeRoomRef.current && m.sender_id !== user?.id && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'mark_read', room_id: m.room_id }));
          setRooms(prev => prev.map(r => r.id === m.room_id ? { ...r, unread_count: 0 } : r));
        }
        setTimeout(() => apiClient.get('/chat/rooms').then(r => setRooms(r.data.data || [])).catch(() => { }), 300);
        setTypingUsers(prev => { const n = { ...prev }; delete n[m.room_id]; return n; });
      }
      if (p.type === 'typing') {
        const { room_id, user_name } = p.data;
        setTypingUsers(prev => ({ ...prev, [room_id]: { name: user_name, ts: Date.now() } }));
        setTimeout(() => setTypingUsers(prev => prev[room_id] && Date.now() - prev[room_id].ts >= 2900 ? (() => { const n = { ...prev }; delete n[room_id]; return n; })() : prev), 3000);
      }
      if (p.type === 'user_online') setOnlineUsers(prev => new Set([...prev, p.data.user_id]));
      if (p.type === 'user_offline') setOnlineUsers(prev => { const s = new Set(prev); s.delete(p.data.user_id); return s; });
      if (p.type === 'messages_read') {
        if (p.data.room_id === activeRoomRef.current) setMessages(prev => prev.map(m => m.sender_id === user?.id ? { ...m, is_read: true } : m));
        apiClient.get('/chat/rooms').then(r => setRooms(r.data.data || [])).catch(() => { });
      }
    };
    ws.current = socket;
    return () => socket.close();
  }, [accessToken]);

  const refreshRooms = async () => { const r = await apiClient.get('/chat/rooms'); setRooms(r.data.data || []); };
  
  const openRoom = useCallback(async (roomId: string) => {
    setActiveRoomId(roomId); setMobileShowChat(true); setShowEmoji(false);
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unread_count: 0 } : r));
    try {
      const r = await apiClient.get(`/chat/messages/${roomId}`); setMessages(r.data.data || []);
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ action: 'mark_read', room_id: roomId }));
      setTimeout(() => refreshRooms(), 300);
    } catch (e) { console.error(e); }
  }, []);
  
  const startDirect = async (id: string) => { try { const r = await apiClient.post(`/chat/rooms/direct/${id}`); await refreshRooms(); openRoom(r.data.data.id); setShowNewChat(false); } catch (e) { console.error(e); } };
  
  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try { const r = await apiClient.post('/chat/rooms/group', { name: groupName.trim(), participant_ids: selectedMembers }); await refreshRooms(); openRoom(r.data.data.id); setShowNewGroup(false); setGroupName(''); setSelectedMembers([]); } catch (e) { console.error(e); }
  };
  
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault(); const text = newMsg.trim();
    if (!text || !activeRoomId || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ action: 'send_message', room_id: activeRoomId, content: text }));
    setNewMsg(''); setShowEmoji(false);
  };
  
  const handleTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current > 2000 && activeRoomId && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'typing', room_id: activeRoomId })); lastTypingSent.current = now;
    }
  };

  const others = allUsers.filter(u => u.user_id !== user?.id);
  const filteredUsers = others.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  const filteredRooms = rooms.filter(r => { if (!search) return true; if (r.name?.toLowerCase().includes(search.toLowerCase())) return true; return r.participants_details?.some((p: any) => p.name?.toLowerCase().includes(search.toLowerCase())); });
  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const chatName = activeRoom ? (activeRoom.room_type === 'group' ? (activeRoom.name || 'Group') : (activeRoom.participants_details?.find((p: any) => p.id !== user?.id)?.name || 'Chat')) : '';
  const chatSub = activeRoom ? (activeRoom.room_type === 'group' ? activeRoom.participants_details?.map((p: any) => p.name).join(', ') : (() => { const p = activeRoom.participants_details?.find((p: any) => p.id !== user?.id); return p ? (onlineUsers.has(p.id) ? 'Online now' : p.role) : ''; })()) : '';
  const partnerOnline = activeRoom && activeRoom.room_type !== 'group' ? (() => { const p = activeRoom.participants_details?.find((p: any) => p.id !== user?.id); return p && onlineUsers.has(p.id); })() : false;
  const typingInRoom = activeRoomId ? typingUsers[activeRoomId] : null;

  /* Global glass scrollbar style */
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .glass-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .glass-scroll::-webkit-scrollbar-track { background: transparent; }
      .glass-scroll::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.3); border-radius: 10px; }
      .glass-scroll:hover::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.5); }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    /* Standard flat background in Light Mode, Glass gradient in Dark Mode */
    <div className="h-full w-full overflow-hidden flex items-center justify-center p-0 md:p-6 bg-transparent dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900" 
         style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Background ambient blobs (Only visible in dark mode) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full dark:bg-violet-900/30 blur-[120px] opacity-0 dark:opacity-60 pointer-events-none transition-opacity"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full dark:bg-fuchsia-900/30 blur-[120px] opacity-0 dark:opacity-60 pointer-events-none transition-opacity"></div>
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] rounded-full dark:bg-sky-900/20 blur-[100px] opacity-0 dark:opacity-50 pointer-events-none transition-opacity"></div>

      {/* Main Container: Solid card in Light mode, Glassmorphism in Dark mode */}
      <div className="w-full h-full max-w-7xl flex flex-col md:flex-row rounded-none md:rounded-3xl overflow-hidden shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] border-0 md:border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/40 dark:backdrop-blur-3xl relative z-10 transition-colors">

        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div className={cn("w-full md:w-[380px] md:min-w-[380px] flex flex-col shrink-0 min-h-0 border-r border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/30 transition-colors", mobileShowChat && "hidden md:flex")}>
          
          {/* Header */}
          <div className="h-[76px] px-6 flex items-center justify-between shrink-0 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800/20 dark:backdrop-blur-md relative z-20 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar className="h-[46px] w-[46px] shadow-sm border border-gray-100 dark:border-slate-700">
                <AvatarFallback className="text-violet-600 dark:text-violet-400 text-sm font-bold bg-gray-50 dark:bg-slate-800">{ini(user?.name || user?.email || 'Me')}</AvatarFallback>
              </Avatar>
              <h2 className="text-[20px] font-bold text-gray-800 dark:bg-gradient-to-r dark:from-violet-400 dark:to-fuchsia-400 dark:bg-clip-text dark:text-transparent">Messages</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowNewChat(true); setShowNewGroup(false); }}
                className="h-[42px] w-[42px] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all shadow-sm bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm border border-gray-200 dark:border-white/10">
                <MessageSquare className="h-[18px] w-[18px]" />
              </button>
              <button onClick={() => { setShowNewGroup(true); setShowNewChat(false); }}
                className="h-[42px] w-[42px] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all shadow-sm bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm border border-gray-200 dark:border-white/10">
                <Users className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-4 shrink-0">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 group-focus-within:text-violet-500 dark:group-focus-within:text-violet-400 transition-colors" />
              <input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-[46px] pl-[42px] pr-4 text-[14px] rounded-2xl border border-gray-200 dark:border-white/10 outline-none shadow-sm transition-all focus:border-violet-300 dark:focus:border-violet-500/50 focus:shadow-md focus:bg-white dark:focus:bg-slate-800/90 bg-white dark:bg-slate-800/50 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
          </div>

          {/* New Chat Panel */}
          {showNewChat && (
            <div className="flex-1 overflow-y-auto min-h-0 glass-scroll px-3 pb-4">
              <div className="flex items-center gap-4 px-4 py-4 mb-2">
                <button onClick={() => setShowNewChat(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700/50 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-gray-800 dark:text-gray-100 text-[18px] font-semibold">Start a Conversation</span>
              </div>
              <div className="space-y-1">
                {filteredUsers.map(u => (
                  <button key={u.id} onClick={() => startDirect(u.user_id)}
                    className="w-full flex items-center gap-[14px] p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800/60 hover:shadow-sm transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10 group">
                    <div className="relative shrink-0">
                      <Avatar className="h-[52px] w-[52px] shadow-sm"><AvatarFallback className="text-gray-800 text-sm font-semibold" style={{ background: pickBg(u.id) }}>{ini(u.name)}</AvatarFallback></Avatar>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-[16px] font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">{u.name}</div>
                      <div className="text-[13px] text-gray-500 dark:text-gray-400 capitalize">{u.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* New Group Panel */}
          {showNewGroup && (
            <div className="flex-1 overflow-y-auto min-h-0 glass-scroll px-3 pb-4">
              <div className="flex items-center gap-4 px-4 py-4">
                <button onClick={() => { setShowNewGroup(false); setSelectedMembers([]); setGroupName(''); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700/50 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-gray-800 dark:text-gray-100 text-[18px] font-semibold">Create Group</span>
              </div>
              <div className="px-4 py-4 mb-4 rounded-3xl bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-white/10 shadow-sm dark:backdrop-blur-md transition-colors">
                <input placeholder="Name your group..." value={groupName} onChange={e => setGroupName(e.target.value)}
                  className="w-full text-[20px] font-semibold pb-3 mb-4 border-b border-gray-300 dark:border-gray-600 outline-none bg-transparent placeholder-gray-400 dark:placeholder-gray-500 text-gray-800 dark:text-gray-100 focus:border-violet-500 dark:focus:border-violet-400 transition-colors" />
                
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 max-h-[140px] overflow-y-auto glass-scroll pr-2">
                    {selectedMembers.map(mid => {
                      const mu = allUsers.find(u => u.user_id === mid);
                      return (
                        <span key={mid} className="inline-flex items-center gap-[6px] pl-1 pr-3 py-1 rounded-full text-[13px] font-medium bg-gray-50 dark:bg-slate-700 shadow-sm border border-gray-200 dark:border-slate-600">
                          <Avatar className="h-[24px] w-[24px]"><AvatarFallback className="text-[9px] text-gray-800" style={{ background: pickBg(mid) }}>{ini(mu?.name || '')}</AvatarFallback></Avatar>
                          <span className="text-gray-700 dark:text-gray-200">{mu?.name}</span>
                          <button onClick={() => setSelectedMembers(p => p.filter(x => x !== mid))} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"><X className="h-3.5 w-3.5" /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
                
                <button onClick={createGroup} disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="w-full h-[48px] rounded-2xl flex items-center justify-center gap-2 font-medium transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:shadow-none bg-violet-600 text-white hover:bg-violet-700">
                  <span>Create Group</span>
                  <Check className="h-4 w-4" />
                </button>
              </div>
              <p className="px-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Select Members</p>
              <div className="space-y-1">
                {others.map(u => {
                  const sel = selectedMembers.includes(u.user_id);
                  return (
                    <button key={u.id} onClick={() => setSelectedMembers(p => sel ? p.filter(x => x !== u.user_id) : [...p, u.user_id])}
                      className={cn("w-full flex items-center gap-[14px] p-3 rounded-2xl transition-all border", sel ? "bg-white dark:bg-slate-700 border-violet-200 dark:border-violet-500/30 shadow-sm" : "border-transparent hover:bg-gray-100 dark:hover:bg-slate-800/60 hover:shadow-sm")}>
                      <div className="relative shrink-0">
                        <Avatar className="h-[52px] w-[52px] shadow-sm"><AvatarFallback className="text-gray-800 text-sm font-semibold" style={{ background: pickBg(u.id) }}>{ini(u.name)}</AvatarFallback></Avatar>
                        {sel && <div className="absolute -bottom-1 -right-1 h-[22px] w-[22px] rounded-full flex items-center justify-center bg-violet-500 border-2 border-white dark:border-slate-800 shadow-sm"><Check className="h-3 w-3 text-white" /></div>}
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <div className={cn("text-[16px] font-medium truncate transition-colors", sel ? "text-violet-700 dark:text-violet-400" : "text-gray-800 dark:text-gray-200")}>{u.name}</div>
                        <div className="text-[13px] text-gray-500 dark:text-gray-400 capitalize">{u.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Room List */}
          {!showNewChat && !showNewGroup && (
            <div className="flex-1 overflow-y-auto min-h-0 glass-scroll px-3 pb-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500 dark:text-violet-400" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading conversations...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-20 px-8 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-white dark:bg-slate-800/60 flex items-center justify-center mb-4 shadow-sm border border-gray-200 dark:border-slate-700">
                    <MessageSquare className="h-6 w-6 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">No messages yet</h3>
                  <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">Start a new conversation to connect with your team.</p>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {filteredRooms.map(room => {
                    const isGroup = room.room_type === 'group';
                    const partner = isGroup ? null : room.participants_details?.find((p: any) => p.id !== user?.id);
                    const name = isGroup ? (room.name || 'Group') : (partner?.name || 'Chat');
                    const active = room.id === activeRoomId;
                    const seed = isGroup ? room.id : (partner?.id || room.id);
                    const isOnline = partner && onlineUsers.has(partner.id);
                    const typing = typingUsers[room.id];
                    const unread = room.unread_count || 0;

                    return (
                      <button key={room.id} onClick={() => openRoom(room.id)}
                        className={cn("w-full flex items-center gap-[14px] p-[12px] rounded-2xl transition-all border group", 
                          active ? "bg-white dark:bg-slate-700/80 shadow-md border-white dark:border-slate-600 scale-[1.02]" : "bg-transparent dark:bg-slate-800/30 border-transparent dark:border-white/10 hover:bg-white dark:hover:bg-slate-800/60 hover:shadow-sm hover:scale-[1.01]")}>
                        <div className="relative shrink-0">
                          <Avatar className="h-[52px] w-[52px] shadow-sm">
                            <AvatarFallback className="text-gray-800 text-sm font-semibold" style={{ background: pickBg(seed) }}>
                              {isGroup ? <Users className="h-5 w-5" /> : ini(name)}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && <span className="absolute bottom-0 right-0 h-[14px] w-[14px] rounded-full bg-green-500 border-[2.5px] border-white dark:border-slate-800 shadow-sm" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex justify-between items-baseline gap-2 mb-1">
                            <h4 className={cn("text-[16px] font-semibold truncate transition-colors", active ? "text-violet-700 dark:text-violet-300" : "text-gray-800 dark:text-gray-200 group-hover:text-violet-700 dark:group-hover:text-violet-300")}>{name}</h4>
                            {room.last_message_at && (
                              <span className={cn("text-[11px] font-medium shrink-0", unread > 0 ? "text-violet-600 dark:text-violet-400" : "text-gray-400 dark:text-gray-500")}>{fmtTime(room.last_message_at)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] truncate flex-1 text-gray-500 dark:text-gray-400">
                              {typing ? (
                                <span className="text-violet-500 dark:text-violet-400 font-medium italic flex items-center">Typing<TypingDots /></span>
                              ) : room.last_message ? (
                                <span className={cn(unread > 0 ? "font-semibold text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400")}>
                                  {room.last_message}
                                </span>
                              ) : (
                                <span className="italic">No messages yet</span>
                              )}
                            </p>
                            {unread > 0 && (
                              <span className="h-[22px] min-w-[22px] px-[6px] rounded-full bg-violet-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-md">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════ RIGHT PANEL ═══════════ */}
        <div className={cn("flex-1 flex flex-col min-w-0 min-h-0 relative bg-gray-50/50 dark:bg-slate-900/20 transition-colors", !mobileShowChat && "hidden md:flex")}>
          
          {!activeRoomId ? (
            <div className="flex-1 flex flex-col items-center justify-center relative p-8">
              <div className="relative w-40 h-40 mb-8">
                <div className="absolute inset-0 bg-violet-400 rounded-full opacity-10 dark:opacity-20 blur-2xl animate-pulse"></div>
                <div className="relative w-full h-full bg-white dark:bg-slate-800/60 dark:backdrop-blur-xl border border-gray-100 dark:border-slate-700 rounded-[40px] shadow-xl flex items-center justify-center rotate-3 hover:rotate-0 transition-all duration-500">
                  <MessageSquare className="h-16 w-16 text-violet-500 dark:text-violet-400" />
                </div>
              </div>
              <h3 className="text-[28px] font-bold text-gray-800 dark:text-gray-100 mb-3">Welcome to setu</h3>
              <p className="text-[15px] text-gray-500 dark:text-gray-400 text-center max-w-[320px] leading-relaxed">
                Experience seamless, beautiful communication. Select a conversation from the left to start messaging.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-[76px] px-6 flex items-center gap-4 shrink-0 relative z-20 border-b border-gray-200 dark:border-white/10 bg-white/90 dark:bg-slate-800/40 backdrop-blur-xl shadow-sm dark:shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors">
                <button className="md:hidden p-2 -ml-2 rounded-full bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-600 shadow-sm" onClick={() => setMobileShowChat(false)}>
                  <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </button>
                <div className="relative">
                  <Avatar className="h-[46px] w-[46px] shadow-md border-2 border-white dark:border-slate-700">
                    <AvatarFallback className="text-gray-800 text-sm font-semibold" style={{ background: pickBg(activeRoom?.room_type === 'group' ? activeRoom.id : (activeRoom?.participants_details?.find((p: any) => p.id !== user?.id)?.id || activeRoom?.id || '')) }}>
                      {activeRoom?.room_type === 'group' ? <Users className="h-5 w-5" /> : ini(chatName)}
                    </AvatarFallback>
                  </Avatar>
                  {partnerOnline && <span className="absolute bottom-0 right-0 h-[14px] w-[14px] rounded-full bg-green-500 border-2 border-white dark:border-slate-800 shadow-sm" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[18px] font-bold text-gray-800 dark:text-gray-100 truncate">{chatName}</h3>
                  <p className="text-[13px] font-medium truncate text-gray-500 dark:text-gray-400 mt-[2px]">
                    {typingInRoom ? (<span className="text-violet-500 dark:text-violet-400 italic flex items-center">typing<TypingDots /></span>) : chatSub}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-[42px] w-[42px] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all shadow-sm bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                    <Search className="h-[18px] w-[18px]" />
                  </button>
                  <button className="h-[42px] w-[42px] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all shadow-sm bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                    <MoreVertical className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto min-h-0 px-[4%] md:px-[6%] py-6 relative z-10 glass-scroll">
                {messages.length === 0 ? (
                  <div className="flex justify-center mt-6">
                    <span className="text-[13px] font-medium px-4 py-2 rounded-full shadow-sm bg-white dark:bg-slate-800/60 dark:backdrop-blur-md border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                      End-to-end secured. Start the conversation!
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id;
                      const prev = messages[idx - 1];
                      const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                      
                      const stripped = msg.content.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\uFE0F\u20E3\s]/gu, '');
                      const isEmojiOnly = stripped.length === 0 && msg.content.trim().length > 0 && msg.content.trim().length <= 30;

                      return (
                        <React.Fragment key={msg.id || idx}>
                          {showDate && <DateBadge date={msg.created_at} />}
                          <div className={cn("flex group", isMe ? "justify-end" : "justify-start")}>
                            {isEmojiOnly ? (
                              <div className="relative px-2 drop-shadow-sm transition-transform hover:scale-110">
                                <span className="text-[52px] leading-[60px] block">{msg.content}</span>
                                <span className="flex items-center gap-1 justify-end mt-1">
                                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-1.5 rounded-full">{fmtMsg(msg.created_at)}</span>
                                </span>
                              </div>
                            ) : (
                              <div className={cn("relative max-w-[70%] px-5 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.05)] border border-gray-200 dark:border-white/5",
                                isMe 
                                  ? "bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 rounded-[24px] rounded-tr-sm" 
                                  : "bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl text-gray-800 dark:text-gray-100 rounded-[24px] rounded-tl-sm"
                              )}>
                                <div className="flex flex-col">
                                  <span className="text-[15px] leading-[22px] whitespace-pre-wrap break-words">{msg.content}</span>
                                  <span className="flex items-center gap-[4px] self-end mt-1 text-[11px] font-medium text-gray-400 dark:text-gray-400">
                                    {fmtMsg(msg.created_at)}
                                    {isMe && (msg.is_read ? <CheckCheck className="h-[14px] w-[14px] text-violet-500 dark:text-violet-400" /> : <Check className="h-[14px] w-[14px]" />)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
                <div ref={bottomRef} className="h-2" />
              </div>

              {/* Input area */}
              <div className="px-4 py-4 md:px-6 md:py-6 shrink-0 relative z-20">
                <div className="max-w-4xl mx-auto flex items-center gap-3 bg-white dark:bg-slate-800/60 dark:backdrop-blur-2xl border border-gray-200 dark:border-white/10 p-2 rounded-[32px] shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative transition-colors">
                  
                  <div className="relative">
                    <button type="button" onClick={() => setShowEmoji(!showEmoji)} 
                      className="h-[44px] w-[44px] rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 hover:shadow-sm transition-all text-gray-500 dark:text-gray-400 hover:text-violet-500 dark:hover:text-violet-400">
                      <Smile className="h-[22px] w-[22px]" />
                    </button>
                    
                    {showEmoji && (
                      <div className="absolute bottom-[60px] left-0 w-max rounded-2xl shadow-xl z-[100] p-3 bg-white dark:bg-slate-800/90 dark:backdrop-blur-xl border border-gray-200 dark:border-slate-700">
                        <div className="grid grid-cols-5 gap-2">
                          {EMOJIS.map(em => (
                            <button key={em} type="button" onClick={() => { setNewMsg(p => p + em); setShowEmoji(false); inputRef.current?.focus(); }}
                              className="h-[44px] w-[44px] rounded-xl hover:bg-gray-100 dark:hover:bg-violet-900/50 hover:scale-110 flex items-center justify-center text-[26px] transition-all">{em}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <form onSubmit={sendMessage} className="flex-1 flex items-center gap-2">
                    <input ref={inputRef} value={newMsg} onChange={e => { setNewMsg(e.target.value); handleTyping(); }}
                      placeholder="Message..." autoComplete="off"
                      className="flex-1 min-h-[44px] px-2 text-[15px] font-medium border-0 outline-none bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                    
                    <button type="submit" disabled={!newMsg.trim()} 
                      className={cn("h-[44px] w-[44px] rounded-full flex items-center justify-center transition-all", 
                        newMsg.trim() 
                          ? "bg-violet-600 text-white shadow-md hover:shadow-lg hover:bg-violet-700 active:scale-95" 
                          : "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500")}>
                      <Send className={cn("h-[18px] w-[18px]", newMsg.trim() && "ml-[2px]")} />
                    </button>
                  </form>
                  
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
