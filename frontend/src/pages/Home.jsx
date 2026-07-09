import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";
import UserRow from "../components/UserRow.jsx";
import RequestRow from "../components/RequestRow.jsx";
import FriendRow from "../components/FriendRow.jsx";

const TABS = [
  { key: "friends", label: "Friends" },
  { key: "requests", label: "Requests" },
  { key: "find", label: "Find people" },
];

const Home = () => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("friends");

  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [notice, setNotice] = useState("");

  const loadFriendships = useCallback(async () => {
    const { data } = await api.get("/friends");
    setFriends(data.friends);
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
  }, []);

  useEffect(() => {
    loadFriendships();
  }, [loadFriendships]);

  // Live-update when someone sends/accepts a request while we're online
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onReceived = (data) => {
      setNotice(`${data.from.username} sent you a friend request`);
      loadFriendships();
    };
    const onAccepted = (data) => {
      setNotice(`${data.by.username} accepted your friend request`);
      loadFriendships();
    };

    socket.on("friend_request_received", onReceived);
    socket.on("friend_request_accepted", onAccepted);

    return () => {
      socket.off("friend_request_received", onReceived);
      socket.off("friend_request_accepted", onAccepted);
    };
  }, [loadFriendships]);

  useEffect(() => {
    if (tab !== "find") return;
    const timeout = setTimeout(async () => {
      const { data } = await api.get("/users", { params: { search } });
      setSearchResults(data.users);
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, tab]);

  const handleAddFriend = async (targetUser) => {
    try {
      await api.post("/friends/request", { username: targetUser.username });
      setNotice(`Friend request sent to ${targetUser.username}`);
      const { data } = await api.get("/users", { params: { search } });
      setSearchResults(data.users);
      loadFriendships();
    } catch (err) {
      setNotice(err.response?.data?.message || "Couldn't send that request");
    }
  };

  const handleAccept = async (entry) => {
    await api.post(`/friends/${entry.friendshipId}/accept`);
    loadFriendships();
  };

  const handleCancelOrReject = async (entry) => {
    await api.delete(`/friends/${entry.friendshipId}`);
    loadFriendships();
  };

  const handleRemoveFriend = async (entry) => {
    if (!confirm(`Remove ${entry.user.username} as a friend?`)) return;
    await api.delete(`/friends/${entry.friendshipId}`);
    loadFriendships();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⏳</span>
          <span className="brand-name">TempChat</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-user">@{user?.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <div className="reset-banner">Everything here — messages, requests, friendships — auto-deletes 72 hours after it's created.</div>

      {notice && (
        <div className="notice-bar" onClick={() => setNotice("")}>
          {notice}
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "tab-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "requests" && incoming.length > 0 && <span className="badge">{incoming.length}</span>}
          </button>
        ))}
      </nav>

      <main className="content-area">
        {tab === "friends" && (
          <div className="list">
            {friends.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <h3>No friends yet</h3>
                <p>Head to "Find people" to send your first friend request.</p>
              </div>
            ) : (
              friends.map((f) => <FriendRow key={f.friendshipId} entry={f} onRemove={handleRemoveFriend} />)
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="list">
            {incoming.length === 0 && outgoing.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <h3>No pending requests</h3>
                <p>Requests you send or receive will show up here.</p>
              </div>
            ) : (
              <>
                {incoming.length > 0 && (
                  <>
                    <h4 className="list-heading">Incoming</h4>
                    {incoming.map((r) => (
                      <RequestRow
                        key={r.friendshipId}
                        entry={r}
                        direction="incoming"
                        onAccept={handleAccept}
                        onCancel={handleCancelOrReject}
                      />
                    ))}
                  </>
                )}
                {outgoing.length > 0 && (
                  <>
                    <h4 className="list-heading">Sent</h4>
                    {outgoing.map((r) => (
                      <RequestRow
                        key={r.friendshipId}
                        entry={r}
                        direction="outgoing"
                        onCancel={handleCancelOrReject}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {tab === "find" && (
          <div className="list">
            <input
              type="search"
              className="search-input"
              placeholder="Search by username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {searchResults.length === 0 ? (
              <div className="empty-state">
                <p>{search ? "No matching users." : "Start typing to find people."}</p>
              </div>
            ) : (
              searchResults.map((u) => <UserRow key={u.id} user={u} onAddFriend={handleAddFriend} />)
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
