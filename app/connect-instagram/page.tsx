"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  username: string;
  url: string;
  fullName: string | null;
  biography: string | null;
  website: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  isBusinessAccount: boolean | null;
  private: boolean | null;
  verified: boolean | null;
  highlightReelCount: number | null;
  latestPosts: Array<{
    id: string;
    caption: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    permalink: string | null;
    like_count: number | null;
    comments_count: number | null;
  }>;
};

function normalizeUsername(input: string) {
  let value = input.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      value = parts[0] || "";
    } catch {
      value = "";
    }
  }
  return value.replace(/^@/, "").split(/[/?#]/)[0];
}

function formatNumber(value: number | null) {
  return typeof value === "number" ? value.toLocaleString("pt-BR") : "—";
}

export default function ConnectInstagram() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [handle, setHandle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((x) => {
        if (!x.authenticated) {
          router.replace("/login");
          return;
        }
        setAccount(x.user.socialAccounts?.[0] || null);
        if (x.user.socialAccounts?.[0]?.username) {
          setHandle("@" + x.user.socialAccounts[0].username);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function searchProfile() {
    setMessage("");
    setProfile(null);

    const value = normalizeUsername(handle);

    if (!value || !/^[a-zA-Z0-9._]{1,30}$/.test(value)) {
      setMessage("Digite um @ do Instagram válido ou cole o link do perfil.");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch("/api/instagram/connect?username=" + encodeURIComponent(value));
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setMessage(data?.error || "Não encontramos esse perfil.");
        return;
      }
      setProfile(data.profile);
    } catch {
      setMessage("Não foi possível consultar o Instagram agora.");
    } finally {
      setSearching(false);
    }
  }

  async function confirmProfile() {
    if (!profile) return;
    setMessage("");
    setConnecting(true);
    try {
      const response = await fetch("/api/instagram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: profile.username }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setMessage(data?.error || "Não foi possível conectar esse perfil.");
        return;
      }
      setAccount(data.account);
      setProfile(null);
      setMessage("Instagram conectado e dados públicos sincronizados.");
    } catch {
      setMessage("Não foi possível conectar esse perfil agora.");
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return <main className="auth"><div className="authbox"><p className="muted">Verificando conexão...</p></div></main>;
  }

  return (
    <main className="auth">
      <div className="authbox" style={{ width: "min(760px,100%)" }}>
        <div className="badge">📸 Instagram</div>
        <h1 style={{ marginTop: 14 }}>{account ? "Instagram conectado" : "Conecte seu Instagram"}</h1>
        <p className="muted" style={{ lineHeight: 1.6, marginTop: 7 }}>
          Informe o @ do perfil público. O MidiaNet AI consulta os dados públicos pelo Apify e usa essas informações para diagnóstico, estratégia e evolução.
        </p>

        {account && (
          <div className="feature" style={{ marginTop: 18 }}>
            <strong>Perfil atual</strong>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12 }}>
              {account.profilePictureUrl && (
                <img src={account.profilePictureUrl} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
              )}
              <div>
                <div style={{ fontWeight: 800 }}>@{account.username}</div>
                <div className="small muted">{account.fullName || "Instagram"}</div>
                <div className="small muted">{formatNumber(account.followersCount)} seguidores · {formatNumber(account.mediaCount)} publicações</div>
              </div>
            </div>
            <button className="btn primary" style={{ marginTop: 18 }} onClick={() => router.push("/setup")}>
              Continuar para o diagnóstico →
            </button>
          </div>
        )}

        <div className="feature" style={{ marginTop: 18 }}>
          <strong>1. Qual Instagram você quer analisar?</strong>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") searchProfile(); }}
            placeholder="@seuinstagram ou link do perfil"
            className="metricInput"
            style={{ marginTop: 12, width: "100%" }}
          />
          <p className="small muted" style={{ marginTop: 8 }}>
            Não precisa de senha e não precisamos de um aplicativo da Meta para essa etapa.
          </p>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={searchProfile} disabled={searching}>
            {searching ? "Buscando perfil..." : "🔎 Buscar perfil"}
          </button>
        </div>

        {profile && (
          <div className="feature" style={{ marginTop: 12 }}>
            <strong>Encontramos este perfil</strong>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 14 }}>
              {profile.profilePictureUrl && (
                <img src={profile.profilePictureUrl} alt="" style={{ width: 78, height: 78, borderRadius: "50%", objectFit: "cover" }} />
              )}
              <div>
                <div style={{ fontWeight: 900 }}>@{profile.username}</div>
                <div>{profile.fullName || "Sem nome informado"}</div>
                <div className="small muted">{formatNumber(profile.followersCount)} seguidores · {formatNumber(profile.followsCount)} seguindo · {formatNumber(profile.mediaCount)} publicações</div>
              </div>
            </div>
            {profile.biography && <p className="small muted" style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{profile.biography}</p>}
            {profile.private && <p className="small muted" style={{ marginTop: 10 }}>Este perfil é privado. Alguns conteúdos não estarão disponíveis para análise.</p>}
            <button className="btn primary" style={{ marginTop: 14 }} onClick={confirmProfile} disabled={connecting}>
              {connecting ? "Sincronizando..." : "✅ Confirmar este perfil"}
            </button>
          </div>
        )}

        {message && <p className="small muted" style={{ marginTop: 12 }}>{message}</p>}

        <button className="btn secondary" style={{ marginTop: 10 }} onClick={() => router.push("/setup")}>
          Continuar sem conectar →
        </button>
      </div>
    </main>
  );
}
