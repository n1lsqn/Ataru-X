'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Plus, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  X, 
  Check, 
  ShieldCheck, 
  Search, 
  AlertCircle,
  Hash,
  MessageSquare,
  Repeat,
  Heart,
  UserCheck,
  Trash2
} from 'lucide-react';

// Condition types to match enum
enum ConditionType {
  RETWEET = 'RETWEET',
  FOLLOW = 'FOLLOW',
  LIKE = 'LIKE',
  REPLY = 'REPLY',
  QUOTE = 'QUOTE',
  HASHTAG = 'HASHTAG',
  KEYWORD_REPLY = 'KEYWORD_REPLY'
}

interface CampaignCondition {
  id: string;
  type: ConditionType;
  enabled: boolean;
  params?: Record<string, any>;
  paramsJson?: string;
}

interface Participant {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  iconUrl: string;
  conditionsResult: Record<string, boolean>;
  conditionsResultJson: string;
  eligible: boolean;
  createdAt: string;
}

interface Winner {
  id: string;
  userId: string;
  drawnAt: string;
}

interface Campaign {
  id: string;
  title: string;
  tweetId: string;
  winnerCount: number;
  endAt?: string;
  status: string;
  drawSeed?: string;
  drawParticipantHash?: string;
  createdAt: string;
  updatedAt: string;
  conditions: CampaignCondition[];
  participants?: Participant[];
  winners?: Winner[];
}

const BACKEND_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';


export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [fetchStatus, setFetchStatus] = useState<string>('');
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPostUrl, setNewPostUrl] = useState<string>('');
  const [newWinnerCount, setNewWinnerCount] = useState<number>(5);
  const [newEndAt, setNewEndAt] = useState<string>('');
  const [newConditions, setNewConditions] = useState<Record<ConditionType, { enabled: boolean; param: string }>>({
    [ConditionType.RETWEET]: { enabled: true, param: '' },
    [ConditionType.FOLLOW]: { enabled: true, param: '' },
    [ConditionType.LIKE]: { enabled: false, param: '' },
    [ConditionType.REPLY]: { enabled: false, param: '' },
    [ConditionType.QUOTE]: { enabled: false, param: '' },
    [ConditionType.HASHTAG]: { enabled: false, param: '' },
    [ConditionType.KEYWORD_REPLY]: { enabled: false, param: '' },
  });

  // Fetch campaigns on load
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setConnectionError(false);
      const res = await fetch(`${BACKEND_URL}/api/campaigns`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        if (data.length > 0) {
          // Keep selection or pick first
          const updatedSelected = selectedCampaign 
            ? data.find((c: Campaign) => c.id === selectedCampaign.id) || data[0]
            : data[0];
          setSelectedCampaign(updatedSelected);
        }
      } else {
        setConnectionError(true);
      }
    } catch (e) {
      console.error("Error loading campaigns:", e);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Fetch participants when selectedCampaign changes
  useEffect(() => {
    if (selectedCampaign) {
      setConnectionError(false);
      // Fetch full campaign details
      fetch(`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}`)
        .then(res => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then(data => {
          if (data && data.participants) {
            setParticipants(data.participants);
          } else {
            setParticipants([]);
          }
        })
        .catch(err => {
          console.error("Error fetching campaign details:", err);
          setConnectionError(true);
        });
    } else {
      setParticipants([]);
    }
  }, [selectedCampaign]);

  const handleConditionChange = (type: ConditionType, field: 'enabled' | 'param', value: any) => {
    setNewConditions(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const conditionsPayload = Object.entries(newConditions)
      .filter(([_, cond]) => cond.enabled)
      .map(([type, cond]) => {
        let params: Record<string, any> = {};
        if (type === ConditionType.HASHTAG && cond.param) {
          params = { hashtag: cond.param };
        } else if (type === ConditionType.KEYWORD_REPLY && cond.param) {
          params = { keyword: cond.param };
        }
        return {
          type: type as ConditionType,
          enabled: true,
          paramsJson: JSON.stringify(params)
        };
      });

    try {
      const res = await fetch(`${BACKEND_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          postUrl: newPostUrl,
          winnerCount: newWinnerCount,
          endAt: newEndAt ? new Date(newEndAt) : undefined,
          conditions: conditionsPayload
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        // Clear fields
        setNewTitle('');
        setNewPostUrl('');
        setNewWinnerCount(5);
        setNewEndAt('');
        
        await loadCampaigns();
      }
    } catch (e) {
      console.error(e);
      alert('キャンペーンの作成に失敗しました。');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;
    if (!confirm('このキャンペーンを削除してもよろしいですか？（応募者データや抽選結果もすべて削除されます）')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSelectedCampaign(null);
        await loadCampaigns();
      } else {
        alert('キャンペーンの削除に失敗しました。');
      }
    } catch (e) {
      console.error(e);
      alert('エラーが発生しました。');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFetchParticipants = async () => {
    if (!selectedCampaign) return;
    setActionLoading(true);
    setFetchStatus('収集ジョブを開始中...');
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}/fetch`, {
        method: 'POST'
      });

      if (res.ok) {
        setFetchStatus('応募者データを非同期収集中 (BullMQ)...');
        
        // Simple polling to show real-time progress update
        let intervalCount = 0;
        const interval = setInterval(async () => {
          intervalCount++;
          const cRes = await fetch(`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}`);
          if (cRes.ok) {
            const data = await cRes.json();
            if (data.participants && data.participants.length > 0) {
              setSelectedCampaign(data);
              setParticipants(data.participants);
              setFetchStatus('収集が完了しました！');
              clearInterval(interval);
              setActionLoading(false);
              // reload list to show updated totals
              const listRes = await fetch(`${BACKEND_URL}/api/campaigns`);
              if (listRes.ok) {
                setCampaigns(await listRes.json());
              }
            }
          }
          if (intervalCount > 10) {
            clearInterval(interval);
            setFetchStatus('収集に時間がかかっています。後ほどリロードしてください。');
            setActionLoading(false);
          }
        }, 1500);

      } else {
        alert('応募者収集のキュー追加に失敗しました。');
        setActionLoading(false);
        setFetchStatus('');
      }
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました。');
      setActionLoading(false);
      setFetchStatus('');
    }
  };

  const handleDrawWinners = async () => {
    if (!selectedCampaign) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (res.ok) {
        // Reload details
        const cRes = await fetch(`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}`);
        if (cRes.ok) {
          const updated = await cRes.json();
          setSelectedCampaign(updated);
        }
        // reload list
        const listRes = await fetch(`${BACKEND_URL}/api/campaigns`);
        if (listRes.ok) {
          setCampaigns(await listRes.json());
        }
      } else {
        const errData = await res.json();
        alert(errData.message || '抽選に失敗しました。条件達成者が足りない可能性があります。');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedraw = async () => {
    if (!selectedCampaign) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}/redraw`, {
        method: 'POST'
      });

      if (res.ok) {
        const cRes = await fetch(`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}`);
        if (cRes.ok) {
          const updated = await cRes.json();
          setSelectedCampaign(updated);
        }
        // reload list
        const listRes = await fetch(`${BACKEND_URL}/api/campaigns`);
        if (listRes.ok) {
          setCampaigns(await listRes.json());
        }
      } else {
        alert('再抽選に失敗しました。');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const getConditionIcon = (type: ConditionType) => {
    switch (type) {
      case ConditionType.RETWEET: return <Repeat className="w-4 h-4 text-emerald-400" />;
      case ConditionType.FOLLOW: return <UserCheck className="w-4 h-4 text-purple-400" />;
      case ConditionType.LIKE: return <Heart className="w-4 h-4 text-pink-400" />;
      case ConditionType.REPLY: return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case ConditionType.QUOTE: return <Repeat className="w-4 h-4 text-fuchsia-400 -scale-x-100 rotate-90" />;
      case ConditionType.HASHTAG: return <Hash className="w-4 h-4 text-violet-400" />;
      case ConditionType.KEYWORD_REPLY: return <Search className="w-4 h-4 text-amber-400" />;
    }
  };

  const getConditionLabel = (type: ConditionType) => {
    switch (type) {
      case ConditionType.RETWEET: return 'RT';
      case ConditionType.FOLLOW: return 'フォロー';
      case ConditionType.LIKE: return 'いいね';
      case ConditionType.REPLY: return '返信';
      case ConditionType.QUOTE: return '引用RT';
      case ConditionType.HASHTAG: return 'ハッシュタグ';
      case ConditionType.KEYWORD_REPLY: return 'キーワード返信';
    }
  };

  const eligibleCount = participants.filter(p => p.eligible).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-purple-500 to-fuchsia-600 p-2 rounded-xl text-white shadow-lg shadow-purple-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              ATARU-X
            </h1>
            <p className="text-xs text-slate-500 font-medium">Campaign Draw Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 transition-all font-semibold rounded-lg text-sm text-white shadow-lg shadow-fuchsia-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            キャンペーン作成
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden max-w-7xl mx-auto w-full p-6 gap-6">
        
        {/* Left Side: Campaign List (col-span-4) */}
        <section className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">キャンペーン一覧</h2>
            <button 
              onClick={loadCampaigns} 
              className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-lg bg-slate-900/60 border border-slate-800"
              title="リロード"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>

          {loading && campaigns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900/30 rounded-xl border border-slate-900">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-3" />
              <p className="text-sm text-slate-500">ロード中...</p>
            </div>
          ) : connectionError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-rose-950/10 rounded-xl border border-rose-500/20">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
              <p className="text-sm font-semibold text-rose-400">サーバー接続エラー</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">バックエンドサーバーに接続できません。起動状態を確認してください。</p>
              <button 
                onClick={loadCampaigns}
                className="mt-4 px-3.5 py-2 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-800/30 text-xs font-semibold text-rose-300 rounded-xl transition-colors cursor-pointer"
              >
                再試行する
              </button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/30 rounded-xl border border-slate-900 border-dashed">
              <Trophy className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm text-slate-400 font-medium">キャンペーンがありません</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">上のボタンから新しいキャンペーンを作成してください。</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {campaigns.map((camp) => {
                const isSelected = selectedCampaign?.id === camp.id;
                const totalPart = camp.participants?.length || 0;
                const winnerCount = camp.winners?.length || 0;
                return (
                  <div
                    key={camp.id}
                    onClick={() => setSelectedCampaign(camp)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected 
                        ? 'bg-slate-900 border-purple-500/50 shadow-md shadow-purple-500/5' 
                        : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/70'
                    }`}
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/0 via-purple-500/0 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="font-semibold text-slate-100 text-sm group-hover:text-purple-400 transition-colors line-clamp-1">
                        {camp.title}
                      </div>
                      {winnerCount > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 whitespace-nowrap">
                          抽選済
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20 whitespace-nowrap">
                          未抽選
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 relative z-10">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {totalPart}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          {camp.winnerCount}人
                        </span>
                      </div>
                      <span className="text-[10px]">
                        {new Date(camp.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Side: Campaign Workspace Details (col-span-8) */}
        <main className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto">
          {selectedCampaign ? (
            <div className="flex flex-col gap-6">
              
              {/* Campaign Basic Info Block */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-900/80 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-purple-400 font-semibold tracking-wider uppercase">Active Campaign</span>
                    <h2 className="text-2xl font-bold text-white mt-1">{selectedCampaign.title}</h2>
                    <a 
                      href={`https://x.com/i/status/${selectedCampaign.tweetId}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-slate-400 hover:text-purple-400 inline-flex items-center gap-1.5 mt-2 transition-colors font-medium bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-900"
                    >
                      <Repeat className="w-3.5 h-3.5 text-purple-400" />
                      ポストID: {selectedCampaign.tweetId}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleFetchParticipants}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 transition-colors font-semibold text-sm cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${actionLoading && fetchStatus ? 'animate-spin' : ''}`} />
                      参加者データ収集
                    </button>

                    <button
                      onClick={handleDrawWinners}
                      disabled={actionLoading || participants.length === 0}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 font-semibold text-sm text-white shadow-lg shadow-purple-500/5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trophy className="w-4 h-4" />
                      抽選する
                    </button>

                    {selectedCampaign.winners && selectedCampaign.winners.length > 0 && (
                      <button
                        onClick={handleRedraw}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-900/30 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 transition-colors font-semibold text-sm cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        再抽選
                      </button>
                    )}

                    <a
                      href={`${BACKEND_URL}/api/campaigns/${selectedCampaign.id}/export`}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 transition-colors font-semibold text-sm cursor-pointer ${participants.length === 0 ? 'pointer-events-none opacity-40' : ''}`}
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </a>

                    <button
                      onClick={handleDeleteCampaign}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-950/40 transition-colors font-semibold text-sm cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      削除
                    </button>
                  </div>
                </div>

                {fetchStatus && (
                  <div className="mt-4 p-3 bg-purple-950/30 border border-purple-900/30 rounded-xl flex items-center gap-2 text-xs text-purple-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{fetchStatus}</span>
                  </div>
                )}
              </div>

              {/* Stats Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-100">{participants.length}</div>
                    <div className="text-xs text-slate-500 font-medium">応募者数</div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-slate-950 text-emerald-400">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">{eligibleCount}</div>
                    <div className="text-xs text-slate-500 font-medium">条件達成者数</div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-slate-950 text-purple-400">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {selectedCampaign.winners?.length || 0} / {selectedCampaign.winnerCount}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">当選者数</div>
                  </div>
                </div>
              </div>

              {/* Campaign Conditions and Fairness Info */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Conditions (col-span-7) */}
                <div className="md:col-span-7 p-6 rounded-2xl bg-slate-900/40 border border-slate-900 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-300">キャンペーン応募条件</h3>
                  <div className="flex flex-col gap-3">
                    {selectedCampaign.conditions.map((cond) => (
                      <div 
                        key={cond.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-900/60"
                      >
                        <div className="flex items-center gap-3">
                          {getConditionIcon(cond.type)}
                          <span className="text-sm font-medium text-slate-300">{getConditionLabel(cond.type)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {cond.paramsJson && JSON.parse(cond.paramsJson) && Object.keys(JSON.parse(cond.paramsJson)).length > 0 && (
                            <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono">
                              {Object.entries(JSON.parse(cond.paramsJson)).map(([k, v]) => `${k}:${v}`).join(', ')}
                            </span>
                          )}
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fairness proof (col-span-5) */}
                <div className="md:col-span-5 p-6 rounded-2xl bg-slate-900/40 border border-slate-900 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-slate-300">公平性・再現性の証明</h3>
                  </div>
                  {selectedCampaign.drawSeed ? (
                    <div className="flex flex-col gap-4 h-full justify-between">
                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Draw Seed</div>
                          <div className="text-xs bg-slate-950 p-2.5 rounded-lg font-mono border border-slate-900 text-slate-300 select-all break-all leading-relaxed">
                            {selectedCampaign.drawSeed}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">Participant List Hash</div>
                          <div className="text-xs bg-slate-950 p-2.5 rounded-lg font-mono border border-slate-900 text-slate-300 select-all break-all leading-relaxed">
                            {selectedCampaign.drawParticipantHash}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-purple-950/20 border border-purple-900/30 text-[10px] text-purple-400 rounded-xl leading-relaxed">
                        このSeed値と参加者ハッシュ値により、抽選結果は完全に暗号化再現が可能です。
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-slate-500 text-xs">
                      <AlertCircle className="w-8 h-8 text-slate-700 mb-2" />
                      抽選が行われるとシードデータが生成されます。
                    </div>
                  )}
                </div>
              </div>

              {/* Winners section (if draw has run) */}
              {selectedCampaign.winners && selectedCampaign.winners.length > 0 && (
                <div className="p-6 rounded-2xl bg-gradient-to-tr from-purple-950/10 via-fuchsia-950/10 to-purple-900/10 border border-purple-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 text-purple-500/10 pointer-events-none">
                    <Trophy className="w-36 h-36" />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      当選者リスト
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedCampaign.winners.map((win) => {
                        const profile = participants.find(p => p.userId === win.userId);
                        return (
                          <div 
                            key={win.id} 
                            className="flex items-center gap-3 p-3 bg-slate-900/80 rounded-xl border border-purple-500/10 shadow-lg shadow-fuchsia-950/50"
                          >
                            <img 
                              src={profile?.iconUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${win.userId}`} 
                              alt={profile?.displayName || 'Avatar'}
                              className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-white truncate">
                                {profile?.displayName || 'Loading...'}
                              </div>
                              <div className="text-xs text-purple-400 font-medium truncate">
                                @{profile?.username || win.userId}
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-500 whitespace-nowrap bg-slate-950 px-2 py-1 rounded border border-slate-800">
                              ID: {win.userId}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Participants list */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-300">応募者・達成状況 ({participants.length}名)</h3>
                
                {participants.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    参加者データがありません。「参加者データ収集」を実行してください。
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800 font-semibold">
                          <th className="pb-3 w-8">#</th>
                          <th className="pb-3 w-[240px]">ユーザー</th>
                          <th className="pb-3">ステータス</th>
                          <th className="pb-3">条件達成状況</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((part, index) => {
                          const isWinner = selectedCampaign.winners?.some(w => w.userId === part.userId);
                          return (
                            <tr key={part.id} className="border-b border-slate-900/50 hover:bg-slate-900/20 transition-colors group">
                              <td className="py-3 text-slate-600 font-mono">{index + 1}</td>
                              <td className="py-3 flex items-center gap-3">
                                <img 
                                  src={part.iconUrl} 
                                  alt={part.displayName} 
                                  className="w-7 h-7 rounded-full bg-slate-950 border border-slate-800"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-200 group-hover:text-slate-100 truncate w-[160px]">{part.displayName}</div>
                                  <div className="text-[10px] text-slate-500 truncate">@{part.username}</div>
                                </div>
                              </td>
                              <td className="py-3">
                                {isWinner ? (
                                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold text-[9px]">
                                    当選者
                                  </span>
                                ) : part.eligible ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px]">
                                    達成
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-500 border border-slate-900 text-[9px]">
                                    未達成
                                  </span>
                                )}
                              </td>
                              <td className="py-3">
                                <div className="flex gap-2.5">
                                  {Object.entries(part.conditionsResult).map(([condType, met]) => (
                                    <div 
                                      key={condType} 
                                      className={`flex items-center gap-1 text-[10px] font-semibold border rounded-lg px-2 py-0.5 ${
                                        met 
                                          ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                                          : 'bg-rose-950/10 border-rose-950/30 text-rose-500'
                                      }`}
                                    >
                                      {getConditionIcon(condType as ConditionType)}
                                      {getConditionLabel(condType as ConditionType)}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-900/20 border border-slate-900/60 rounded-3xl h-full">
              <Trophy className="w-16 h-16 text-slate-800 mb-4" />
              <h2 className="text-lg font-bold text-slate-400">キャンペーンを選択してください</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-[280px]">
                左側のリストから選択するか、新しくキャンペーンを作成して抽選を開始しましょう。
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Campaign Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-500" />
                キャンペーン新規作成
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign}>
              <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">キャンペーン名</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例: Ataru-X リリース記念プレゼント企画"
                    className="bg-slate-950 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none w-full placeholder:text-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">対象ポストURL</label>
                  <input
                    type="url"
                    required
                    value={newPostUrl}
                    onChange={(e) => setNewPostUrl(e.target.value)}
                    placeholder="例: https://x.com/username/status/123456789"
                    className="bg-slate-950 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none w-full placeholder:text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">当選人数</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newWinnerCount}
                      onChange={(e) => setNewWinnerCount(parseInt(e.target.value))}
                      className="bg-slate-950 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">終了日時 (任意)</label>
                    <input
                      type="datetime-local"
                      value={newEndAt}
                      onChange={(e) => setNewEndAt(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none w-full text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-slate-400">応募条件の選択・設定</label>
                  <div className="flex flex-col gap-2.5">
                    {Object.keys(newConditions).map((condKey) => {
                      const type = condKey as ConditionType;
                      const condState = newConditions[type];
                      const isHashtag = type === ConditionType.HASHTAG;
                      const isKeyword = type === ConditionType.KEYWORD_REPLY;

                      return (
                        <div 
                          key={type}
                          className={`p-3 rounded-xl border transition-all ${
                            condState.enabled 
                              ? 'bg-slate-950/60 border-purple-500/35' 
                              : 'bg-slate-950/20 border-slate-900 hover:bg-slate-950/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={condState.enabled}
                                onChange={(e) => handleConditionChange(type, 'enabled', e.target.checked)}
                                className="w-4 h-4 rounded text-purple-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-800"
                              />
                              <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                {getConditionIcon(type)}
                                {getConditionLabel(type)}
                              </span>
                            </label>
                          </div>

                          {condState.enabled && (isHashtag || isKeyword) && (
                            <div className="mt-2.5 pl-7">
                              <input
                                type="text"
                                required
                                value={condState.param}
                                onChange={(e) => handleConditionChange(type, 'param', e.target.value)}
                                placeholder={isHashtag ? '#キャンペーンハッシュタグ' : '指定するキーワード'}
                                className="bg-slate-900 border border-slate-800 focus:border-purple-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none w-full placeholder:text-slate-600"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-300 transition-colors font-semibold text-sm rounded-xl cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 font-semibold text-sm text-white shadow-lg shadow-purple-500/5 transition-all rounded-xl cursor-pointer disabled:opacity-50"
                >
                  作成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
